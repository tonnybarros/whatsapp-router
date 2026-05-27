import { config } from "../config.js";
import { ProxyAgent } from "undici";

const proxyAgents = new Map();

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

function proxyDispatcher(instance) {
  if (!instance?.proxy_enabled || !instance?.proxy_url) return null;
  if (!proxyAgents.has(instance.proxy_url)) {
    proxyAgents.set(instance.proxy_url, new ProxyAgent(instance.proxy_url));
  }
  return proxyAgents.get(instance.proxy_url);
}

async function requestJson(url, { method = "POST", headers, body, instance, timeoutMs = config.sendTimeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      const dispatcher = proxyDispatcher(instance);
      const requestOptions = {
        method,
        headers: {
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      };
      if (dispatcher) requestOptions.dispatcher = dispatcher;
      response = await fetch(url, requestOptions);
    } catch (error) {
      if (instance?.proxy_enabled && instance?.proxy_url) {
        error.message = "Falha ao conectar usando o proxy do conector";
        error.proxy_error = true;
      }
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
  return {
    [instance.auth_header || fallbackName]: instance.api_key
  };
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
      headers: authHeader(instance, "X-Api-Key"),
      instance
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
      headers: authHeader(instance, "X-Api-Key"),
      instance
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
    instance,
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
    instance,
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
      instance,
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
      instance,
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
    instance,
    body: {
      number: onlyDigits(payload.to),
      text: payload.message,
      delay: payload.delay,
      linkPreview: payload.linkPreview ?? false
    }
  });
}

const adapters = {
  uazapi: sendUazapi,
  waha: sendWaha,
  evolution_go: sendEvolutionGo,
  evolution_api: sendEvolutionApi
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
    evolution_api: `/instance/connectionState/${encodeURIComponent(instance.instance || instance.session || "")}`
  };

  const url = joinUrl(instance.base_url, instance.health_path || healthPathByProvider[instance.provider] || "/");
  try {
    return await requestJson(url, {
      method: "GET",
      headers: authHeader(instance, instance.provider === "waha" ? "X-Api-Key" : instance.provider === "uazapi" ? "token" : "apikey"),
      instance
    });
  } catch (error) {
    if (error.message?.startsWith("Provider HTTP ")) {
      error.message = error.message.replace("Provider HTTP ", "Health HTTP ");
    }
    throw error;
  }
}
