import pg from "pg";

const { Pool } = pg;
const RETENTION_LIMIT = 5000;

const tables = {
  instances: "v3_router_instances",
  messages: "v3_router_messages",
  events: "v3_router_events",
  users: "v3_router_users",
  workspaces: "v3_router_workspaces",
  members: "v3_router_workspace_members",
  apiKeys: "v3_router_api_keys",
  verifications: "v3_router_verifications",
  settings: "v3_router_settings"
};

const initialData = {
  instances: [],
  messages: [],
  events: [],
  users: [],
  workspaces: [],
  members: [],
  apiKeys: [],
  verifications: [],
  settings: []
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

    const [instances, messages, events, users, workspaces, members, apiKeys, verifications, settings] = await Promise.all([
      selectAll(this.pool, tables.instances),
      selectRecent(this.pool, tables.messages),
      selectRecent(this.pool, tables.events),
      selectAll(this.pool, tables.users),
      selectAll(this.pool, tables.workspaces),
      selectAll(this.pool, tables.members),
      selectAll(this.pool, tables.apiKeys),
      selectRecent(this.pool, tables.verifications),
      selectAll(this.pool, tables.settings)
    ]);

    this.data = {
      instances,
      messages,
      events,
      users,
      workspaces,
      members,
      apiKeys,
      verifications,
      settings
    };
  }

  async ensureSchema() {
    await this.pool.query(`
      create table if not exists ${tables.instances} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.messages} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.events} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.users} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.workspaces} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.members} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.apiKeys} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.verifications} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create table if not exists ${tables.settings} (
        id text primary key,
        data jsonb not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );

      create index if not exists v3_router_instances_workspace_idx on ${tables.instances} ((data->>'workspace_id'));
      create index if not exists v3_router_messages_workspace_idx on ${tables.messages} ((data->>'workspace_id'));
      create index if not exists v3_router_messages_created_idx on ${tables.messages} ((data->>'created_at'));
      create index if not exists v3_router_messages_status_idx on ${tables.messages} ((data->>'status'));
      create index if not exists v3_router_users_phone_idx on ${tables.users} ((data->>'phone'));
      create index if not exists v3_router_api_keys_hash_idx on ${tables.apiKeys} ((data->>'key_hash'));
      create index if not exists v3_router_verifications_phone_idx on ${tables.verifications} ((data->>'phone'));
    `);
  }

  async save() {
    this.writeQueue = this.writeQueue.then(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("begin");
        for (const instance of this.data.instances) {
          await upsertJson(client, tables.instances, instance.id, instance);
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

  listInstances(workspaceId = null) {
    return this.data.instances.filter((instance) => !workspaceId || instance.workspace_id === workspaceId);
  }

  findInstance(id, workspaceId = null) {
    return this.data.instances.find((instance) => instance.id === id && (!workspaceId || instance.workspace_id === workspaceId));
  }

  async upsertInstance(instance) {
    const index = this.data.instances.findIndex((item) => item.id === instance.id);
    const payload = { ...instance, updated_at: new Date().toISOString() };

    if (index >= 0) {
      this.data.instances[index] = { ...this.data.instances[index], ...payload };
    } else {
      this.data.instances.push(payload);
    }

    await upsertJson(this.pool, tables.instances, payload.id, this.data.instances.find((item) => item.id === payload.id));
    return payload;
  }

  async deleteInstance(id, workspaceId = null) {
    const before = this.data.instances.length;
    this.data.instances = this.data.instances.filter((instance) => instance.id !== id || (workspaceId && instance.workspace_id !== workspaceId));
    await this.pool.query(`delete from ${tables.instances} where id = $1 and ($2::text is null or data->>'workspace_id' = $2)`, [id, workspaceId]);
    return before !== this.data.instances.length;
  }

  listMessages(limit = 100, workspaceId = null) {
    return this.data.messages
      .filter((message) => !workspaceId || message.workspace_id === workspaceId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, limit);
  }

  async addMessage(message) {
    this.data.messages.push(message);
    if (this.data.messages.length > RETENTION_LIMIT) {
      this.data.messages = this.data.messages.slice(-RETENTION_LIMIT);
    }
    await upsertJson(this.pool, tables.messages, message.id, message);
    await deleteOldRows(this.pool, tables.messages, RETENTION_LIMIT);
    return message;
  }

  async updateMessage(id, patch) {
    const message = this.data.messages.find((item) => item.id === id);
    if (!message) return null;
    Object.assign(message, patch, { updated_at: new Date().toISOString() });
    await upsertJson(this.pool, tables.messages, message.id, message);
    return message;
  }

  async addEvent(event) {
    this.data.events.push(event);
    if (this.data.events.length > RETENTION_LIMIT) {
      this.data.events = this.data.events.slice(-RETENTION_LIMIT);
    }
    await upsertJson(this.pool, tables.events, event.id, event);
    await deleteOldRows(this.pool, tables.events, RETENTION_LIMIT);
    return event;
  }

  listUsers() {
    return [...this.data.users].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  findUser(id) {
    return this.data.users.find((user) => user.id === id);
  }

  findUserByPhone(phone) {
    return this.data.users.find((user) => user.phone === phone);
  }

  async upsertUser(user) {
    return this.upsertCollection("users", tables.users, user);
  }

  listWorkspaces(userId = null) {
    if (!userId) return [...this.data.workspaces].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    const ids = new Set(this.data.members.filter((member) => member.user_id === userId).map((member) => member.workspace_id));
    return this.data.workspaces.filter((workspace) => ids.has(workspace.id));
  }

  findWorkspace(id) {
    return this.data.workspaces.find((workspace) => workspace.id === id);
  }

  async upsertWorkspace(workspace) {
    return this.upsertCollection("workspaces", tables.workspaces, workspace);
  }

  async upsertMember(member) {
    return this.upsertCollection("members", tables.members, member);
  }

  listApiKeys(workspaceId = null) {
    return this.data.apiKeys.filter((key) => !workspaceId || key.workspace_id === workspaceId);
  }

  findApiKeyByHash(keyHash) {
    return this.data.apiKeys.find((key) => key.key_hash === keyHash && key.status !== "revoked");
  }

  async upsertApiKey(apiKey) {
    return this.upsertCollection("apiKeys", tables.apiKeys, apiKey);
  }

  listVerifications(phone = null) {
    return this.data.verifications
      .filter((item) => !phone || item.phone === phone)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  }

  async upsertVerification(verification) {
    const saved = await this.upsertCollection("verifications", tables.verifications, verification);
    await deleteOldRows(this.pool, tables.verifications, RETENTION_LIMIT);
    return saved;
  }

  getSetting(id) {
    return this.data.settings.find((setting) => setting.id === id)?.value || null;
  }

  async setSetting(id, value) {
    const setting = {
      id,
      value,
      updated_at: new Date().toISOString(),
      created_at: this.data.settings.find((item) => item.id === id)?.created_at || new Date().toISOString()
    };
    return this.upsertCollection("settings", tables.settings, setting);
  }

  async upsertCollection(collection, table, payload) {
    const now = new Date().toISOString();
    const index = this.data[collection].findIndex((item) => item.id === payload.id);
    const saved = {
      ...payload,
      created_at: payload.created_at || (index >= 0 ? this.data[collection][index].created_at : now),
      updated_at: now
    };

    if (index >= 0) {
      this.data[collection][index] = { ...this.data[collection][index], ...saved };
    } else {
      this.data[collection].push(saved);
    }

    await upsertJson(this.pool, table, saved.id, saved);
    return saved;
  }
}

async function selectAll(clientOrPool, table) {
  const result = await clientOrPool.query(`select data from ${table} order by coalesce(data->>'created_at', '') asc`);
  return result.rows.map((row) => row.data);
}

async function selectRecent(clientOrPool, table) {
  const result = await clientOrPool.query(`
    select data from (
      select data from ${table}
      order by coalesce(data->>'created_at', '') desc
      limit $1
    ) recent
    order by coalesce(data->>'created_at', '') asc
  `, [RETENTION_LIMIT]);
  return result.rows.map((row) => row.data);
}

async function deleteOldRows(clientOrPool, table, limit) {
  await clientOrPool.query(
    `delete from ${table}
     where id in (
       select id from ${table}
       order by coalesce(data->>'created_at', '') desc
       offset $1
     )`,
    [limit]
  );
}

async function upsertJson(clientOrPool, table, id, payload) {
  await clientOrPool.query(
    `insert into ${table} (id, data, created_at, updated_at)
     values ($1, $2::jsonb, coalesce(($2::jsonb->>'created_at')::timestamptz, now()), now())
     on conflict (id) do update set data = excluded.data, updated_at = now()`,
    [id, json(payload)]
  );
}
