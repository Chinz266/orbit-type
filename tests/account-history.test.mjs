import test from 'node:test';
import assert from 'node:assert/strict';
import { AccountHistory, mergeHistory, toDatabase } from '../dist/account-history.js';
import { validConfig } from '../dist/auth-config.js';

const row = (id = 'round-1') => ({ id, endedAt: '2026-11-06T08:00:00Z', language: 'th', level: 'words', category: 'สัตว์', categoryId: 'animals', mode: 'practice', seconds: 60, score: 10, hits: 5, errors: 1, targets: 1, mistakes: [{word:'กา',position:0,expected:'ก',typed:'ข'}] });
const memory = () => { const m = new Map(); return { getItem: k => m.get(k), setItem: (k,v) => m.set(k,v) }; };
function mockClient() {
  const remote = new Map(); let fail = false;
  return { remote, set fail(v) { fail=v; }, from() {
    let uid;
    const query = {
      async upsert(rows) { if (fail) return {error:Error('offline')}; for(const r of rows)remote.set(`${r.user_id}:${r.id}`,r); return {error:null}; },
      select() { return query; }, eq(k,v) {uid=v;return query;}, order(){return query;},
      async range(start,end) {return fail?{error:Error('offline')}:{data:[...remote.values()].filter(r=>r.user_id===uid).slice(start,end+1),error:null};}
    }; return query;
  }};
}
test('guest import is explicit, idempotent, and account histories stay separate', async () => {
  const storage=memory(), client=mockClient(), store=new AccountHistory({storage,client});
  store.add(row()); store.setUser('alice'); await store.sync(); assert.equal(store.rows().length,0);
  await store.importGuest(); await store.importGuest(); assert.equal(store.rows().length,1);assert.equal(client.remote.size,1);
  store.setUser('bob'); await store.sync();assert.equal(store.rows().length,0);
  store.setUser(null);assert.equal(store.rows().length,1);
  const restored=new AccountHistory({storage,client});restored.setUser('alice');await restored.sync();assert.equal(restored.rows()[0].categoryId,'animals');
});
test('offline rounds survive reload and retries do not duplicate records', async () => {
  const storage=memory(),client=mockClient();client.fail=true;
  const store=new AccountHistory({storage,client});store.setUser('alice');store.add(row());await store.sync();
  assert.equal(store.status,'error');assert.deepEqual(store.read('alice').pending,['round-1']);
  client.fail=false;const restored=new AccountHistory({storage,client});restored.setUser('alice');await restored.sync();await restored.sync();
  assert.equal(restored.status,'synced');assert.equal(client.remote.size,1);assert.deepEqual(restored.read('alice').pending,[]);
});
test('in-flight reads cannot display another account after switching', async () => {
  const client=mockClient();let resolve;
  client.from=()=>{const q={select(){return q;},eq(){return q;},order(){return q;},range(){return new Promise(r=>resolve=r);}};return q;};
  const store=new AccountHistory({storage:memory(),client});store.setUser('alice');const old=store.sync();await Promise.resolve();
  store.setUser(null);resolve({data:[toDatabase(row(),'alice')],error:null});await old;
  assert.equal(store.userId,null);assert.equal(store.rows().length,0);assert.equal(store.status,'guest');
});
test('history fetch continues past the API page size', async () => {
  const client=mockClient();for(let i=0;i<1201;i++)client.remote.set(`alice:${i}`,toDatabase(row(String(i)),'alice'));
  const store=new AccountHistory({storage:memory(),client});store.setUser('alice');await store.sync();assert.equal(store.rows().length,1201);
});
test('storage failures preserve the round in memory and report the failure', () => {
  const storage={getItem(){throw Error();},setItem(){throw Error();}},store=new AccountHistory({storage});
  store.add(row());assert.equal(store.rows().length,1);assert.equal(store.storageOK,false);
});
test('deduplication and config validation reject server secrets', () => {
  assert.equal(mergeHistory([row()],[row()]).length,1);
  assert.equal(validConfig({url:'https://example.supabase.co',publishableKey:'sb_publishable_example'}),true);
  assert.equal(validConfig({url:'https://example.supabase.co',publishableKey:'sb_secret_example'}),false);
  const token=role=>`e30.${btoa(JSON.stringify({role}))}.signature`;
  assert.equal(validConfig({url:'https://example.supabase.co',publishableKey:token('anon')}),true);
  assert.equal(validConfig({url:'https://example.supabase.co',publishableKey:token('service_role')}),false);
  assert.equal(validConfig({url:'http://example.supabase.co',publishableKey:'sb_publishable_example'}),false);
});
