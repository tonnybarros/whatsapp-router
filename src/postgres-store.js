import pg from "pg";

const { Pool } = pg;

const initialData = {
  instances: [],
  messages: [],
  events: []
};

function cloneInitialData() {
  return structuredClone(initialData);
}

function json(value) {
  return JSON.stringify(value);
}

export class PostgresStore {
  constructor(options = {}) {
    if (!options.connectionString) {
      throw new Error("DATABASE_URL ausente para STORE_DRIVER=postgres");
    }

    this.pool = new Pool({
      connectionString: options.connectionString,
      ssl: options.ssl ? { rejectUnauthorized: false } : undefined
    });
    this.data = cloneInitialData();
    this.writeQueue = Promise.resolve();
  }

  async load() {
    await this.ensureSchema();

    const [instances, messages, events] = await Promise.all([
      this.pool.query("select data from router_instances order by coalesce(data->>'created_at', '') asc"),
      this.pool.query("select data from router_messages order by coalesce(data->>'created_at', '') asc"),
      this.pool.query("select data from router_events order by coalesce(data->>'created_at', '') asc")
    ]);

    this.data = {
      instances: instances.rows.map((row) => row.data),
      messages: messages.rows.map((row) => row.data),
      events: events.rows.map((row) => row.data)
    };
  }

  async ensureSchema() {
    await this.pool.query(`
      create table if not exists router_instances (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists router_messages (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists router_events (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists router_messages_created_idx on router_messages ((data->>'created_at'));
      create index if not exists router_messages_status_idx on router_messages ((data->>'status'));
      create index if not exists router_messages_external_id_idx on router_messages ((data->>'external_id'));
      create index if not exists router_events_created_idx on router_events ((data->>'created_at'));
    `);
  }

  async save() {
    this.writeQueue = this.writeQueue.then(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("begin");
        for (const instance of this.data.instances) {
          await upsertJson(client, "router_instances", instance.id, instance);
        }
        for (const message of this.data.messages) {
          await upsertJson(client, "router_messages", message.id, message);
        }
        for (const event of this.data.events) {
          await upsertJson(client, "router_events", event.id, event);
        }
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    });

    return this.writeQueue;
  }

  listInstances() {
    return this.data.instances;
  }

  findInstance(id) {
    return this.data.instances.find((instance) => instance.id === id);
  }

  async upsertInstance(instance) {
    const index = this.data.instances.findIndex((item) => item.id === instance.id);

    if (index >= 0) {
      this.data.instances[index] = { ...this.data.instances[index], ...instance, updated_at: new Date().toISOString() };
    } else {
      this.data.instances.push(instance);
    }

    await upsertJson(this.pool, "router_instances", instance.id, this.data.instances.find((item) => item.id === instance.id));
    return instance;
  }

  async deleteInstance(id) {
    const before = this.data.instances.length;
    this.data.instances = this.data.instances.filter((instance) => instance.id !== id);
    await this.pool.query("delete from router_instances where id = $1", [id]);
    return before !== this.data.instances.length;
  }

  listMessages(limit = 100) {
    return [...this.data.messages]
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }

  async addMessage(message) {
    this.data.messages.push(message);
    if (this.data.messages.length > 5000) {
      this.data.messages = this.data.messages.slice(-5000);
    }
    await upsertJson(this.pool, "router_messages", message.id, message);
    return message;
  }

  async updateMessage(id, patch) {
    const message = this.data.messages.find((item) => item.id === id);
    if (!message) return null;
    Object.assign(message, patch, { updated_at: new Date().toISOString() });
    await upsertJson(this.pool, "router_messages", message.id, message);
    return message;
  }

  async addEvent(event) {
    this.data.events.push(event);
    if (this.data.events.length > 5000) {
      this.data.events = this.data.events.slice(-5000);
    }
    await upsertJson(this.pool, "router_events", event.id, event);
    return event;
  }
}

async function upsertJson(clientOrPool, table, id, payload) {
  await clientOrPool.query(
    `insert into ${table} (id, data, created_at, updated_at)
     values ($1, $2::jsonb, coalesce(($2::jsonb->>'created_at')::timestamptz, now()), now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [id, json(payload)]
  );
}
