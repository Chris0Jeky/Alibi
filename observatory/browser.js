/* SPDX-License-Identifier: GPL-3.0-only
 * Pulseboard Observatory 0.1.0. Generated; see observatory.lock.json.
 * Disabled until endpoint is configured. No dynamic/CDN dependency. */
(function () {
'use strict';
/** Pulseboard Observatory 0.1.0. Content-free, closed event contract. */
const VERSION = 1;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = ['v', 'id', 'session', 'seq', 'event', 'route', 'release', 'value'];
function validateEvent(e, project) {
  if (!e || Object.getPrototypeOf(e) !== Object.prototype || Object.keys(e).some(k => !FIELDS.includes(k))) return false;
  return e.v === VERSION && typeof e.id === 'string' && typeof e.session === 'string' && UUID.test(e.id) && UUID.test(e.session)
    && Number.isSafeInteger(e.seq) && e.seq >= 1 && e.seq <= 1000000
    && project.events.includes(e.event) && project.routes.includes(e.route)
    && project.releases.includes(e.release)
    && (e.value === undefined || (project.measurements.includes(e.event)
      && typeof e.value === 'number' && Number.isFinite(e.value) && e.value >= 0 && e.value <= 3600000));
}

/** No DOM capture, URLs, storage, identity, network or timers before explicit consent. */
function createObserver(config, runtime = globalThis, onSelfRevoke = () => {}) {
  const { project, endpoint = '', origin, release = 'unattributed', route = 'home' } = config;
  let consent = false, disposed = false, epoch = 0, session = '', seq = 0, deadline = Infinity;
  let queue = [], timer = null, flight = null, lastEvent = 0, failures = 0, requests = 0, keepaliveBytes = 0;
  // unknown: events whose request timed out after it was issued; the collector may have admitted them.
  const stats = { sent: 0, dropped: 0, failures: 0, unknown: 0 };
  // Browsers refuse keepalive bodies beyond 64 KiB in flight per page.
  const KEEPALIVE_BUDGET = 65536;
  const privacy = () => runtime.navigator?.doNotTrack === '1' || runtime.navigator?.globalPrivacyControl === true;
  function eligible() {
    try {
      const url = new URL(endpoint);
      return !disposed && Date.now() < deadline && url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
        && runtime.location?.origin === origin && runtime.location.protocol === 'https:'
        && !runtime.navigator?.webdriver && !privacy() && typeof runtime.crypto?.randomUUID === 'function';
    } catch { return false; }
  }
  function clear() {
    epoch++; queue = []; session = ''; seq = 0;
    if (timer !== null) runtime.clearTimeout(timer);
    // An abort we cause (disposal, revocation, re-consent) is not a failed request.
    timer = null; if (flight) { flight.cancelled = true; flight.abort.abort(); }
  }
  function status() { return { active: consent && eligible(), queued: queue.length, requests, ...stats }; }
  function revoke() {
    if (!consent) return false;
    consent = false;
    clear();
    try { onSelfRevoke(status()); } catch { /* UI reconciliation must never weaken privacy revocation. */ }
    return true;
  }
  function schedule() {
    if (timer === null && consent && queue.length && !disposed) {
      timer = runtime.setTimeout(() => { timer = null; void flush(); }, 5000);
    }
  }
  /** until: optional consent deadline in epoch ms, re-checked before every send; an invalid one fails closed. */
  function setConsent(value, until = Infinity) {
    // Only a number (or the omitted default) is a deadline; a coercible string or NaN refuses consent.
    clear(); deadline = typeof until === 'number' && !Number.isNaN(until) ? until : -Infinity;
    consent = value === true && eligible(); failures = 0;
    // Request budget does not reset on consent toggles.
    if (consent) session = runtime.crypto.randomUUID();
    return consent;
  }
  function track(event, options = {}) {
    if (!consent || !eligible()) { if (consent) revoke(); return false; }
    const now = Date.now();
    if (lastEvent && now - lastEvent > 1800000) { session = runtime.crypto.randomUUID(); seq = 0; }
    lastEvent = now;
    const e = { v: 1, id: runtime.crypto.randomUUID(), session, seq: ++seq,
      event, route: options.route ?? route, release: options.release ?? release };
    if (options.value !== undefined) e.value = options.value;
    if (!validateEvent(e, project) || Object.keys(options).some(k => !['route', 'release', 'value'].includes(k))) { stats.dropped++; return false; }
    if (queue.length >= 100 || failures >= 3 || requests >= 120) { stats.dropped++; return false; }
    queue.push(e); schedule(); return true;
  }
  const post = (body, extra) => runtime.fetch(endpoint, { method: 'POST', credentials: 'omit',
    referrerPolicy: 'no-referrer', redirect: 'error', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body, ...extra });
  const encode = batch => JSON.stringify({ events: batch });
  // One outcome per batch however many attempts carry it: sent on the first success; otherwise unknown if an
  // attempt timed out after it was issued, or dropped, once every attempt has settled. A dropped batch is one
  // genuine failure for the circuit; a batch from an earlier generation (disposal, re-consent) counts for nothing.
  function settleBatch(record, outcome) {
    if (record.done) return;
    const counted = record.generation === epoch;
    if (outcome === 'ok') { record.done = true; if (counted) { stats.sent += record.batch.length; failures = 0; } return; }
    if (outcome === 'unknown') record.unknown = true;
    if (--record.attempts > 0) return;
    record.done = true;
    if (!counted) return;
    if (record.unknown) stats.unknown += record.batch.length;
    else { stats.dropped += record.batch.length; failures++; }
  }
  async function flush() {
    if (!eligible()) { revoke(); return; }
    if (flight || !consent || !queue.length || failures >= 3 || requests >= 120) return;
    const generation = epoch, batch = queue.splice(0, 20);
    const current = { abort: new runtime.AbortController(), batch, generation, attempts: 1, done: false, unknown: false, handed: false, timedOut: false };
    // A cold collector path can take over 5 s to admit the first batch of a page.
    const timeout = runtime.setTimeout(() => { current.timedOut = true; current.abort.abort(); }, requests === 0 ? 10000 : 5000);
    flight = current; requests++;
    try {
      const response = await post(encode(batch), { signal: current.abort.signal });
      if (!response.ok) throw new Error('collector');
      settleBatch(current, 'ok');
    } catch {
      // The request was issued; the collector may have admitted it. Unknown is not a failure and never trips the circuit.
      if (current.timedOut) settleBatch(current, 'unknown');
      else {
        if (!current.cancelled) stats.failures++;
        // Deliberately at-most-once: failed batches are dropped, never revived on re-consent.
        settleBatch(current, 'failed');
      }
    } finally {
      runtime.clearTimeout(timeout); if (flight === current) flight = null; schedule();
    }
  }
  /** Hands one batch to keepalive within the in-flight byte budget; false leaves it with the caller. */
  function handOver(record) {
    const body = encode(record.batch), bytes = new TextEncoder().encode(body).byteLength;
    if (keepaliveBytes + bytes > KEEPALIVE_BUDGET) return false;
    requests++; keepaliveBytes += bytes; record.attempts++;
    const settle = () => { keepaliveBytes -= bytes; };
    try {
      post(body, { keepalive: true })?.then?.(
        response => { settle(); if (!response?.ok) stats.failures++; settleBatch(record, response?.ok ? 'ok' : 'failed'); },
        () => { settle(); stats.failures++; settleBatch(record, 'failed'); });
    } catch { settle(); stats.failures++; settleBatch(record, 'failed'); }
    return true;
  }
  /** The page is being hidden and the timer will never fire: hand the rest of the queue over with keepalive.
   *  Deliberately not navigator.sendBeacon, which attaches cookies and cannot omit credentials. */
  function flushOnHide() {
    if (!consent || !eligible()) { if (consent) revoke(); return 0; }
    const generation = epoch; let handed = 0;
    // The batch in flight has left the queue and dispose() aborts it: reissue the same events, same IDs, with keepalive.
    // The collector ignores duplicate IDs, so each event is admitted at most once and sent at most twice.
    if (flight && !flight.handed && flight.generation === epoch && requests < 120 && handOver(flight)) {
      flight.handed = true; handed += flight.batch.length;
    }
    while (queue.length && failures < 3 && requests < 120) {
      const record = { batch: queue.slice(0, 20), generation, attempts: 0, done: false, unknown: false };
      if (!handOver(record)) break;
      queue.splice(0, record.batch.length); handed += record.batch.length;
    }
    return handed;
  }
  function dispose() { consent = false; disposed = true; clear(); }
  return { setConsent, track, flush, flushOnHide, dispose, status };
}

/** Optional UI facade. Loaded scripts stay inert until deployment configuration exists. */
function mountObserver(config, create, runtime = globalThis) {
  const { document, location, navigator } = runtime;
  if (!document || !config.endpoint || location?.origin !== config.origin || location.protocol !== 'https:') return null;
  if (!location.pathname.startsWith(config.scopePath || '/')) return null;
  if (navigator?.globalPrivacyControl || navigator?.doNotTrack === '1' || navigator?.webdriver) return null;
  try { const u = new URL(config.endpoint); if (u.protocol !== 'https:' || u.search || u.hash || u.username || u.password) return null; } catch { return null; }
  if (config.publicFlag && runtime[config.publicFlag.global]?.[config.publicFlag.key] !== config.publicFlag.expected) return null;
  let reconcile = () => {};
  const observer = create(config, runtime, () => reconcile());
  function hostContext() {
    if (!config.contextGlobal) return {};
    try {
      const provider = runtime[config.contextGlobal], value = typeof provider === 'function' ? provider() : provider;
      if (!value || Object.getPrototypeOf(value) !== Object.prototype) return {};
      return {
        ...(config.project.routes.includes(value.route) ? { route: value.route } : {}),
        ...(config.project.releases.includes(value.release) ? { release: value.release } : {}),
      };
    } catch { return {}; }
  }
  const track = (event, options = {}) => {
    const result = observer.status().active
      ? observer.track(event, { ...hostContext(), ...options })
      : observer.track(event, options);
    paint();
    return result;
  };
  const key = 'pulseboard:consent:v1:' + config.id + ':' + config.endpoint, CONSENT_MS = 90 * 86400000;
  let granted = false, overdue = false, until = 0;
  // A stored expiry is never trusted past 90 days from now; a tampered or corrupt one cannot grant indefinite consent.
  try {
    const stored = JSON.parse(runtime.localStorage.getItem(key) || 'null'), cap = Date.now() + CONSENT_MS;
    until = Number.isFinite(stored?.until) ? Math.min(stored.until, cap) : 0;
    granted = stored?.allow === true && until > Date.now(); overdue = granted && stored.until > cap;
  } catch { /* Session choice still works without storage. */ }
  const details = document.createElement('details'); details.id = 'pulseboard-usage-sharing';
  const title = document.createElement('summary'); title.textContent = 'Usage sharing';
  const note = document.createElement('p'); note.textContent = 'Optional: share a small set of action counts with ' + new URL(config.endpoint).hostname + '. No document text, filenames, form values or browsing history is sent. Raw events expire after 14 days. Your choice lasts 90 days on this browser.';
  const label = document.createElement('label'), checkbox = document.createElement('input'); checkbox.type = 'checkbox';
  label.append(checkbox, document.createTextNode(' Share basic usage for this site'));
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  let announced = false, storageWarning = false, disposed = false;
  const privacyBlocked = () => runtime.navigator?.globalPrivacyControl === true || runtime.navigator?.doNotTrack === '1';
  function paint() {
    const active = observer.status().active;
    const blockedNow = privacyBlocked();
    checkbox.checked = active;
    checkbox.disabled = blockedNow;
    let message = active ? 'Sharing is on. Untick to stop future collection.'
      : blockedNow ? 'Sharing is off because a browser privacy setting blocks collection.'
        : 'Sharing is off. The app works normally.';
    if (storageWarning) message += ' This choice could not be saved; it applies only to this tab.';
    if (status.textContent !== message) status.textContent = message;
    return active;
  }
  reconcile = paint;
  async function flush() { try { return await observer.flush(); } finally { paint(); } }
  function flushOnHide() { const handed = observer.flushOnHide(); paint(); return handed; }
  function apply(value, persist) {
    if (privacyBlocked()) {
      observer.setConsent(false);
      paint();
      return false;
    }
    const preferred = value === true;
    // The observer re-checks this deadline before every send, so a tab alive past it stops without a reload.
    if (persist) until = Date.now() + CONSENT_MS;
    const active = observer.setConsent(preferred, until);
    if (persist) {
      try {
        runtime.localStorage.setItem(key, JSON.stringify({ allow: preferred, until }));
        storageWarning = false;
      } catch { storageWarning = true; }
    }
    paint();
    // One page view per page, on the first time sharing is on: re-ticking the box is not another visit.
    if (active && !announced) { announced = true; track('page.view'); void flush(); }
    return active;
  }
  checkbox.addEventListener('change', () => apply(checkbox.checked, true));
  details.append(title, note, label, status); document.body.append(details); apply(granted, overdue);
  const error = () => track('app.error');
  const click = event => {
    try { for (const item of config.clicks || []) { if (event.target?.closest?.(item.selector)) { track(item.event); break; } } }
    catch { /* A bad selector must never throw inside a listener on the host document. */ }
  };
  const pagehide = event => {
    flushOnHide();
    if (!event.persisted) dispose();
  };
  runtime.addEventListener('error', error); runtime.addEventListener('unhandledrejection', error); document.addEventListener('click', click);
  runtime.addEventListener('pagehide', pagehide);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.dispose();
    runtime.removeEventListener('error', error);
    runtime.removeEventListener('unhandledrejection', error);
    runtime.removeEventListener('pagehide', pagehide);
    document.removeEventListener('click', click);
    details.remove();
  };
  // A bfcache restore keeps the same JS realm and session-only choice. Ordinary navigation disposes through pagehide.
  return { track, flush, flushOnHide, resume: paint, status: observer.status, dispose };
}

const config = {"id":"alibi","project":{"events":["page.view","app.ready","app.error","action.requested","action.completed","action.failed","duration.ms","puzzle.started","puzzle.completed","puzzle.failed","hint.requested"],"routes":["home","puzzle","castle","quiet-wing","other"],"releases":["unattributed","0.11.3","0.11.4","0.11.5","0.11.6","0.12.0"],"measurements":["duration.ms"]},"origin":"https://alibi-after-hours-preview.commit-atlas.workers.dev","endpoint":"https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi","scopePath":"/","release":"unattributed","route":"home","clicks":[],"contextGlobal":"ALIBI_OBSERVATORY_CONTEXT","publicFlag":{"global":"ALIBI_CONFIG","key":"standalone","expected":false}};
function start() { globalThis.PulseboardUsage?.dispose(); globalThis.PulseboardUsage = mountObserver(config, createObserver); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
globalThis.addEventListener?.('pageshow', event => { if (event.persisted && globalThis.PulseboardUsage?.resume?.() === undefined) start(); });
})();
