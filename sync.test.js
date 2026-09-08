'use strict';
/** Node contract checks for Zeus/Ebby live sync (no DOM). */
const store = {};
global.localStorage = {
  getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
  setItem(k, v) { store[k] = String(v); },
  removeItem(k) { delete store[k]; }
};
global.window = global;
global.__PLAN2D_SYNC__ = '';

require('./sync.js');
const S = global.Plan2dSync;
const assert = require('assert');

function reset() {
  Object.keys(store).forEach(k => delete store[k]);
  global.__PLAN2D_SYNC__ = '';
}

reset();
assert.strictEqual(S.OWNER_BY_PANE['5'], 'zeus');
assert.strictEqual(S.OWNER_BY_PANE['6'], 'ebby');
assert.strictEqual(S.PANE_OF.zeus, '5');
assert.strictEqual(S.PANE_OF.ebby, '6');
assert.strictEqual(S.enabled(), false);
assert.strictEqual(S.workerBase(), '');

global.__PLAN2D_SYNC__ = 'https://sync.example/';
assert.strictEqual(S.workerBase(), 'https://sync.example');
assert.strictEqual(S.enabled(), true);
assert.strictEqual(S.wsUrl(S.workerBase(), 'zeus'), 'wss://sync.example/ws?owner=zeus');
assert.strictEqual(S.wsUrl('http://localhost:8787', 'ebby'), 'ws://localhost:8787/ws?owner=ebby');

const empty = S.normalizeRemote('zeus', null);
assert.deepStrictEqual(empty, { owner: 'zeus', order: [], types: {}, rev: 0 });
assert.strictEqual(S.isEmptyPrefs(empty), true);
assert.strictEqual(S.isEmptyPrefs(S.normalizeRemote('ebby', {})), true);

const remote = S.normalizeRemote('zeus', {
  owner: 'zeus', order: ['date', 'client'], types: { '5:client': { px: 16, bold: false } }, rev: 4, updatedAt: 't'
});
assert.strictEqual(remote.rev, 4);
assert.deepStrictEqual(remote.order, ['date', 'client']);
assert.strictEqual(S.isEmptyPrefs(remote), false);
assert.strictEqual(S.isEmptyPrefs({ owner: 'zeus', order: [], types: {}, rev: 2 }), false);

localStorage.setItem(S.REV_KEY || 'plan2d-sync-rev-v1', JSON.stringify({ zeus: 4 }));
assert.strictEqual(S.shouldIgnoreEcho('zeus', 4), true);
assert.strictEqual(S.shouldIgnoreEcho('zeus', 3), true);
assert.strictEqual(S.shouldIgnoreEcho('zeus', 5), false);
assert.strictEqual(S.shouldIgnoreEcho('ebby', 1), false);

const merged = S.replacePaneTypes(
  { '5:client': { px: 13, bold: true }, '1:style': { px: 12, bold: true }, '6:tools': { px: 11, bold: false } },
  '5',
  { client: { px: 18, bold: false }, '5:style': { px: 14, bold: true } }
);
assert.deepStrictEqual(merged['1:style'], { px: 12, bold: true });
assert.deepStrictEqual(merged['6:tools'], { px: 11, bold: false });
assert.deepStrictEqual(merged['5:client'], { px: 18, bold: false });
assert.deepStrictEqual(merged['5:style'], { px: 14, bold: true });

const extracted = S.paneTypes({ '5:client': { px: 13, bold: true }, '6:style': { px: 12, bold: true } }, '5');
assert.deepStrictEqual(extracted, { '5:client': { px: 13, bold: true } });

localStorage.setItem(S.ORDER_KEY, JSON.stringify({ '5': ['room', 'date'], '6': ['client'] }));
localStorage.setItem(S.TYPE_KEY, JSON.stringify({ '5:client': { px: 15, bold: true }, '1:x': { px: 13, bold: true } }));
const snap = S.snapshot('zeus');
assert.deepStrictEqual(snap.order, ['room', 'date']);
assert.deepStrictEqual(snap.types, { '5:client': { px: 15, bold: true } });
assert.strictEqual(snap.owner, 'zeus');

S.applyRemote('ebby', { order: ['people', 'style'], types: { '6:add': { px: 12, bold: false } }, rev: 9 });
assert.deepStrictEqual(JSON.parse(localStorage.getItem(S.ORDER_KEY))['6'], ['people', 'style']);
assert.deepStrictEqual(JSON.parse(localStorage.getItem(S.TYPE_KEY))['6:add'], { px: 12, bold: false });
assert.deepStrictEqual(JSON.parse(localStorage.getItem(S.TYPE_KEY))['5:client'], { px: 15, bold: true });
assert.strictEqual(S.shouldIgnoreEcho('ebby', 9), true);

// GET /prefs: 404 + empty → {order:[], types:{}, rev:0}; network fail → null
global.__PLAN2D_SYNC__ = 'https://sync.example';
const calls = [];
global.fetch = async function (url, opts) {
  calls.push({ url, opts });
  if (String(url).endsWith('/prefs/zeus') && (!opts || !opts.method || opts.method === 'GET')) {
    return { status: 404, ok: false, text: async () => '', json: async () => ({}) };
  }
  if (String(url).endsWith('/prefs/ebby') && opts && opts.method === 'PUT') {
    const body = JSON.parse(opts.body);
    assert.ok(Array.isArray(body.order));
    assert.ok(body.types && typeof body.types === 'object');
    return { status: 200, ok: true, json: async () => ({ rev: 1 }) };
  }
  if (String(url).endsWith('/prefs/ebby')) {
    return { status: 200, ok: true, text: async () => '', json: async () => ({}) };
  }
  throw new Error('offline');
};
S.getPrefs('zeus').then(async (z) => {
  assert.deepStrictEqual(z.order, []);
  assert.deepStrictEqual(z.types, {});
  assert.strictEqual(z.rev, 0);
  const e = await S.getPrefs('ebby');
  assert.strictEqual(S.isEmptyPrefs(e), true);
  const down = await S.getPrefs('missing-owner-path');
  assert.strictEqual(down, null);
  await S.putPrefs('ebby');
  const put = calls.find(c => c.opts && c.opts.method === 'PUT');
  assert.ok(put, 'PUT fired');
  assert.ok(String(put.url).endsWith('/prefs/ebby'));
  assert.strictEqual(S.shouldIgnoreEcho('ebby', 1), true);
  console.log('sync.test.js fetch ok');
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
