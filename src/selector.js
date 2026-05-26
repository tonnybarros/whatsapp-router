import { config } from "./config.js";

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

function secondsSince(isoDate) {
  if (!isoDate) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
}

function msUntil(isoDate) {
  if (!isoDate) return 0;
  return Math.max(0, new Date(isoDate).getTime() - Date.now());
}

export function normalizeInstance(input) {
  const now = new Date().toISOString();

  return {
    id: input.id,
    name: input.name,
    provider: input.provider,
    base_url: input.base_url,
    api_key: input.api_key,
    auth_header: input.auth_header,
    session: input.session,
    instance: input.instance,
    send_path: input.send_path,
    health_path: input.health_path,
    status: input.status || "active",
    health: input.health || "unknown",
    daily_limit: Number(input.daily_limit || config.defaultDailyLimit),
    daily_sent_count: Number(input.daily_sent_count || 0),
    daily_sent_date: input.daily_sent_date || startOfToday().slice(0, 10),
    min_seconds_between_messages: Number(input.min_seconds_between_messages || config.defaultMinSecondsBetweenMessages),
    error_cooldown_seconds: Number(input.error_cooldown_seconds || config.defaultErrorCooldownSeconds),
    cooldown_until: input.cooldown_until || null,
    last_sent_at: input.last_sent_at || null,
    last_error: input.last_error || null,
    self_chat_id: input.self_chat_id || null,
    self_jid: input.self_jid || null,
    self_lid: input.self_lid || null,
    engine: input.engine || null,
    prefer_lid: input.prefer_lid ?? true,
    notes: input.notes || "",
    created_at: input.created_at || now,
    updated_at: input.updated_at || now
  };
}

export function resetDailyCounterIfNeeded(instance) {
  const today = startOfToday().slice(0, 10);
  if (instance.daily_sent_date !== today) {
    instance.daily_sent_date = today;
    instance.daily_sent_count = 0;
  }
}

export function explainEligibility(instance) {
  resetDailyCounterIfNeeded(instance);

  if (instance.status !== "active") return `status=${instance.status}`;
  if (!instance.base_url) return "base_url ausente";
  if (!instance.api_key) return "api_key ausente";
  if (instance.cooldown_until && new Date(instance.cooldown_until).getTime() > Date.now()) {
    return `cooldown ate ${instance.cooldown_until}`;
  }
  if (instance.daily_sent_count >= instance.daily_limit) {
    return `limite diario ${instance.daily_sent_count}/${instance.daily_limit}`;
  }
  if (secondsSince(instance.last_sent_at) < instance.min_seconds_between_messages) {
    return `intervalo minimo ${instance.min_seconds_between_messages}s`;
  }

  return null;
}

export function explainDryRunEligibility(instance) {
  resetDailyCounterIfNeeded(instance);

  if (instance.status !== "active") return `status=${instance.status}`;
  if (!instance.base_url) return "base_url ausente";
  if (!instance.api_key) return "api_key ausente";
  if (instance.daily_sent_count >= instance.daily_limit) {
    return `limite diario ${instance.daily_sent_count}/${instance.daily_limit}`;
  }

  return null;
}

function selectCandidate(instances, explain) {
  return instances
    .map((instance) => ({ instance, reason: explain(instance) }))
    .filter((item) => !item.reason)
    .sort((a, b) => {
      const lastA = a.instance.last_sent_at ? new Date(a.instance.last_sent_at).getTime() : 0;
      const lastB = b.instance.last_sent_at ? new Date(b.instance.last_sent_at).getTime() : 0;
      return lastA - lastB;
    });
}

export function selectInstance(instances, preferredId = null, options = {}) {
  const explain = options.dryRun ? explainDryRunEligibility : explainEligibility;
  const excludedIds = new Set(options.excludeIds || []);
  const availableInstances = instances.filter((instance) => !excludedIds.has(instance.id));

  if (preferredId) {
    const preferred = instances.find((instance) => instance.id === preferredId);
    if (!preferred) {
      const rejected = [{ id: preferredId, name: preferredId, reason: "instancia nao encontrada" }];
      if (!options.fallbackAllowed) {
        return { instance: null, rejected };
      }

      const fallbackCandidates = selectCandidate(availableInstances, explain);
      return fallbackCandidates.length > 0
        ? { instance: fallbackCandidates[0].instance, rejected }
        : { instance: null, rejected };
    }

    const preferredReason = excludedIds.has(preferred.id) ? "tentativa anterior falhou" : explain(preferred);
    if (!preferredReason) {
      return { instance: preferred, rejected: [] };
    }

    if (!options.fallbackAllowed) {
      return { instance: null, rejected: [{ id: preferred.id, name: preferred.name, reason: preferredReason }] };
    }

    const fallbackCandidates = selectCandidate(
      availableInstances.filter((instance) => instance.id !== preferred.id),
      explain
    );

    if (fallbackCandidates.length > 0) {
      return {
        instance: fallbackCandidates[0].instance,
        rejected: [{ id: preferred.id, name: preferred.name, reason: preferredReason }]
      };
    }

    return {
      instance: null,
      rejected: instances.map((instance) => ({
        id: instance.id,
        name: instance.name,
        reason: excludedIds.has(instance.id) ? "tentativa anterior falhou" : explain(instance)
      }))
    };
  }

  const candidates = selectCandidate(availableInstances, explain);

  if (candidates.length > 0) {
    return { instance: candidates[0].instance, rejected: [] };
  }

  return {
    instance: null,
    rejected: instances.map((instance) => ({
      id: instance.id,
      name: instance.name,
      reason: excludedIds.has(instance.id) ? "tentativa anterior falhou" : explain(instance)
    }))
  };
}

function eligibilityDelayMs(instance, options = {}) {
  resetDailyCounterIfNeeded(instance);

  if (instance.status !== "active") return null;
  if (!instance.base_url) return null;
  if (!instance.api_key) return null;
  if (instance.daily_sent_count >= instance.daily_limit) return null;

  if (!options.dryRun) {
    const cooldownMs = msUntil(instance.cooldown_until);
    if (cooldownMs > 0) return cooldownMs;

    const intervalMs = Number(instance.min_seconds_between_messages || config.defaultMinSecondsBetweenMessages) * 1000;
    const elapsedMs = instance.last_sent_at ? Date.now() - new Date(instance.last_sent_at).getTime() : Number.POSITIVE_INFINITY;
    if (elapsedMs < intervalMs) return intervalMs - elapsedMs;
  }

  return 0;
}

export function nextEligibilityDelayMs(instances, preferredId = null, options = {}) {
  const excludedIds = new Set(options.excludeIds || []);
  let candidates = instances.filter((instance) => !excludedIds.has(instance.id));

  if (preferredId && !options.fallbackAllowed) {
    candidates = candidates.filter((instance) => instance.id === preferredId);
  } else if (preferredId && options.fallbackAllowed) {
    const preferred = candidates.find((instance) => instance.id === preferredId);
    candidates = preferred
      ? [preferred, ...candidates.filter((instance) => instance.id !== preferredId)]
      : candidates;
  }

  const delays = candidates
    .map((instance) => eligibilityDelayMs(instance, options))
    .filter((delay) => delay !== null);

  if (!delays.length) return null;
  return Math.min(...delays);
}
