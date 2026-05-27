import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../src/config.js";
import { PostgresStore } from "../src/postgres-store.js";

if (!config.databaseUrl) {
  console.error("DATABASE_URL ausente. Configure o .env antes de migrar.");
  process.exit(1);
}

const file = path.resolve(config.dataFile);
const raw = await fs.readFile(file, "utf8");
const parsed = JSON.parse(raw);

const store = new PostgresStore({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl
});

await store.load();
store.data = {
  instances: Array.isArray(parsed.instances) ? parsed.instances : [],
  messages: Array.isArray(parsed.messages) ? parsed.messages : [],
  events: Array.isArray(parsed.events) ? parsed.events : []
};
await store.save();
await store.pool.end();

console.log(JSON.stringify({
  ok: true,
  source: file,
  migrated: {
    instances: store.data.instances.length,
    messages: store.data.messages.length,
    events: store.data.events.length
  }
}, null, 2));
