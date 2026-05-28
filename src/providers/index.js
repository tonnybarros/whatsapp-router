import { config } from "../config.js";

function trimSlash(value = "") {
  return String(value).replace(/\/+$/, "");
}

function joinUrl(baseUrl, path) {
  return `${trimSlash(baseUrl)}/${String(path || "").replace(/^\/+/, "")}`;
}

function onlyDigits(number) {
  return String(number).replace(/[^\d]/g, "");
}

function wahaChatId(to) {
  const value = String(to);
  if (value.includes("@")) return value;
  return `${onlyDigits(value)}@c.us`;
}

function sameWahaChat(to, chatId) {
  if (!chatId) return false;
  return onlyDigits(to) === onlyDigits(chatId);
}

async function requestJson(url, { method = "POST", headers, body, timeoutMs = config.sendTimeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (error) {
      error.transport_error = true;
      error.retryable = error.name !== "AbortError";
      throw error;
    }

    const text = await response.text();
    let data = text;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(`Provider HTTP ${response.status}`);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return { status: response.status, data };
  } finally {
    clearTimeout(timeout);
  }
}

function authHeader(instance, fallbackName) {
  if (!instance.api_key) return {};
  return {
    [instance.auth_header || fallbackName]: instance.api_key
  };
}

function parseJsonConfig(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;

  try {
    return JSON.parse(String(value));
  } catch (error) {
    const friendly = new Error("JSON customizado invalido no conector");
    friendly.status = 422;
    friendly.data = { message: error.message };
    throw friendly;
  }
}

function templateContext(instance, payload) {
  return {
    to: payload.to,
    number: onlyDigits(payload.to),
    message: payload.message,
    text: payload.message,
    source: payload.source || "",
    track_id: payload.track_id || "",
    external_id: payload.external_id || payload.track_id || "",
    session: instance.session || "",
    instance: instance.instance || ""
  };
}

function applyTemplate(value, context) {
  if (Array.isArray(value)) return value.map((item) => applyTemplate(item, context));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, applyTemplate(item, context)]));
  }
  if (typeof value !== "string") return value;
  return value.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key) => context[key] ?? "");
}

async function resolveWahaChatId(instance, to) {
  if (String(to).includes("@")) return String(to);

  const phone = onlyDigits(to);
  if (instance.prefer_lid !== false) {
    const lid = await resolveWahaLid(instance, phone);
    if (lid) return lid;
  }

  const url = new URL(joinUrl(instance.base_url, instance.check_exists_path || "/api/contacts/check-exists"));
  url.searchParams.set("phone", phone);
  url.searchParams.set("session", instance.session || "default");

  try {
    const result = await requestJson(url, {
      method: "GET",
      headers: authHeader(instance, "X-Api-Key")
    });

    if (result.data?.numberExists === false) {
      const error = new Error("WAHA informou que o numero nao existe no WhatsApp");
      error.status = 422;
      error.data = result.data;
      throw error;
    }

    const chatId = result.data?.chatId || wahaChatId(to);
    if (instance.engine === "gows" && onlyDigits(chatId) !== phone) {
      const error = new Error("WAHA/GOWS nao encontrou LID e normalizou o numero para outro chatId; usando failover para evitar destino incorreto.");
      error.status = 409;
      error.retryable = true;
      error.data = {
        phone,
        chatId,
        numberExists: result.data?.numberExists
      };
      throw error;
    }

    return chatId;
  } catch (error) {
    if (error.status === 409 || error.status === 422) throw error;
    return wahaChatId(to);
  }
}

async function resolveWahaLid(instance, phone) {
  const url = new URL(joinUrl(instance.base_url, `/api/${encodeURIComponent(instance.session || "default")}/lids/pn/${phone}`));

  try {
    const result = await requestJson(url, {
      method: "GET",
      headers: authHeader(instance, "X-Api-Key")
    });

    return result.data?.lid || null;
  } catch {
    return null;
  }
}

async function sendUazapi(instance, payload) {
  const url = joinUrl(instance.base_url, instance.send_path || "/send/text");
  return requestJson(url, {
    headers: authHeader(instance, "token"),
    body: {
      number: payload.to,
      text: payload.message,
      delay: payload.delay,
      linkPreview: payload.linkPreview ?? false,
      track_source: payload.source,
      track_id: payload.track_id
    }
  });
}

