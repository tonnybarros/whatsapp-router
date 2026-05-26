import fs from "node:fs/promises";
import path from "node:path";

const initialData = {
  instances: [],
  messages: [],
  events: []
};

export class JsonStore {
  constructor(file) {
    this.file = path.resolve(file);
    this.data = structuredClone(initialData);
    this.writeQueue = Promise.resolve();
  }

  async load() {
    await fs.mkdir(path.dirname(this.file), { recursive: true });

    try {
      const raw = await fs.readFile(this.file, "utf8");
      const parsed = JSON.parse(raw);
      this.data = {
        instances: Array.isArray(parsed.instances) ? parsed.instances : [],
        messages: Array.isArray(parsed.messages) ? parsed.messages : [],
        events: Array.isArray(parsed.events) ? parsed.events : []
      };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      await this.save();
    }
  }

  async save() {
    this.writeQueue = this.writeQueue.then(async () => {
      const tmp = `${this.file}.tmp`;
      await fs.writeFile(tmp, `${JSON.stringify(this.data, null, 2)}\n`);
      await fs.rename(tmp, this.file);
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

    await this.save();
    return instance;
  }

  async deleteInstance(id) {
    const before = this.data.instances.length;
    this.data.instances = this.data.instances.filter((instance) => instance.id !== id);
    await this.save();
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
    await this.save();
    return message;
  }

  async updateMessage(id, patch) {
    const message = this.data.messages.find((item) => item.id === id);
    if (!message) return null;
    Object.assign(message, patch, { updated_at: new Date().toISOString() });
    await this.save();
    return message;
  }

  async addEvent(event) {
    this.data.events.push(event);
    if (this.data.events.length > 5000) {
      this.data.events = this.data.events.slice(-5000);
    }
    await this.save();
    return event;
  }
}
