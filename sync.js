/**
 * Plan 2D — Zeus/Ebby live prefs sync (build t656+).
 * Client + wire only. Soft stands the Cloudflare Worker separately.
 *
 * Soft flip (SaiD zero-touch; Al never hunts keys):
 *   window.__PLAN2D_SYNC__ = 'https://<soft-worker>'
 *   or <meta name="plan2d-sync" content="https://<soft-worker>" />
 * Empty / unset = localStorage-only. No crash if Worker is down.
 *
 * Cache keys (unchanged):
 *   plan2d-rail-field-order  — { "5": string[], "6": string[] }
 *   plan2d-field-type-v1     — { "5:client": {px,bold}, … }  (same shape on the wire)
 */
(function (root) {
  'use strict';

  var ORDER_KEY = 'plan2d-rail-field-order';
  var TYPE_KEY = 'plan2d-field-type-v1';
  var REV_KEY = 'plan2d-sync-rev-v1';
  var OWNER_BY_PANE = { '5': 'zeus', '6': 'ebby' };
  var PANE_OF = { zeus: '5', ebby: '6' };
  var OWNERS = ['zeus', 'ebby'];
  var PUT_DEBOUNCE_MS = 160;
  var WS_BACKOFF_MAX_MS = 30000;

  var applying = false;
  var sockets = {};
  var backoff = { zeus: 1000, ebby: 1000 };
  var putTimer = { zeus: 0, ebby: 0 };
  var started = false;

  function workerBase() {
    var w = root.__PLAN2D_SYNC__;
    if (typeof w === 'string' && w.trim()) return w.replace(/\/$/, '');
    if (typeof document !== 'undefined') {
      var meta = document.querySelector('meta[name="plan2d-sync"]');
      var c = meta && meta.getAttribute('content');
      if (c && String(c).trim()) return String(c).trim().replace(/\/$/, '');
    }
    return '';
  }

  function enabled() { return !!workerBase(); }

  function readJson(key, fallback) {
    try {
      var raw = root.localStorage && localStorage.getItem(key);
      if (!raw) return fallback;
      var v = JSON.parse(raw);
      return v == null ? fallback : v;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function getRevs() {
    var m = readJson(REV_KEY, {});
    return (m && typeof m === 'object') ? m : {};
  }

  function setRev(owner, rev) {
    var m = getRevs();
    m[owner] = Number(rev) || 0;
    writeJson(REV_KEY, m);
  }

  function getRev(owner) {
    return Number(getRevs()[owner]) || 0;
  }

  function paneTypes(map, paneId) {
    var prefix = paneId + ':';
    var out = {};
    if (!map || typeof map !== 'object') return out;
    Object.keys(map).forEach(function (k) {
      if (k.indexOf(prefix) === 0) out[k] = map[k];
    });
    return out;
  }

  function replacePaneTypes(fullMap, paneId, remoteTypes) {
    var prefix = paneId + ':';
    var next = {};
    if (fullMap && typeof fullMap === 'object') {
      Object.keys(fullMap).forEach(function (k) {
        if (k.indexOf(prefix) !== 0) next[k] = fullMap[k];
      });
    }
    var src = remoteTypes && typeof remoteTypes === 'object' ? remoteTypes : {};
    Object.keys(src).forEach(function (k) {
      var key = k.indexOf(':') >= 0 ? k : (prefix + k);
      next[key] = src[k];
    });
    return next;
  }

  function snapshot(owner) {
    var paneId = PANE_OF[owner];
    var orderMap = readJson(ORDER_KEY, {});
    var typeMap = readJson(TYPE_KEY, {});
    var order = (paneId && orderMap[paneId]) || [];
    return {
      owner: owner,
      order: Array.isArray(order) ? order.slice() : [],
      types: paneTypes(typeMap, paneId),
      rev: getRev(owner)
    };
  }

  function isEmptyPrefs(p) {
    if (!p) return true;
    var types = p.types && typeof p.types === 'object' ? p.types : {};
    var order = Array.isArray(p.order) ? p.order : [];
    return (Number(p.rev) || 0) === 0 && !order.length && !Object.keys(types).length;
  }

  function normalizeRemote(owner, data) {
    if (!data || typeof data !== 'object') {
      return { owner: owner, order: [], types: {}, rev: 0 };
    }
    return {
      owner: data.owner || owner,
      order: Array.isArray(data.order) ? data.order : [],
      types: data.types && typeof data.types === 'object' ? data.types : {},
      rev: Number(data.rev) || 0,
      updatedAt: data.updatedAt
    };
  }

  function applyRemote(owner, payload) {
    var paneId = PANE_OF[owner];
    if (!paneId || !payload) return;
    applying = true;
    try {
      var orderMap = readJson(ORDER_KEY, {});
      orderMap[paneId] = Array.isArray(payload.order) ? payload.order.slice() : [];
      writeJson(ORDER_KEY, orderMap);
      if (typeof root.__plan2dApplyRailOrder === 'function') {
        root.__plan2dApplyRailOrder(paneId, orderMap[paneId]);
      }
      var typeMap = readJson(TYPE_KEY, {});
      writeJson(TYPE_KEY, replacePaneTypes(typeMap, paneId, payload.types || {}));
      if (typeof root.__plan2dRefreshFieldTypes === 'function') {
        root.__plan2dRefreshFieldTypes();
      }
      setRev(owner, payload.rev);
    } finally {
      applying = false;
    }
  }

  function shouldIgnoreEcho(owner, rev) {
    var incoming = Number(rev) || 0;
    return incoming > 0 && incoming <= getRev(owner);
  }

  function wsUrl(base, owner) {
    return base.replace(/^http/i, 'ws') + '/ws?owner=' + encodeURIComponent(owner);
  }

  async function getPrefs(owner) {
    var base = workerBase();
    if (!base) return null;
    try {
      var res = await fetch(base + '/prefs/' + encodeURIComponent(owner));
      if (res.status === 404) return normalizeRemote(owner, null);
      if (!res.ok) return null;
      var text = await res.text();
      if (!text || !String(text).trim()) return normalizeRemote(owner, null);
      var data;
      try { data = JSON.parse(text); } catch (e) { return normalizeRemote(owner, null); }
      return normalizeRemote(owner, data);
    } catch (e) {
      return null;
    }
  }

  async function putPrefs(owner) {
    var base = workerBase();
    if (!base || applying) return;
    var body = snapshot(owner);
    try {
      var res = await fetch(base + '/prefs/' + encodeURIComponent(owner), {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ order: body.order, types: body.types, rev: body.rev })
      });
      if (!res.ok) return;
      var data;
      try { data = await res.json(); } catch (e) { return; }
      if (data && data.rev != null) setRev(owner, data.rev);
    } catch (e) {}
  }

  function schedulePut(owner) {
    if (!enabled() || applying) return;
    if (putTimer[owner]) clearTimeout(putTimer[owner]);
    putTimer[owner] = setTimeout(function () {
      putTimer[owner] = 0;
      putPrefs(owner);
    }, PUT_DEBOUNCE_MS);
  }

  function onLocalPrefChange(owner) {
    if (applying) return;
    if (owner !== 'zeus' && owner !== 'ebby') {
      owner = OWNER_BY_PANE[owner] || owner;
    }
    if (owner !== 'zeus' && owner !== 'ebby') return;
    schedulePut(owner);
  }

  async function pullOwner(owner) {
    var remote = await getPrefs(owner);
    if (remote === null) return;
    if (isEmptyPrefs(remote)) {
      if (!isEmptyPrefs(snapshot(owner))) await putPrefs(owner);
      return;
    }
    applyRemote(owner, remote);
  }

  function onWsMessage(owner, raw) {
    var msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || msg.type !== 'prefs') return;
    if (msg.owner && msg.owner !== owner) return;
    if (shouldIgnoreEcho(owner, msg.rev)) return;
    applyRemote(owner, normalizeRemote(owner, msg));
  }

  function closeSocket(owner) {
    var s = sockets[owner];
    sockets[owner] = null;
    if (!s) return;
    try { s.onclose = null; s.onerror = null; s.onmessage = null; s.close(); } catch (e) {}
  }

  function subscribeOwner(owner) {
    var base = workerBase();
    if (!base) return;
    closeSocket(owner);
    var sock;
    try { sock = new WebSocket(wsUrl(base, owner)); } catch (e) { return; }
    sockets[owner] = sock;
    sock.onmessage = function (ev) { onWsMessage(owner, ev.data); };
    sock.onopen = function () { backoff[owner] = 1000; };
    sock.onerror = function () {};
    sock.onclose = function () {
      if (sockets[owner] !== sock) return;
      sockets[owner] = null;
      if (!enabled()) return;
      var wait = backoff[owner] || 1000;
      backoff[owner] = Math.min(wait * 2, WS_BACKOFF_MAX_MS);
      setTimeout(function () { if (enabled()) subscribeOwner(owner); }, wait);
    };
  }

  function stop() {
    OWNERS.forEach(closeSocket);
    OWNERS.forEach(function (o) {
      if (putTimer[o]) { clearTimeout(putTimer[o]); putTimer[o] = 0; }
    });
    started = false;
  }

  function start() {
    root.__plan2dOnLocalPrefChange = onLocalPrefChange;
    if (!enabled()) return;
    started = true;
    OWNERS.forEach(function (owner) {
      pullOwner(owner);
      subscribeOwner(owner);
    });
  }

  function configure(url) {
    root.__PLAN2D_SYNC__ = url ? String(url) : '';
    stop();
    start();
  }

  var api = {
    ORDER_KEY: ORDER_KEY,
    TYPE_KEY: TYPE_KEY,
    OWNER_BY_PANE: OWNER_BY_PANE,
    PANE_OF: PANE_OF,
    workerBase: workerBase,
    enabled: enabled,
    paneTypes: paneTypes,
    replacePaneTypes: replacePaneTypes,
    snapshot: snapshot,
    isEmptyPrefs: isEmptyPrefs,
    normalizeRemote: normalizeRemote,
    shouldIgnoreEcho: shouldIgnoreEcho,
    wsUrl: wsUrl,
    applyRemote: applyRemote,
    getPrefs: getPrefs,
    putPrefs: putPrefs,
    onLocalPrefChange: onLocalPrefChange,
    configure: configure,
    start: start,
    stop: stop
  };

  root.Plan2dSync = api;
  root.__plan2dOnLocalPrefChange = onLocalPrefChange;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