async function sendWaha(instance, payload) {
  const url = joinUrl(instance.base_url, instance.send_path || "/api/sendText");
  const chatId = await resolveWahaChatId(instance, payload.to);

  if (sameWahaChat(chatId, instance.self_chat_id) || sameWahaChat(chatId, instance.self_jid)) {
    const error = new Error("WAHA/GOWS nao envia teste para o proprio numero da sessao; use outro destino para testar este conector.");
    error.status = 422;
    error.data = { chatId, self_chat_id: instance.self_chat_id, self_jid: instance.self_jid };
    throw error;
  }

  return requestJson(url, {
    headers: authHeader(instance, "X-Api-Key"),
    body: {
      session: instance.session || "default",
      chatId,
      text: payload.message
    }
  });
}

async function sendEvolutionGo(instance, payload) {
  const url = joinUrl(instance.base_url, instance.send_path || "/send/text");
  const number = await evolutionGoNumber(instance, payload.to);

  try {
    return await requestJson(url, {
      headers: authHeader(instance, "apikey"),
      body: {
        number,
        text: payload.message,
        delay: payload.delay,
        formatJid: !String(number).includes("@")
      }
    });
  } catch (error) {
    if (error.status === 500 && error.data?.error === "server returned error 400") {
      const checked = await checkEvolutionGoNumber(instance, payload.to);
      const friendly = new Error("Evolution Go recusou o envio por telefone/JID. O numero existe, mas esta instancia so aceitou LID neste teste; LID automatico esta desativado para evitar destino ambiguo.");
      friendly.status = 422;
      friendly.data = {
        attempted_number: number,
        checked
      };
      throw friendly;
    }

    throw error;
  }
}

async function evolutionGoNumber(instance, to) {
  const value = String(to);
  if (value.includes("@")) return value;
  return onlyDigits(value);
}

async function checkEvolutionGoNumber(instance, to) {
  try {
    const result = await requestJson(new URL(joinUrl(instance.base_url, "/user/check")), {
      headers: authHeader(instance, "apikey"),
      body: { number: [onlyDigits(to)] }
    });

    return result.data?.data?.Users?.[0] || result.data?.Users?.[0] || result.data;
  } catch {
    return null;
  }
}

async function sendEvolutionApi(instance, payload) {
  const instanceName = instance.instance || instance.session;
  const path = instance.send_path || `/message/sendText/${encodeURIComponent(instanceName || "")}`;
  const url = joinUrl(instance.base_url, path);

  return requestJson(url, {
    headers: authHeader(instance, "apikey"),
    body: {
      number: onlyDigits(payload.to),
      text: payload.message,
      delay: payload.delay,
      linkPreview: payload.linkPreview ?? false
    }
  });
}

async function sendCustom(instance, payload) {
  const url = joinUrl(instance.base_url, instance.send_path || "/");
  const context = templateContext(instance, payload);
  const customHeaders = applyTemplate(parseJsonConfig(instance.custom_headers, {}), context);
  const template = parseJsonConfig(instance.custom_body_template, {
    to: "{{to}}",
    message: "{{message}}",
    source: "{{source}}",
    track_id: "{{track_id}}"
  });

  return requestJson(url, {
    headers: {
      ...authHeader(instance, "Authorization"),
      ...customHeaders
    },
    body: applyTemplate(template, context)
  });
}

const adapters = {
  uazapi: sendUazapi,
  waha: sendWaha,
  evolution_go: sendEvolutionGo,
  evolution_api: sendEvolutionApi,
  custom: sendCustom
};

export async function sendViaProvider(instance, payload) {
  const adapter = adapters[instance.provider];
  if (!adapter) {
    throw new Error(`Provider nao suportado: ${instance.provider}`);
  }

  return adapter(instance, payload);
}

export async function checkProviderHealth(instance) {
  const healthPathByProvider = {
    uazapi: "/instance/status",
    waha: `/api/sessions/${encodeURIComponent(instance.session || "default")}`,
    evolution_go: "/instance/status",
    evolution_api: `/instance/connectionState/${encodeURIComponent(instance.instance || instance.session || "")}`,
    custom: "/"
  };

  const url = joinUrl(instance.base_url, instance.health_path || healthPathByProvider[instance.provider] || "/");
  const customHeaders = instance.provider === "custom"
    ? applyTemplate(parseJsonConfig(instance.custom_headers, {}), templateContext(instance, { to: "", message: "", source: "", track_id: "" }))
    : {};
  const response = await fetch(url, {
    headers: {
      ...authHeader(instance, instance.provider === "waha" ? "X-Api-Key" : instance.provider === "uazapi" ? "token" : instance.provider === "custom" ? "Authorization" : "apikey"),
      ...customHeaders
    }
  });
  const text = await response.text();

  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Health HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { status: response.status, data };
}
