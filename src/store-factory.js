import { JsonStore } from "./store.js";
import { PostgresStore } from "./postgres-store.js";

export function createStore(config) {
  const driver = config.storeDriver === "auto"
    ? config.databaseUrl ? "postgres" : "json"
    : config.storeDriver;

  if (driver === "postgres") {
    return new PostgresStore({
      connectionString: config.databaseUrl,
      ssl: config.databaseSsl
    });
  }

  if (driver === "json") {
    return new JsonStore(config.dataFile);
  }

  throw new Error(`STORE_DRIVER invalido: ${config.storeDriver}`);
}
