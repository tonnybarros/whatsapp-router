import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import crypto from "node:crypto";
import { config } from "./config.js";
import { adminHtml } from "./admin.js";
import { registerHtml } from "./register.js";
import { portalHtml } from "./portal.js";
import { apiDocsHtml } from "./api-docs.js";
import { openApiSpec, swaggerHtml } from "./openapi.js";
import { createStore } from "./store-factory.js";
import { nextEligibilityDelayMs, normalizeInstance, resetDailyCounterIfNeeded, selectInstance } from "./selector.js";
import { checkProviderHealth, sendViaProvider } from "./providers/index.js";

const app = Fastify({ logger: true });
const store = createStore(config);
const queuedJobs = [];
const activeConnectorIds = new Set();
let queueRunning = false;
let selectionChain = Promise.resolve();
let scheduledQueueJobs = 0;
let activeQueueJobs = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function queueStats() {
  return {
    pending: queuedJobs.length + scheduledQueueJobs,
    running: queueRunning || activeQueueJobs > 0
  };
}

function queueDelay(ms) {
  return Math.min(Math.max(ms || config.queuePollMs, config.queuePollMs), 30000);
}

function scheduleQueuedJob(job, delayMs) {
  scheduledQueueJobs += 1;
  setTimeout(() => {
    scheduledQueueJobs = Math.max(0, scheduledQueueJobs - 1);
    queuedJobs.push(job);
    drainQueue().catch((error) => app.log.error(error));
  }, queueDelay(delayMs));
}

