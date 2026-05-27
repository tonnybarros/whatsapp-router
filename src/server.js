import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import crypto from "node:crypto";
import { config } from "./config.js";
import { adminHtml } from "./admin.js";
import { apiDocsHtml } from "./api-docs.js";
import { openApiSpec, swaggerHtml } from "./openapi.js";
import { createStore } from "./store-factory.js";
import { nextEligibilityDelayMs, normalizeInstance, resetDailyCounterIfNeeded, selectInstance } from "./selector.js";
import { checkProviderHealth, sendViaProvider } from "./providers/index.js";

const app = Fastify({ logger: true });
const store = createStore(config);
const queuedJobs = [];
let queueRunning = false;
let deliveryChain = Promise.resolve();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueStats() {
  return {
    pending: queuedJobs.length,
    running: queueRunning
  };
}

function runDelivery(task) {
  const next = deliveryChain.then(task, task);
  deliveryChain = next.catch(() => {});
  return next;
}

function publicInstance(instance) {
  const { api_key: _apiKey, ...safe } = instance;
  return {
    ...safe,
    has_api_key: Boolean(instance.api_key)
  };
}

function redactSensitive(value) {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== "object") return value;

  const sensitiveKeys = new Set(["token", "api_key", "apikey", "password", "secret", "authorization"]);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (sensitiveKeys.has(key.toLowerCase())) return [key, "[redacted]"];
    return [key, redactSensitive(item)];
  }));
}

function requireRouterKey(request, reply, done) {
  const key = request.headers["x-router-key"] || request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (key !== config.routerApiKey) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }
  done();
}

function shouldUseFallback(body) {
  return Boolean(body.fallback_allowed || body.failover);
}

function providerError(error) {
  return {
    message: error.message,
    status: error.status,
    data: redactSensitive(error.data),
    transport_error: Boolean(error.transport_error),
    retryable: Boolean(error.retryable),
    at: new Date().toISOString()
  };
}

function markProviderFailure(instance, error) {
  const cooldownSeconds = instance.error_cooldown_seconds || config.defaultErrorCooldownSeconds;
  if (!error.status || error.status >= 500) {
    instance.health = "error";
    instance.cooldown_until = new Date(Date.now() + cooldownSeconds * 1000).toISOString();
  }
  instance.last_error = providerError(error);
  instance.updated_at = new Date().toISOString();
  return instance.last_error;
}

function isFailoverRetryable(error, body) {
  if (!body.failover) return false;
  if (body.failover_mode === "aggressive") return !error.status || error.status >= 500;
  return Boolean(error.retryable || (error.transport_error && error.retryable) || providerDisconnected(error) || providerRejectedBeforeSend(error));
}

function providerDisconnected(error) {
  if (error.status !== 503) return false;
  const message = String(error.data?.message || error.data?.error || "").toLowerCase();
  return message.includes("disconnected") || message.includes("desconect");
}

function providerRejectedBeforeSend(error) {
  if (error.status !== 500) return false;
  const message = String(error.data?.exception?.message || error.data?.exception?.details || error.data?.message || "").toLowerCase();
  const engine = String(error.data?.version?.engine || "").toLowerCase();
  return engine === "gows" && message.includes("server returned error 400");
}

function attemptEntry(instance, status, extra = {}) {
  return {
    instance_id: instance.id,
    instance_name: instance.name,
    provider: instance.provider,
    status,
    at: new Date().toISOString(),
    ...extra
  };
}

function buildMessage(body, text, status = "selected") {
  return {
    id: crypto.randomUUID(),
    external_id: body.external_id || body.track_id || null,
    to: body.to,
    message: text,
    source: body.source || "api",
    priority: body.priority || "normal",
    status,
    requested_connector_id: body.connector_id || body.instance_id || null,
    selected_instance_id: null,
    provider: null,
    dry_run: Boolean(body.dry_run),
    queued: Boolean(body.queue),
    fallback_allowed: shouldUseFallback(body),
    failover: Boolean(body.failover),
    failover_mode: body.failover_mode || "safe",
    attempts: [],
    created_at: new Date().toISOString(),
    error: null
  };
}

async function enqueueMessage(message, body, text) {
  queuedJobs.push({
    messageId: message.id,
    body: { ...body, dry_run: false },
    text,
    queuedAt: Date.now()
  });
  drainQueue().catch((error) => app.log.error(error));
}

