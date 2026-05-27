import "dotenv/config";
import crypto from "node:crypto";

export const config = {
  port: Number(process.env.PORT || 3025),
  host: process.env.HOST || "127.0.0.1",
  routerApiKey: process.env.ROUTER_API_KEY || crypto.randomBytes(32).toString("hex"),
  storeDriver: process.env.STORE_DRIVER || "auto",
  dataFile: process.env.DATA_FILE || "./data/router.json",
  databaseUrl: process.env.DATABASE_URL || "",
  databaseSsl: ["1", "true", "yes"].includes(String(process.env.DATABASE_SSL || "").toLowerCase()),
  defaultDailyLimit: Number(process.env.DEFAULT_DAILY_LIMIT || 50),
  defaultMinSecondsBetweenMessages: Number(process.env.DEFAULT_MIN_SECONDS_BETWEEN_MESSAGES || 60),
  defaultErrorCooldownSeconds: Number(process.env.DEFAULT_ERROR_COOLDOWN_SECONDS || 900),
  sendTimeoutMs: Number(process.env.SEND_TIMEOUT_MS || 30000),
  queuePollMs: Number(process.env.QUEUE_POLL_MS || 1000),
  queueMaxWaitMs: Number(process.env.QUEUE_MAX_WAIT_MS || 900000)
};