function runSelection(task) {
  const next = selectionChain.then(task, task);
  selectionChain = next.catch(() => {});
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

function hashSecret(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function onlyDigits(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function newApiKey() {
  return `whr_${crypto.randomBytes(32).toString("hex")}`;
}

function keyPreview(key) {
  return `${key.slice(0, 8)}...${key.slice(-6)}`;
}

function maskPhone(phone) {
  const digits = onlyDigits(phone);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}***${digits.slice(-4)}`;
}

async function requireWorkspaceKey(request, reply) {
  const key = request.headers["x-router-key"] || request.headers.authorization?.replace(/^Bearer\s+/i, "");
  const apiKey = key ? store.findApiKeyByHash(hashSecret(key)) : null;
  const workspace = apiKey ? store.findWorkspace(apiKey.workspace_id) : null;

  if (!apiKey || !workspace || workspace.status === "blocked") {
    return reply.code(401).send({ error: "unauthorized" });
  }

  apiKey.last_used_at = new Date().toISOString();
  await store.upsertApiKey(apiKey);
  request.workspace = workspace;
  request.apiKey = apiKey;
}

function requireAdminKey(request, reply, done) {
  const key = request.headers["x-admin-key"] || request.headers["x-router-key"] || request.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (key !== config.adminKey) {
    reply.code(401).send({ error: "unauthorized" });
    return;
  }
  done();
}

function shouldUseFallback(body) {
  return Boolean(body.fallback_allowed || body.failover);
}

function excludedConnectorIds(body) {
  const value = body.exclude_connector_ids ?? body.exclude_instance_ids ?? body.exclude_connector_id ?? body.exclude_instance_id ?? [];
  const values = Array.isArray(value) ? value : String(value).split(",");
  return values.map((item) => String(item).trim()).filter(Boolean);
}

function exclusionReasons(excludedIds, attemptedIds = [], activeIds = []) {
  return {
    ...Object.fromEntries(excludedIds.map((id) => [id, "conector excluido pelo payload"])),
    ...Object.fromEntries(activeIds.map((id) => [id, "conector em uso"])),
    ...Object.fromEntries([...attemptedIds].map((id) => [id, "tentativa anterior falhou"]))
  };
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
  if (!error.status || error.status >= 500 || providerDisconnected(error)) {
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
  if (![422, 503].includes(error.status)) return false;
  const message = String(error.data?.message || error.data?.error || "").toLowerCase();
  const status = String(error.data?.status || "").toLowerCase();
  const expected = Array.isArray(error.data?.expected)
    ? error.data.expected.map((item) => String(item).toLowerCase())
    : [];
  return message.includes("disconnected")
    || message.includes("desconect")
    || (message.includes("session status is not as expected") && status === "failed" && expected.includes("working"));
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

function buildMessage(body, text, workspaceId, status = "selected") {
  return {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    external_id: body.external_id || body.track_id || null,
    to: body.to,
    message: text,
    source: body.source || "api",
    priority: body.priority || "normal",
    status,
    requested_connector_id: body.connector_id || body.instance_id || null,
    excluded_connector_ids: excludedConnectorIds(body),
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
      workspace_id: message.workspace_id,
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
      processQueuedJob(job, message).catch(async (error) => {
        app.log.error(error);
        message.status = "failed";
        message.error = { message: error.message, at: new Date().toISOString() };
        await store.updateMessage(message.id, message);
      });
    }
  } finally {
    queueRunning = false;
  }
}

async function processQueuedJob(job, message) {
  activeQueueJobs += 1;
  try {
    const result = await deliverMessage(message, job.body, job.text, {
      waitForCapacity: true,
      deferWhenWaiting: true,
      queuedAt: job.queuedAt
    });

    if (result.deferred) {
      message.status = "queued";
      message.error = null;
      await store.updateMessage(message.id, message);
      scheduleQueuedJob(job, result.delayMs);
    }
  } finally {
    activeQueueJobs = Math.max(0, activeQueueJobs - 1);
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
    version: "v3",
    time: new Date().toISOString(),
    multiuser: true,
    workspaces: {
      total: store.data.workspaces.length,
      active: store.data.workspaces.filter((workspace) => workspace.status !== "blocked").length
    },
    users: {
      total: store.data.users.length
    },
    instances: {
      total: instances.length,
      active: instances.filter((instance) => instance.status === "active").length
    },
    messages: {
      total: store.data.messages.length
    },
    queue: queueStats()
  };
}

async function waitForSelection(body, connectorId, attemptedIds, queuedAt, options = {}) {
  while (true) {
    const fallbackAllowed = shouldUseFallback(body);
    const excludedIds = excludedConnectorIds(body);
    const activeIds = [...activeConnectorIds].filter((id) => !attemptedIds.has(id));
    const selection = selectInstance(store.listInstances(body.workspace_id), connectorId, {
      dryRun: Boolean(body.dry_run),
      fallbackAllowed,
      excludeIds: [...excludedIds, ...attemptedIds, ...activeIds],
      excludeReasons: exclusionReasons(excludedIds, attemptedIds, activeIds)
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

    const waitMs = nextEligibilityDelayMs(store.listInstances(body.workspace_id), connectorId, {
      dryRun: false,
      fallbackAllowed,
      excludeIds: [...excludedIds, ...attemptedIds]
    });

    if (options.deferWhenWaiting) {
      const delayMs = waitMs === null
        ? (activeIds.length ? config.queuePollMs : null)
        : waitMs;

      if (delayMs !== null) {
        return {
          ...selection,
          deferred: true,
          delayMs: queueDelay(delayMs)
        };
      }
    }

    if (waitMs === null) return selection;
    await sleep(queueDelay(waitMs));
  }
}

async function reserveSelection(body, connectorId, attemptedIds, queuedAt, options = {}) {
  return runSelection(async () => {
    const selection = await waitForSelection(body, connectorId, attemptedIds, queuedAt, options);
    if (selection.instance && !body.dry_run) {
      activeConnectorIds.add(selection.instance.id);
    }
    return selection;
  });
}

async function deliverMessage(message, body, text, options = {}) {
  body.workspace_id = body.workspace_id || message.workspace_id;
  const connectorId = body.connector_id || body.instance_id || null;
  const attemptedIds = new Set();
  let selection = await reserveSelection(body, connectorId, attemptedIds, options.queuedAt || Date.now(), {
    deferWhenWaiting: Boolean(options.deferWhenWaiting)
  });

  if (!selection.instance) {
    if (selection.deferred) {
      return {
        message,
        httpCode: 202,
        deferred: true,
        delayMs: selection.delayMs
      };
    }

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
        external_id: message.external_id,
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
        selection = await reserveSelection({
          ...body,
          fallback_allowed: true
        }, connectorId, attemptedIds, options.queuedAt || Date.now(), {
          deferWhenWaiting: Boolean(options.deferWhenWaiting)
        });

        if (selection.instance) continue;
        if (selection.deferred) {
          return {
            message,
            httpCode: 202,
            deferred: true,
            delayMs: selection.delayMs
          };
        }

        message.error = {
          ...failure,
          message: "Falha no provider e nenhuma instancia alternativa elegivel",
          rejected: selection.rejected
        };
        await store.updateMessage(message.id, message);
      }

      return { message, httpCode: error.status && error.status < 500 ? error.status : 502 };
    } finally {
      activeConnectorIds.delete(instance.id);
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

  const workspaceId = request.workspace?.id || body.workspace_id;
  if (!workspaceId) {
    return reply.code(401).send({ error: "workspace_required" });
  }

  body.workspace_id = workspaceId;
  const message = buildMessage(body, text, workspaceId, body.queue ? "queued" : "selected");
  await store.addMessage(message);

  if (body.queue && !body.dry_run) {
    const queuedResponse = structuredClone(message);
    await enqueueMessage(message, body, text);
    return reply.code(202).send(queuedResponse);
  }

  const result = await deliverMessage(message, body, text);
  return reply.code(result.httpCode).send(result.message);
}

async function createWorkspaceApiKey(workspaceId, label = "API principal") {
  const plain = newApiKey();
  const apiKey = {
    id: crypto.randomUUID(),
    workspace_id: workspaceId,
    label,
    key_hash: hashSecret(plain),
    key_preview: keyPreview(plain),
    status: "active",
    created_at: new Date().toISOString(),
    last_used_at: null
  };
  await store.upsertApiKey(apiKey);
  return { apiKey, plain };
}

function publicApiKey(apiKey) {
  const { key_hash: _hash, ...safe } = apiKey;
  return safe;
}

function publicUser(user) {
  return {
    ...user,
    phone_masked: maskPhone(user.phone)
  };
}

function workspaceSummary(workspace) {
  const messages = store.listMessages(500, workspace.id);
  const instances = store.listInstances(workspace.id);
  return {
    ...workspace,
    instances_total: instances.length,
    instances_active: instances.filter((instance) => instance.status === "active").length,
    messages_total: messages.length,
    api_keys: store.listApiKeys(workspace.id).map(publicApiKey)
  };
}

function adminOverview() {
  return {
    ok: true,
    version: "v3",
    base_url: config.publicBaseUrl,
    n8n_verify_webhook_url: store.getSetting("verification_webhook_url") || config.verificationWebhookUrl || "",
    users: store.listUsers().map((user) => ({
      ...publicUser(user),
      workspaces: store.listWorkspaces(user.id).map(workspaceSummary)
    })),
    workspaces: store.listWorkspaces().map(workspaceSummary),
    messages: store.listMessages(100),
    queue: queueStats(),
    n8n_send_example: {
      method: "POST",
      url: `${config.publicBaseUrl}/api/send`,
      headers: {
        "X-Router-Key": "whr_chave_do_workspace",
        "Content-Type": "application/json"
      },
      body: {
        to: "5511999999999",
        message: "Mensagem via V3",
        source: "n8n",
        queue: true,
        failover: true,
        failover_mode: "safe"
      }
    },
    n8n_verify_payload: {
      phone: "5511999999999",
      code: "123456",
      name: "Nome do usuario",
      source: "whatsapp-router-v3"
    }
  };
}

async function createUserWorkspace({ phone, name, workspaceName }) {
  const normalizedPhone = onlyDigits(phone);
  const now = new Date().toISOString();
  let user = store.findUserByPhone(normalizedPhone);
  if (!user) {
    user = await store.upsertUser({
      id: crypto.randomUUID(),
      phone: normalizedPhone,
      name: name || normalizedPhone,
      status: "active",
      verified_at: now,
      created_at: now
    });
  } else {
    user.name = name || user.name;
    user.status = "active";
    user.verified_at = user.verified_at || now;
    await store.upsertUser(user);
  }

  let workspace = store.listWorkspaces(user.id)[0];
  if (!workspace) {
    workspace = await store.upsertWorkspace({
      id: crypto.randomUUID(),
      name: workspaceName || user.name || normalizedPhone,
      owner_user_id: user.id,
      status: "active",
      created_at: now
    });
    await store.upsertMember({
      id: crypto.randomUUID(),
      user_id: user.id,
      workspace_id: workspace.id,
      role: "owner",
      created_at: now
    });
  }

  const existingKey = store.listApiKeys(workspace.id).find((item) => item.status === "active");
  const keyResult = existingKey ? { apiKey: existingKey, plain: null } : await createWorkspaceApiKey(workspace.id);

  return { user, workspace, ...keyResult };
}

async function sendVerificationWebhook(payload) {
  const webhookUrl = store.getSetting("verification_webhook_url") || config.verificationWebhookUrl;
  if (!webhookUrl) return { configured: false };

  const result = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const text = await result.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  return { configured: true, ok: result.ok, status: result.status, data: redactSensitive(data) };
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
      document.querySelector('#rows').innerHTML = '<tr><td colspan="5">Detalhes disponíveis somente no admin autenticado.</td></tr>';
    }
    function statusLabel(status) {
      return {
        active: 'Ativo',
        paused: 'Pausado',
        ok: 'OK',
        error: 'Erro',
        unknown: 'Desconhecido',
        selected: 'Selecionado',
        queued: 'Na fila',
        processing: 'Processando',
        sent: 'Enviado',
        failed: 'Erro',
        dry_run: 'Teste'
      }[status] || status || '-';
    }
    function formatDateTime(value) {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
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

app.get("/cadastro", async (_request, reply) => {
  reply.type("text/html").send(registerHtml());
});

app.get("/register", async (_request, reply) => {
  reply.type("text/html").send(registerHtml());
});

app.get("/painel", async (_request, reply) => {
  reply.type("text/html").send(portalHtml());
});

app.get("/portal", async (_request, reply) => {
  reply.type("text/html").send(portalHtml());
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

app.register(async (auth) => {
  auth.post("/request-code", async (request, reply) => {
    const body = request.body || {};
    const phone = onlyDigits(body.phone || body.to);
    if (!phone) return reply.code(422).send({ error: "missing_fields", fields: ["phone"] });

    const code = String(crypto.randomInt(100000, 999999));
    const verification = {
      id: crypto.randomUUID(),
      phone,
      name: body.name || "",
      code_hash: hashSecret(code),
      status: "pending",
      attempts: 0,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      created_at: new Date().toISOString()
    };

    await store.upsertVerification(verification);
    const delivery = await sendVerificationWebhook({
      phone,
      code,
      name: body.name || "",
      message: `Seu codigo do WhatsApp Router e ${code}. Ele expira em 10 minutos.`,
      source: "whatsapp-router-v3"
    });

    return {
      ok: true,
      phone: maskPhone(phone),
      expires_at: verification.expires_at,
      delivery
    };
  });

  auth.post("/verify-code", async (request, reply) => {
    const body = request.body || {};
    const phone = onlyDigits(body.phone || body.to);
    const code = String(body.code || "").trim();
    if (!phone || !code) return reply.code(422).send({ error: "missing_fields", fields: ["phone", "code"] });

    const verification = store.listVerifications(phone).find((item) => item.status === "pending");
    if (!verification) return reply.code(404).send({ error: "code_not_found" });
    if (new Date(verification.expires_at).getTime() < Date.now()) {
      verification.status = "expired";
      await store.upsertVerification(verification);
      return reply.code(410).send({ error: "code_expired" });
    }

    verification.attempts = Number(verification.attempts || 0) + 1;
    if (verification.code_hash !== hashSecret(code)) {
      await store.upsertVerification(verification);
      return reply.code(401).send({ error: "invalid_code" });
    }

    verification.status = "verified";
    verification.verified_at = new Date().toISOString();
    await store.upsertVerification(verification);

    const result = await createUserWorkspace({
      phone,
      name: body.name || verification.name,
      workspaceName: body.workspace_name || body.name || verification.name
    });

    return {
      ok: true,
      user: publicUser(result.user),
      workspace: workspaceSummary(result.workspace),
      api_key: result.plain,
      api_key_preview: result.apiKey.key_preview,
      send_url: `${config.publicBaseUrl}/api/send`
    };
  });
}, { prefix: "/api/auth" });

app.register(async (admin) => {
  admin.addHook("preHandler", requireAdminKey);

  admin.get("/overview", async () => adminOverview());

  admin.put("/settings", async (request) => {
    const body = request.body || {};
    await store.setSetting("verification_webhook_url", body.n8n_verify_webhook_url || "");
    return adminOverview();
  });

  admin.post("/users", async (request, reply) => {
    const body = request.body || {};
    if (!body.phone) return reply.code(422).send({ error: "missing_fields", fields: ["phone"] });
    const result = await createUserWorkspace({
      phone: body.phone,
      name: body.name,
      workspaceName: body.workspace_name
    });
    return reply.code(201).send({
      ok: true,
      user: publicUser(result.user),
      workspace: workspaceSummary(result.workspace),
      api_key: result.plain,
      api_key_preview: result.apiKey.key_preview,
      send_url: `${config.publicBaseUrl}/api/send`
    });
  });

  admin.put("/users/:id", async (request, reply) => {
    const user = store.findUser(request.params.id);
    if (!user) return reply.code(404).send({ error: "user_not_found" });

    const body = request.body || {};
    const phone = body.phone ? onlyDigits(body.phone) : user.phone;
    const existingPhoneUser = store.findUserByPhone(phone);
    if (existingPhoneUser && existingPhoneUser.id !== user.id) {
      return reply.code(409).send({ error: "phone_already_exists" });
    }

    user.name = body.name?.trim() || user.name;
    user.phone = phone;
    user.status = body.status || user.status;
    user.updated_at = new Date().toISOString();
    await store.upsertUser(user);

    const workspace = store.listWorkspaces(user.id)[0];
    if (workspace && body.workspace_name?.trim()) {
      workspace.name = body.workspace_name.trim();
      workspace.updated_at = new Date().toISOString();
      await store.upsertWorkspace(workspace);
    }

    return {
      ok: true,
      user: {
        ...publicUser(user),
        workspaces: store.listWorkspaces(user.id).map(workspaceSummary)
      }
    };
  });

  admin.delete("/users/:id", async (request, reply) => {
    const deleted = await store.deleteUser(request.params.id);
    if (!deleted) return reply.code(404).send({ error: "user_not_found" });
    return { deleted: true };
  });

  admin.post("/workspaces/:workspaceId/api-keys", async (request, reply) => {
    const workspace = store.findWorkspace(request.params.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "workspace_not_found" });
    const result = await createWorkspaceApiKey(workspace.id, request.body?.label || "API principal");
    return reply.code(201).send({
      api_key: result.plain,
      item: publicApiKey(result.apiKey)
    });
  });

  admin.get("/workspaces/:workspaceId/instances", async (request) => {
    return store.listInstances(request.params.workspaceId).map(publicInstance);
  });

  admin.post("/workspaces/:workspaceId/instances", async (request, reply) => {
    const workspace = store.findWorkspace(request.params.workspaceId);
    if (!workspace) return reply.code(404).send({ error: "workspace_not_found" });

    const body = request.body || {};
    const existing = body.id ? store.findInstance(body.id, workspace.id) : null;
    const required = ["name", "provider", "base_url"];
    const missing = required.filter((field) => !body[field]);
    if (!existing && body.provider !== "custom" && !body.api_key) missing.push("api_key");
    if (missing.length) return reply.code(422).send({ error: "missing_fields", fields: missing });

    const instance = normalizeInstance({
      ...existing,
      ...body,
      workspace_id: workspace.id,
      api_key: body.api_key || existing?.api_key,
      id: body.id || crypto.randomUUID()
    });

    await store.upsertInstance(instance);
    return reply.code(201).send(publicInstance(instance));
  });

  admin.delete("/workspaces/:workspaceId/instances/:id", async (request, reply) => {
    const deleted = await store.deleteInstance(request.params.id, request.params.workspaceId);
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return { deleted: true };
  });

  admin.post("/workspaces/:workspaceId/instances/:id/pause", async (request, reply) => {
    const instance = store.findInstance(request.params.id, request.params.workspaceId);
    if (!instance) return reply.code(404).send({ error: "not_found" });
    instance.status = "paused";
    instance.updated_at = new Date().toISOString();
    await store.upsertInstance(instance);
    return publicInstance(instance);
  });

  admin.post("/workspaces/:workspaceId/instances/:id/resume", async (request, reply) => {
    const instance = store.findInstance(request.params.id, request.params.workspaceId);
    if (!instance) return reply.code(404).send({ error: "not_found" });
    instance.status = "active";
    instance.cooldown_until = null;
    instance.updated_at = new Date().toISOString();
    await store.upsertInstance(instance);
    return publicInstance(instance);
  });

  admin.post("/workspaces/:workspaceId/instances/:id/health-check", async (request, reply) => {
    const instance = store.findInstance(request.params.id, request.params.workspaceId);
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
      await store.upsertInstance(instance);
      return { ok: true, instance: publicInstance(instance), provider_response: redactSensitive(result.data) };
    } catch (error) {
      instance.health = "error";
      instance.last_error = { message: error.message, status: error.status, data: redactSensitive(error.data), at: new Date().toISOString() };
      await store.upsertInstance(instance);
      return reply.code(502).send({ ok: false, instance: publicInstance(instance), error: instance.last_error });
    }
  });

  admin.get("/workspaces/:workspaceId/messages", async (request) => {
    const limit = Math.min(Number(request.query.limit || 100), 500);
    return store.listMessages(limit, request.params.workspaceId);
  });
}, { prefix: "/api/admin" });

app.register(async (api) => {
  api.addHook("preHandler", requireWorkspaceKey);

  api.get("/me", async (request) => ({
    workspace: workspaceSummary(request.workspace),
    api_key: publicApiKey(request.apiKey),
    send_url: `${config.publicBaseUrl}/api/send`
  }));

  api.get("/instances", async (request) => store.listInstances(request.workspace.id).map(publicInstance));

  api.post("/instances", async (request, reply) => {
    const body = request.body || {};
    const existing = body.id ? store.findInstance(body.id, request.workspace.id) : null;
    const required = ["name", "provider", "base_url"];
    const missing = required.filter((field) => !body[field]);
    if (!existing && body.provider !== "custom" && !body.api_key) missing.push("api_key");
    if (missing.length) {
      return reply.code(422).send({ error: "missing_fields", fields: missing });
    }

    const instance = normalizeInstance({
      ...existing,
      ...body,
      workspace_id: request.workspace.id,
      api_key: body.api_key || existing?.api_key,
      id: body.id || crypto.randomUUID()
    });

    await store.upsertInstance(instance);
    reply.code(201).send(publicInstance(instance));
  });

  api.delete("/instances/:id", async (request, reply) => {
    const deleted = await store.deleteInstance(request.params.id, request.workspace.id);
    if (!deleted) return reply.code(404).send({ error: "not_found" });
    return { deleted: true };
  });

  api.post("/instances/:id/pause", async (request, reply) => {
    const instance = store.findInstance(request.params.id, request.workspace.id);
    if (!instance) return reply.code(404).send({ error: "not_found" });
    instance.status = "paused";
    instance.updated_at = new Date().toISOString();
    await store.upsertInstance(instance);
    return publicInstance(instance);
  });

  api.post("/instances/:id/resume", async (request, reply) => {
    const instance = store.findInstance(request.params.id, request.workspace.id);
    if (!instance) return reply.code(404).send({ error: "not_found" });
    instance.status = "active";
    instance.cooldown_until = null;
    instance.updated_at = new Date().toISOString();
    await store.upsertInstance(instance);
    return publicInstance(instance);
  });

  api.post("/instances/:id/health-check", async (request, reply) => {
    const instance = store.findInstance(request.params.id, request.workspace.id);
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
      await store.upsertInstance(instance);
      return { ok: true, instance: publicInstance(instance), provider_response: redactSensitive(result.data) };
    } catch (error) {
      instance.health = "error";
      instance.last_error = { message: error.message, status: error.status, data: redactSensitive(error.data), at: new Date().toISOString() };
      instance.updated_at = new Date().toISOString();
      await store.upsertInstance(instance);
      return reply.code(502).send({ ok: false, instance: publicInstance(instance), error: instance.last_error });
    }
  });

  api.get("/messages", async (request) => {
    const limit = Math.min(Number(request.query.limit || 100), 500);
    return store.listMessages(limit, request.workspace.id);
  });

  api.post("/send", handleSend);

  api.post("/webhooks/:provider", async (request) => {
    const event = {
      id: crypto.randomUUID(),
      workspace_id: request.workspace.id,
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