async function restoreQueuedMessages() {
  const pending = store.data.messages.filter((message) => ["queued", "processing"].includes(message.status));
  for (const message of pending) {
    message.status = "queued";
    await store.updateMessage(message.id, message);
    await enqueueMessage(message, {
      to: message.to,
      message: message.message,
      source: message.source || "api",
      queue: true,
      connector_id: message.requested_connector_id || undefined,
      external_id: message.external_id || undefined,
      failover: Boolean(message.failover),
      failover_mode: message.failover_mode || "safe",
      fallback_allowed: Boolean(message.fallback_allowed)
    }, message.message);
  }
}

async function drainQueue() {
  if (queueRunning) return;
  queueRunning = true;

  try {
    while (queuedJobs.length > 0) {
      const job = queuedJobs.shift();
      const message = store.data.messages.find((item) => item.id === job.messageId);
      if (!message || message.status !== "queued") continue;

      message.status = "processing";
      await store.updateMessage(message.id, message);
      await runDelivery(() => deliverMessage(message, job.body, job.text, {
        waitForCapacity: true,
        queuedAt: job.queuedAt
      }));
    }
  } finally {
    queueRunning = false;
  }
}

function serviceHealth() {
  const instances = store.listInstances().map((instance) => {
    resetDailyCounterIfNeeded(instance);
    if (instance.cooldown_until && new Date(instance.cooldown_until).getTime() <= Date.now()) {
      instance.cooldown_until = null;
    }
    return publicInstance(instance);
  });

  return {
    ok: true,
    service: "whatsapp-router",
    version: "v2",
    time: new Date().toISOString(),
    instances: {
      total: instances.length,
      active: instances.filter((instance) => instance.status === "active").length,
      items: instances
    },
    messages: {
      total: store.data.messages.length
    },
    queue: queueStats()
  };
}

async function waitForSelection(body, connectorId, attemptedIds, queuedAt) {
  while (true) {
    const fallbackAllowed = shouldUseFallback(body);
    const selection = selectInstance(store.listInstances(), connectorId, {
      dryRun: Boolean(body.dry_run),
      fallbackAllowed,
      excludeIds: [...attemptedIds]
    });

    if (selection.instance || !body.queue) return selection;

    const elapsedMs = Date.now() - queuedAt;
    if (elapsedMs >= config.queueMaxWaitMs) {
      return {
        instance: null,
        rejected: [{
          id: "queue",
          name: "Fila",
          reason: `tempo maximo na fila ${Math.round(config.queueMaxWaitMs / 1000)}s`
        }]
      };
    }

    const waitMs = nextEligibilityDelayMs(store.listInstances(), connectorId, {
      dryRun: false,
      fallbackAllowed,
      excludeIds: [...attemptedIds]
    });

    if (waitMs === null) return selection;
    await sleep(Math.min(Math.max(waitMs, config.queuePollMs), 30000));
  }
}

async function deliverMessage(message, body, text, options = {}) {
  const connectorId = body.connector_id || body.instance_id || null;
  const attemptedIds = new Set();
  let selection = await waitForSelection(body, connectorId, attemptedIds, options.queuedAt || Date.now());

  if (!selection.instance) {
    message.status = "failed";
    message.error = {
      message: selection.rejected?.[0]?.reason || "Nenhuma instancia elegivel",
      rejected: selection.rejected
    };
    await store.updateMessage(message.id, message);
    return { message, httpCode: 409 };
  }

  if (body.dry_run) {
    message.selected_instance_id = selection.instance.id;
    message.provider = selection.instance.provider;
    message.status = "dry_run";
    message.attempts.push(attemptEntry(selection.instance, "dry_run"));
    await store.updateMessage(message.id, message);
    return { message, httpCode: 200 };
  }

  while (selection.instance) {
    const instance = selection.instance;
    attemptedIds.add(instance.id);
    message.selected_instance_id = instance.id;
    message.provider = instance.provider;
    message.status = "selected";
    message.error = null;
    await store.updateMessage(message.id, message);

    try {
      const providerResponse = await sendViaProvider(instance, {
        to: body.to,
        message: text,
        source: body.source || "api",
        track_id: message.id,
        delay: body.delay,
        linkPreview: body.linkPreview
      });

      instance.last_sent_at = new Date().toISOString();
      instance.daily_sent_count += 1;
      instance.health = "ok";
      instance.cooldown_until = null;
      instance.last_error = null;
      instance.updated_at = new Date().toISOString();
      message.status = "sent";
      message.error = null;
      message.provider_response = redactSensitive(providerResponse.data);
      message.attempts.push(attemptEntry(instance, "sent", { provider_status: providerResponse.status }));

      await store.save();
      await store.updateMessage(message.id, message);
      return { message, httpCode: 200 };
    } catch (error) {
      const failure = markProviderFailure(instance, error);
      message.status = "failed";
      message.error = failure;
      message.attempts.push(attemptEntry(instance, "failed", { error: failure }));

      await store.save();
      await store.updateMessage(message.id, message);

      if (isFailoverRetryable(error, body)) {
        selection = selectInstance(store.listInstances(), connectorId, {
          dryRun: false,
          fallbackAllowed: true,
          excludeIds: [...attemptedIds]
        });

        if (selection.instance) continue;

        message.error = {
          ...failure,
          message: "Falha no provider e nenhuma instancia alternativa elegivel",
          rejected: selection.rejected
        };
        await store.updateMessage(message.id, message);
      }

      return { message, httpCode: error.status && error.status < 500 ? error.status : 502 };
    }
  }

  return { message, httpCode: message.status === "failed" ? 409 : 200 };
}

