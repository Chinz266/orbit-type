import { loadHistory, saveHistory } from './history.js';

const uuid = () => crypto.randomUUID();
const sort = rows => rows.sort((a, b) => Date.parse(b.endedAt) - Date.parse(a.endedAt));
export function mergeHistory(...lists) {
  return sort([...new Map(lists.flat().map(row => [row.id, row])).values()]);
}
export function toDatabase(row, userId) {
  return { user_id: userId, id: row.id, ended_at: row.endedAt, language: row.language,
    level: row.level, category: row.category, category_id: row.categoryId || null, mode: row.mode,
    seconds: row.seconds, score: row.score, hits: row.hits, errors: row.errors,
    targets: row.targets, mistakes: row.mistakes };
}
export function fromDatabase(row) {
  return { id: row.id, endedAt: row.ended_at, language: row.language, level: row.level,
    category: row.category, categoryId: row.category_id, mode: row.mode, seconds: row.seconds,
    score: row.score, hits: row.hits, errors: row.errors, targets: row.targets, mistakes: row.mistakes };
}

export class AccountHistory {
  constructor({ client = null, storage, onChange = () => {}, makeId = uuid } = {}) {
    this.client = client; this.storage = storage; this.onChange = onChange; this.makeId = makeId;
    this.userId = null; this.epoch = 0; this.busy = null; this.status = 'guest'; this.storageOK = true;
    this.memory = new Map();
    this.guest = loadHistory(storage).map(r => ({ ...r, id: r.id || makeId() }));
    this.storageOK = saveHistory(this.guest, storage);
  }
  key(userId) { return `orbit-account-history-v1:${userId}`; }
  read(userId) {
    if (this.memory.has(userId)) return this.memory.get(userId);
    let state = { rows: [], pending: [] };
    try {
      const parsed = JSON.parse((this.storage || globalThis.localStorage).getItem(this.key(userId)) || 'null');
      if (parsed && Array.isArray(parsed.rows) && Array.isArray(parsed.pending)) {
        const rows = loadHistory({getItem: () => JSON.stringify(parsed.rows)}).filter(r => typeof r.id === 'string');
        state = { rows, pending: parsed.pending.filter(id => rows.some(r => r.id === id)) };
      }
    } catch { this.storageOK = false; }
    this.memory.set(userId, state); return state;
  }
  write(userId, state) {
    this.memory.set(userId, state);
    try { (this.storage || globalThis.localStorage).setItem(this.key(userId), JSON.stringify(state)); }
    catch { this.storageOK = false; }
  }
  rows() { return this.userId ? this.read(this.userId).rows : this.guest; }
  notify() { this.onChange(this.rows(), this.status, this.storageOK); }
  setUser(userId) {
    if (this.userId === userId) return;
    this.userId = userId; this.epoch++; this.busy = null;
    this.status = userId ? 'loading' : 'guest'; this.notify();
    if (userId) void this.sync();
  }
  add(record) {
    const row = { ...record, id: record.id || this.makeId() };
    if (!this.userId) {
      this.guest = mergeHistory(this.guest, [row]);
      if (!saveHistory(this.guest, this.storage)) this.storageOK = false;
    } else {
      const state = this.read(this.userId);
      this.write(this.userId, { rows: mergeHistory(state.rows, [row]), pending: [...new Set([...state.pending, row.id])] });
    }
    this.notify(); if (this.userId) void this.sync(); return row;
  }
  importGuest() {
    if (!this.userId) return;
    const state = this.read(this.userId), known = new Set(state.rows.map(r => r.id));
    const additions = this.guest.filter(r => !known.has(r.id));
    this.write(this.userId, { rows: mergeHistory(state.rows, additions), pending: [...new Set([...state.pending, ...additions.map(r => r.id)])] });
    this.notify(); return this.sync();
  }
  sync() {
    if (!this.client || !this.userId) return Promise.resolve();
    if (this.busy) return this.busy;
    const userId = this.userId, epoch = this.epoch, current = () => this.epoch === epoch;
    this.status = 'syncing'; this.notify();
    // Defer work so this.busy is assigned before even a synchronous mock resolves.
    const work = Promise.resolve().then(async () => {
      while (current() && this.read(userId).pending.length) {
        const state = this.read(userId), ids = state.pending.slice(0, 100);
        const batch = state.rows.filter(r => ids.includes(r.id)).map(r => toDatabase(r, userId));
        const { error } = await this.client.from('orbit_sessions').upsert(batch, { onConflict: 'user_id,id', ignoreDuplicates: true });
        if (error) throw error;
        if (!current()) return;
        const latest = this.read(userId);
        this.write(userId, { ...latest, pending: latest.pending.filter(id => !ids.includes(id)) });
      }
      let remote = [], offset = 0;
      while (current()) {
        const { data, error } = await this.client.from('orbit_sessions').select('*').eq('user_id', userId)
          .order('ended_at', { ascending: false }).order('id', { ascending: true }).range(offset, offset + 499);
        if (error) throw error;
        if (!current()) return;
        remote.push(...data.map(fromDatabase));
        if (data.length < 500) break;
        offset += data.length;
      }
      if (!current()) return;
      const latest = this.read(userId);
      this.write(userId, { ...latest, rows: mergeHistory(remote, latest.rows) });
      this.status = latest.pending.length ? 'pending' : 'synced';
    }).catch(() => { if (current()) this.status = 'error'; }).finally(() => {
      if (current()) {
        this.busy = null; this.notify();
        if (this.status === 'pending') void this.sync();
      }
    });
    this.busy = work; return work;
  }
}