async function handleSend(request, reply) {
  const body = request.body || {};
  const text = body.message || body.text;
  if (!body.to || !text) {
    return reply.code(422).send({ error: "missing_fields", fields: ["to", "message"] });
  }

  const message = buildMessage(body, text, body.queue ? "queued" : "selected");
  await store.addMessage(message);

  if (body.queue && !body.dry_run) {
    const queuedResponse = structuredClone(message);
    await enqueueMessage(message, body, text);
    return reply.code(202).send(queuedResponse);
  }

  const result = await runDelivery(() => deliverMessage(message, body, text));
  return reply.code(result.httpCode).send(result.message);
}

function htmlDashboard() {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WhatsApp Router</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f5f7fb; color: #111827; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px; }
    header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
    h1 { margin: 0; font-size: 28px; letter-spacing: 0; }
    p { margin: 6px 0 0; color: #4b5563; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card, table { background: #fff; border: 1px solid #d8dee8; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
    .card { padding: 16px; }
    .metric { font-size: 26px; font-weight: 700; margin-top: 6px; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; }
    th, td { text-align: left; padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; vertical-align: top; }
    th { background: #eef2f7; color: #374151; font-weight: 700; }
    tr:last-child td { border-bottom: 0; }
    code { background: #eef2f7; padding: 2px 6px; border-radius: 6px; }
    .status { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #e5e7eb; font-size: 12px; font-weight: 700; }
    .active { background: #d1fae5; color: #065f46; }
    .paused { background: #fee2e2; color: #991b1b; }
    @media (max-width: 760px) { .grid { grid-template-columns: 1fr; } header { align-items: flex-start; flex-direction: column; } }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>WhatsApp Router</h1>
        <p>API central para uazapi, WAHA e Evolution Go.</p>
      </div>
      <code>GET /health</code>
    </header>
    <section class="grid">
      <div class="card"><div>Instâncias</div><div class="metric" id="instances">-</div></div>
      <div class="card"><div>Ativas</div><div class="metric" id="active">-</div></div>
      <div class="card"><div>Mensagens recentes</div><div class="metric" id="messages">-</div></div>
      <div class="card"><div>Versão</div><div class="metric" id="version">-</div></div>
    </section>
    <table>
      <thead><tr><th>Nome</th><th>Provider</th><th>Status</th><th>Uso hoje</th><th>Último envio</th></tr></thead>
      <tbody id="rows"><tr><td colspan="5">Carregando...</td></tr></tbody>
    </table>
  </main>
  <script>
    async function load() {
      const basePath = window.location.pathname.startsWith('/v1') ? '/v1' : '';
      const health = await fetch(basePath + '/health').then((r) => r.json());
      document.querySelector('#instances').textContent = health.instances.total;
      document.querySelector('#active').textContent = health.instances.active;
      document.querySelector('#messages').textContent = health.messages.total;
      document.querySelector('#version').textContent = health.version || '-';
      const rows = health.instances.items.map((item) => '<tr><td>' + item.name + '</td><td>' + item.provider + '</td><td><span class="status ' + item.status + '">' + item.status + '</span></td><td>' + item.daily_sent_count + '/' + item.daily_limit + '</td><td>' + (item.last_sent_at || '-') + '</td></tr>').join('');
      document.querySelector('#rows').innerHTML = rows || '<tr><td colspan="5">Nenhuma instância cadastrada ainda.</td></tr>';
    }
    load().catch(() => document.querySelector('#rows').innerHTML = '<tr><td colspan="5">Falha ao carregar.</td></tr>');
  </script>
</body>
</html>`;
}

await store.load();
await restoreQueuedMessages();

await app.register(cors, { origin: true });
await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });

app.get("/", async (_request, reply) => {
  reply.type("text/html").send(htmlDashboard());
});

app.get("/admin", async (_request, reply) => {
  reply.type("text/html").send(adminHtml());
});

app.get("/docs", async (_request, reply) => {
  reply.type("text/html").send(apiDocsHtml());
});

app.get("/api-docs", async (_request, reply) => {
  reply.type("text/html").send(apiDocsHtml());
});

app.get("/swagger", async (_request, reply) => {
  reply.type("text/html").send(swaggerHtml());
});

app.get("/openapi.json", async () => openApiSpec());

app.get("/health", async () => serviceHealth());

app.register(async (api) => {
  api.addHook("preHandler", requireRouterKey);

  api.get("/instances", async () => store.listInstances().map(publicInstance));

  api.post("/instances", async (request, reply) => {
    const body = request.body || {};
    const existing = body.id ? store.findInstance(body.id) : null;
    const required = ["name", "provider", "base_url"];
    const missing = required.filter((field) => !body[field]);
    if (!existing && !body.api_key) missing.push("api_key");
    if (missing.length) {
      return reply.code(422).send({ error: "missing_fields", fields: missing });
    }

    const instance = normalizeInstance({
      ...existing,
      ...body,
      api_key: body.api_key || existing?.api_key,
      id: body.id || crypto.randomUUID()
    });

    await store.upsertInstance(instance);
    reply.code(201).send(publicInstance(instance));
  });

  api.delete("/instances/:id", async (request, reply) => {
    const deleted = await store.deleteInstance(request.params.id);
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return { deleted: true };
  });

  api.post("/instances/:id/pause", async (request, reply) => {
    const instance = store.findInstance(request.params.id);
    if (!instance) return reply.code(404).send({ error: "not_found" });
    instance.status = "paused";
    instance.updated_at = new Date().toISOString();
    await store.save();
    return publicInstance(instance);
  });

  api.post("/instances/:id/resume", async (request, reply) => {
    const instance = store.findInstance(request.params.id);
    if (!instance) return reply.code(404).send({ error: "not_found" });
    instance.status = "active";
    instance.cooldown_until = null;
    instance.updated_at = new Date().toISOString();
    await store.save();
    return publicInstance(instance);
  });

  api.post("/instances/:id/health-check", async (request, reply) => {
    const instance = store.findInstance(request.params.id);
    if (!instance) return reply.code(404).send({ error: "not_found" });

    try {
      const result = await checkProviderHealth(instance);
      instance.health = "ok";
      instance.last_error = null;
      instance.cooldown_until = null;
      if (instance.provider === "waha" && result.data?.me) {
        instance.self_chat_id = result.data.me.id || null;
        instance.self_jid = result.data.me.jid || null;
        instance.self_lid = result.data.me.lid || null;
        instance.engine = result.data.engine?.gows?.found ? "gows" : null;
      }
      if (instance.provider === "uazapi" && result.data?.instance?.owner) {
        instance.self_chat_id = `${result.data.instance.owner}@c.us`;
        instance.self_jid = result.data.status?.jid || null;
      }
      instance.updated_at = new Date().toISOString();
      await store.save();
      return { ok: true, instance: publicInstance(instance), provider_response: redactSensitive(result.data) };
    } catch (error) {
      instance.health = "error";
      instance.last_error = { message: error.message, status: error.status, data: redactSensitive(error.data), at: new Date().toISOString() };
      instance.updated_at = new Date().toISOString();
      await store.save();
      return reply.code(502).send({ ok: false, instance: publicInstance(instance), error: instance.last_error });
    }
  });

  api.get("/messages", async (request) => {
    const limit = Math.min(Number(request.query.limit || 100), 500);
    return store.listMessages(limit);
  });

  api.post("/send", handleSend);

  api.get("/v1/health", async () => serviceHealth());
  api.get("/v1/connectors", async () => store.listInstances().map(publicInstance));
  api.get("/v1/instances", async () => store.listInstances().map(publicInstance));
  api.get("/v1/messages", async (request) => {
    const limit = Math.min(Number(request.query.limit || 100), 500);
    return store.listMessages(limit);
  });
  api.post("/v1/send", handleSend);
  api.post("/v1/messages/send", handleSend);
  api.post("/v1/whatsapp/send", handleSend);

  api.post("/webhooks/:provider", async (request) => {
    const event = {
      id: crypto.randomUUID(),
      provider: request.params.provider,
      headers: request.headers,
      body: request.body,
      created_at: new Date().toISOString()
    };
    await store.addEvent(event);
    return { ok: true };
  });
}, { prefix: "/api" });

app.listen({ port: config.port, host: config.host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
