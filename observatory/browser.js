/* SPDX-License-Identifier: GPL-3.0-only
 * Pulseboard Observatory 0.1.0. Generated; see observatory.lock.json.
 * Disabled until endpoint is configured. No dynamic/CDN dependency. */
(function () {
'use strict';
/** Bounded Pulseboard client transport slice (issue #89 producer half).
 *
 * Aggregate-only transport for POST /v1/collect-stat/alibi with body exactly
 * { v: 1, counts: [{ event, route, release, n: 1 }, ...] } (1..20 items).
 * No identifiers, content, page URLs, referrers, cookies, DOM, storage or host
 * context are included in event payloads. Vocabulary, endpoint, origin and defaults
 * come only from `config`; all host capabilities come only from `runtime`.
 */
const STAT_V = 1;
const MAX_QUEUE = 100;
const MAX_REQUESTS = 120;
const CLIENT_BATCH_LIMIT = 20;
const KEEPALIVE_BUDGET = 65536;

function createStatisticObserver(config, runtime = globalThis) {
  const cfg = config && typeof config === 'object' ? config : {};
  const vocab = cfg.project && typeof cfg.project === 'object' && !Array.isArray(cfg.project)
    ? cfg.project
    : cfg;
  const events = Array.isArray(vocab.events) ? vocab.events : [];
  const routes = Array.isArray(vocab.routes) ? vocab.routes : [];
  const releases = Array.isArray(vocab.releases) ? vocab.releases : [];
  const endpoint = typeof cfg.endpoint === 'string' ? cfg.endpoint : '';
  const origin = typeof cfg.origin === 'string' ? cfg.origin : '';
  const defaultRoute = typeof (cfg.route ?? cfg.defaultRoute) === 'string'
    ? (cfg.route ?? cfg.defaultRoute)
    : 'home';
  const defaultRelease = typeof (cfg.release ?? cfg.defaultRelease) === 'string'
    ? (cfg.release ?? cfg.defaultRelease)
    : 'unattributed';

  let enabled = false;
  let disposed = false;
  let epoch = 0;
  let queue = [];
  let flight = null;
  const handoffs = new Set();
  let requests = 0;
  let keepaliveBytes = 0;
  const stats = { sent: 0, dropped: 0, failures: 0 };

  function eligible() {
    try {
      if (disposed) return false;
      const url = new URL(endpoint);
      if (url.protocol !== 'https:') return false;
      if (url.pathname !== '/v1/collect-stat/alibi') return false;
      if (url.username || url.password) return false;
      if (url.search) return false;
      if (url.hash) return false;
      let originProtocol = '';
      try {
        originProtocol = new URL(origin).protocol;
      } catch {
        return false;
      }
      if (originProtocol !== 'https:') return false;
      const loc = runtime?.location;
      if (!loc || loc.origin !== origin) return false;
      if (loc.protocol !== 'https:') return false;
      const nav = runtime?.navigator;
      if (nav?.webdriver) return false;
      if (nav?.doNotTrack === '1') return false;
      if (nav?.globalPrivacyControl === true) return false;
      if (typeof runtime?.fetch !== 'function') return false;
      if (typeof (runtime?.AbortController ?? globalThis.AbortController) !== 'function') return false;
      return true;
    } catch {
      return false;
    }
  }

  function clearTimer(id) {
    if (id === null || id === undefined) return;
    try {
      const clear = runtime?.clearTimeout;
      if (typeof clear === 'function') clear.call(runtime, id);
      else globalThis.clearTimeout(id);
    } catch {
      /* Clearing must never break revocation. */
    }
  }

  function revoke() {
    epoch += 1;
    queue = [];
    if (flight) {
      flight.cancelled = true;
      clearTimer(flight.timeoutId);
      try {
        flight.abort.abort();
      } catch {
        /* Abort failure still revokes. */
      }
      flight = null;
    }
    for (const record of handoffs) {
      record.cancelled = true;
      try { record.abort?.abort(); } catch { /* Withdrawal still clears local work. */ }
    }
    handoffs.clear();
  }

  function setEnabled(value) {
    try {
      if (disposed) {
        enabled = false;
        return false;
      }
      if (value !== true) {
        enabled = false;
        revoke();
        return false;
      }
      if (!eligible()) {
        enabled = false;
        revoke();
        return false;
      }
      enabled = true;
      return true;
    } catch {
      enabled = false;
      return false;
    }
  }

  function track(event, options = {}) {
    try {
      if (!enabled || disposed) return false;
      if (!eligible()) {
        enabled = false;
        revoke();
        return false;
      }
      if (!options || typeof options !== 'object' || Array.isArray(options)) {
        stats.dropped += 1;
        return false;
      }
      const keys = Object.keys(options);
      if (keys.some((k) => k !== 'route' && k !== 'release')) {
        stats.dropped += 1;
        return false;
      }
      if (typeof event !== 'string') {
        stats.dropped += 1;
        return false;
      }
      const route = Object.hasOwn(options, 'route') ? options.route : defaultRoute;
      const release = Object.hasOwn(options, 'release') ? options.release : defaultRelease;
      if (typeof route !== 'string' || typeof release !== 'string') {
        stats.dropped += 1;
        return false;
      }
      if (!events.includes(event) || !routes.includes(route) || !releases.includes(release)) {
        stats.dropped += 1;
        return false;
      }
      if (queue.length >= MAX_QUEUE || requests >= MAX_REQUESTS) {
        stats.dropped += 1;
        return false;
      }
      queue.push({ event, route, release, n: 1 });
      return true;
    } catch {
      try {
        stats.dropped += 1;
      } catch {
        /* Never throw to the host. */
      }
      return false;
    }
  }

  function byteLength(text) {
    try {
      const TE = runtime?.TextEncoder ?? globalThis.TextEncoder;
      if (typeof TE === 'function') return new TE().encode(text).byteLength;
    } catch {
      /* Fall through to Buffer/length. */
    }
    try {
      if (typeof Buffer !== 'undefined') return Buffer.byteLength(text, 'utf8');
    } catch {
      /* Fall through. */
    }
    return text.length;
  }

  function makeController() {
    try {
      const AC = runtime?.AbortController ?? globalThis.AbortController;
      if (typeof AC === 'function') return new AC();
    } catch {
      /* Send without a signal below. */
    }
    return null;
  }

  async function flush() {
    try {
      if (!enabled || disposed) return 0;
      if (!eligible()) {
        enabled = false;
        revoke();
        return 0;
      }
      if (flight || queue.length === 0 || requests >= MAX_REQUESTS) return 0;
      const batch = queue.splice(0, CLIENT_BATCH_LIMIT);
      const body = JSON.stringify({ v: STAT_V, counts: batch });
      const controller = makeController();
      const record = {
        abort: controller,
        batch,
        generation: epoch,
        cancelled: false,
        timedOut: false,
        timeoutId: null,
      };
      flight = record;
      requests += 1;
      const timeoutMs = requests <= 1 ? 10000 : 5000;
      try {
        const setter = runtime?.setTimeout;
        if (typeof setter === 'function' && controller) {
          record.timeoutId = setter.call(runtime, () => {
            record.timedOut = true;
            try {
              controller.abort();
            } catch {
              /* Timeout abort failure settles below. */
            }
          }, timeoutMs);
        } else if (controller) {
          record.timeoutId = globalThis.setTimeout(() => {
            record.timedOut = true;
            try {
              controller.abort();
            } catch {
              /* Timeout abort failure settles below. */
            }
          }, timeoutMs);
        }
      } catch {
        record.timeoutId = null;
      }
      try {
        const init = {
          method: 'POST',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          redirect: 'error',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body,
        };
        if (controller) init.signal = controller.signal;
        const response = await runtime.fetch(endpoint, init);
        if (record.cancelled || record.generation !== epoch) return 0;
        if (response && response.ok) {
          stats.sent += batch.length;
          return batch.length;
        }
        stats.dropped += batch.length;
        stats.failures += 1;
        return 0;
      } catch {
        if (record.cancelled || record.generation !== epoch) return 0;
        stats.dropped += batch.length;
        stats.failures += 1;
        return 0;
      } finally {
        clearTimer(record.timeoutId);
        if (flight === record) flight = null;
      }
    } catch {
      return 0;
    }
  }

  function flushOnHide() {
    try {
      if (!enabled || disposed) return 0;
      if (!eligible()) {
        enabled = false;
        revoke();
        return 0;
      }
      // Never replay the in-flight batch: it already left the queue and the
      // aggregate contract has no identifiers to deduplicate a duplicate.
      let handed = 0;
      while (queue.length && requests < MAX_REQUESTS) {
        const batch = queue.slice(0, CLIENT_BATCH_LIMIT);
        const body = JSON.stringify({ v: STAT_V, counts: batch });
        const bytes = byteLength(body);
        if (keepaliveBytes + bytes > KEEPALIVE_BUDGET) break;
        queue.splice(0, batch.length);
        requests += 1;
        keepaliveBytes += bytes;
        handed += batch.length;
        const controller = makeController();
        const record = { abort: controller, cancelled: false, generation: epoch };
        handoffs.add(record);
        const settle = (ok) => {
          keepaliveBytes -= bytes;
          handoffs.delete(record);
          if (record.cancelled || record.generation !== epoch) return;
          if (ok) stats.sent += batch.length;
          else { stats.dropped += batch.length; stats.failures += 1; }
        };
        try {
          const init = {
            method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer',
            redirect: 'error', cache: 'no-store',
            headers: { 'Content-Type': 'application/json' }, body, keepalive: true,
          };
          if (controller) init.signal = controller.signal;
          const outcome = runtime.fetch(endpoint, init);
          if (outcome && typeof outcome.then === 'function')
            outcome.then(response => settle(!!response?.ok), () => settle(false));
          else settle(false);
        } catch { settle(false); }
      }
      return handed;
    } catch {
      return 0;
    }
  }

  function status() {
    try {
      if (enabled && !eligible()) { enabled = false; revoke(); }
      return {
        enabled: enabled && !disposed,
        active: enabled && !disposed,
        queued: queue.length,
        requests,
        sent: stats.sent,
        dropped: stats.dropped,
        failures: stats.failures,
      };
    } catch {
      return { enabled: false, active: false, queued: 0, requests: 0, sent: 0, dropped: 0, failures: 0 };
    }
  }

  /** Pagehide may preserve already handed-off keepalive requests; explicit off never does. */
  function dispose({ preserveHandoffs = false } = {}) {
    try {
      if (disposed) return;
      enabled = false;
      disposed = true;
      if (preserveHandoffs) {
        epoch += 1;
        queue = [];
        if (flight) {
          flight.cancelled = true;
          clearTimer(flight.timeoutId);
          try { flight.abort?.abort(); } catch { /* Page exit still clears local work. */ }
          flight = null;
        }
        return;
      }
      revoke();
    } catch {
      /* Dispose never throws. */
    }
  }

  return { setEnabled, track, flush, flushOnHide, status, dispose };
}

/** Pulseboard statistic embed: UI/preference half of issue #89.
 *
 * Uses the aggregate transport `create` (createStatisticObserver) passed in.
 * Default-on is implemented here but must stay behind review: builder/Alibi
 * integration is a later task and this slice must not be deployed alone.
 */
const PREF_KEY = 'pulseboard:statistics:v1:alibi';
const OLD_PREFIX = 'pulseboard:consent:v1:alibi:';
const HARDCODED_LEGACY = 'https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect/alibi';
const ALIBI_ORIGIN = 'https://alibi-after-hours-preview.commit-atlas.workers.dev';
const STAT_PATH = '/v1/collect-stat/alibi';
const LEGACY_PATH = '/v1/collect/alibi';

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function validConfigShape(config) {
  if (!isPlainObject(config)) return false;
  if (config.id !== 'alibi') return false;
  const project = config.project;
  if (!isPlainObject(project)) return false;
  if (!Array.isArray(project.events) || !Array.isArray(project.routes) || !Array.isArray(project.releases)) return false;
  if (typeof config.endpoint !== 'string' || typeof config.origin !== 'string') return false;
  if (config.origin !== ALIBI_ORIGIN) return false;
  try {
    const eu = new URL(config.endpoint);
    if (eu.protocol !== 'https:') return false;
    if (eu.pathname !== STAT_PATH) return false;
    if (eu.username || eu.password || eu.search || eu.hash) return false;
    const ou = new URL(config.origin);
    if (ou.protocol !== 'https:') return false;
    if (ou.username || ou.password || ou.search || ou.hash) return false;
  } catch {
    return false;
  }
  return true;
}

function legacyEndpointFor(endpoint, config) {
  if (typeof config.legacyEndpoint === 'string' && config.legacyEndpoint) return config.legacyEndpoint;
  if (typeof endpoint === 'string' && endpoint.endsWith(STAT_PATH)) {
    return endpoint.slice(0, -STAT_PATH.length) + LEGACY_PATH;
  }
  return null;
}

function isNewPrefValue(parsed, value) {
  return isPlainObject(parsed) && Object.keys(parsed).length === 1 && parsed.allow === value;
}

function readNewPref(storage) {
  try {
    const raw = storage.getItem(PREF_KEY);
    if (raw === null || raw === undefined) return { state: 'missing' };
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { state: 'corrupt' };
    }
    if (isNewPrefValue(parsed, true)) return { state: 'on' };
    if (isNewPrefValue(parsed, false)) return { state: 'off' };
    return { state: 'corrupt' };
  } catch {
    return { state: 'broken' };
  }
}

function readOldOptOut(storage, keys) {
  for (const key of keys) {
    let raw = null;
    try {
      raw = storage.getItem(key);
    } catch {
      return { broken: true, optOut: false };
    }
    if (raw === null || raw === undefined) continue;
    try {
      const parsed = JSON.parse(raw);
      if (isPlainObject(parsed) && parsed.allow === false) return { broken: false, optOut: true };
    } catch {
      continue;
    }
  }
  return { broken: false, optOut: false };
}

function probeStorage(storage) {
  try {
    if (!storage || typeof storage.getItem !== 'function'
      || typeof storage.setItem !== 'function' || typeof storage.removeItem !== 'function') return false;
    const probeKey = PREF_KEY + ':probe';
    storage.setItem(probeKey, '1');
    const read = storage.getItem(probeKey);
    try {
      storage.removeItem(probeKey);
    } catch {
      /* Probe cleanup failure still counts as unusable below when read mismatches. */
    }
    return read === '1';
  } catch {
    return false;
  }
}

function persistAllow(storage, value) {
  try {
    if (!storage || typeof storage.setItem !== 'function' || typeof storage.getItem !== 'function') return false;
    storage.setItem(PREF_KEY, JSON.stringify({ allow: value }));
    const read = storage.getItem(PREF_KEY);
    const parsed = JSON.parse(read);
    return isNewPrefValue(parsed, value);
  } catch {
    return false;
  }
}

function mountStatisticObserver(config, create, runtime = globalThis) {
  if (!validConfigShape(config)) return null;
  if (typeof create !== 'function') return null;

  const scopePath = typeof config.scopePath === 'string' ? config.scopePath : '/';
  const project = config.project;

  // Eligibility first: location, scope, webdriver, standalone. No document/storage/context reads yet.
  let loc = null;
  try {
    loc = runtime?.location ?? null;
  } catch {
    return null;
  }
  if (!loc || typeof loc.origin !== 'string' || typeof loc.protocol !== 'string' || typeof loc.pathname !== 'string') return null;
  if (loc.origin !== config.origin) return null;
  if (loc.protocol !== 'https:') return null;
  try {
    if (!loc.pathname.startsWith(scopePath)) return null;
  } catch {
    return null;
  }
  let nav = null;
  try {
    nav = runtime?.navigator ?? null;
  } catch {
    return null;
  }
  try {
    if (nav?.webdriver) return null;
  } catch {
    return null;
  }
  try {
    if (runtime?.ALIBI_CONFIG?.standalone !== false) return null;
  } catch {
    return null;
  }

  // Preference: GPC/DNT leaves collection off without mounting. No DOM reads yet.
  try {
    if (nav?.globalPrivacyControl === true || nav?.doNotTrack === '1') return null;
  } catch {
    return null;
  }

  let storage = null;
  try {
    storage = runtime?.localStorage ?? null;
  } catch {
    storage = null;
  }

  const derivedLegacy = legacyEndpointFor(config.endpoint, config);
  const oldKeys = [];
  if (derivedLegacy) oldKeys.push(OLD_PREFIX + derivedLegacy);
  if (!oldKeys.includes(OLD_PREFIX + HARDCODED_LEGACY)) oldKeys.push(OLD_PREFIX + HARDCODED_LEGACY);

  let initialAllow = false;
  let storageUsable = false;
  if (!storage) {
    initialAllow = false;
  } else {
    const next = readNewPref(storage);
    if (next.state === 'on') {
      if (probeStorage(storage)) {
        initialAllow = true;
        storageUsable = true;
      } else {
        initialAllow = false;
        storageUsable = false;
      }
    } else if (next.state === 'off' || next.state === 'corrupt' || next.state === 'broken') {
      initialAllow = false;
      storageUsable = false;
    } else {
      const old = readOldOptOut(storage, oldKeys);
      if (old.broken) {
        initialAllow = false;
      } else if (old.optOut) {
        initialAllow = false;
      } else if (probeStorage(storage)) {
        initialAllow = true;
        storageUsable = true;
      } else {
        initialAllow = false;
      }
    }
  }
  void storageUsable;

  // Transport creation touches only location/navigator/fetch. Still no DOM reads.
  let transport = null;
  try {
    transport = create(config, runtime);
  } catch {
    return null;
  }
  if (!transport || typeof transport.setEnabled !== 'function' || typeof transport.track !== 'function'
    || typeof transport.flush !== 'function' || typeof transport.flushOnHide !== 'function'
    || typeof transport.status !== 'function' || typeof transport.dispose !== 'function') return null;

  // DOM now allowed: eligibility and preference have been checked.
  let doc = null;
  try {
    doc = runtime?.document ?? null;
  } catch {
    return null;
  }
  if (!doc || typeof doc.createElement !== 'function' || !doc.body) return null;

  let details = null;
  let checkbox = null;
  let statusEl = null;
  try {
    details = doc.createElement('details');
    details.id = 'pulseboard-usage-sharing';
    details.open = true;
    const title = doc.createElement('summary');
    title.textContent = 'Usage sharing';
    const note = doc.createElement('p');
    note.textContent = 'Help improve this site. When sharing is on, this page sends closed event counts '
      + 'by section (page) and release (app version) to Pulseboard. Counts are kept as 14-day aggregates. '
      + 'No puzzle content, progress, or IDs are in the event payload. Pulseboard also receives ordinary request metadata, '
      + 'such as your IP address. You can turn sharing off at any time for free — the site works the same.';
    const label = doc.createElement('label');
    checkbox = doc.createElement('input');
    checkbox.type = 'checkbox';
    let labelText = null;
    try {
      labelText = typeof doc.createTextNode === 'function'
        ? doc.createTextNode(' Share basic usage counts for this site')
        : null;
    } catch {
      labelText = null;
    }
    try {
      if (labelText) label.append(checkbox, labelText);
      else if (typeof label.append === 'function') label.append(checkbox);
      else if (typeof label.appendChild === 'function') label.appendChild(checkbox);
    } catch {
      try {
        label.appendChild(checkbox);
      } catch {
        return null;
      }
    }
    statusEl = doc.createElement('p');
    try {
      statusEl.setAttribute('role', 'status');
    } catch {
      /* Status text still carries the on/off message. */
    }
    try {
      if (typeof details.append === 'function') details.append(title, note, label, statusEl);
      else {
        details.appendChild(title);
        details.appendChild(note);
        details.appendChild(label);
        details.appendChild(statusEl);
      }
    } catch {
      return null;
    }
    try {
      if (typeof doc.body.prepend === 'function') doc.body.prepend(details);
      else if (typeof doc.body.append === 'function') doc.body.append(details);
      else doc.body.appendChild(details);
    } catch {
      return null;
    }
  } catch {
    return null;
  }

  let disposed = false;
  let announced = false;
  let storageWarning = false;

  const privacyBlocked = () => {
    try {
      const n = runtime?.navigator;
      return n?.globalPrivacyControl === true || n?.doNotTrack === '1';
    } catch {
      return true;
    }
  };

  function paint() {
    let active = false;
    try {
      active = transport.status().active === true;
    } catch {
      active = false;
    }
    let blocked = false;
    try {
      blocked = privacyBlocked();
    } catch {
      blocked = true;
    }
    try {
      checkbox.checked = active;
    } catch {
      /* Checkbox state is best-effort; status text remains the source of truth. */
    }
    try {
      checkbox.disabled = blocked;
    } catch {
      /* Disabled state is best-effort. */
    }
    let message = active
      ? 'Sharing is on. Untick to stop future collection.'
      : blocked
        ? 'Sharing is off because a browser privacy setting blocks collection.'
        : 'Sharing is off. The app works normally.';
    if (storageWarning) message += ' This choice could not be saved; it applies only to this tab.';
    try {
      if (statusEl.textContent !== message) statusEl.textContent = message;
    } catch {
      /* Paint never throws to the host. */
    }
    return active;
  }

  function hostContext() {
    try {
      try {
        if (transport.status().active !== true) return {};
      } catch {
        return {};
      }
      const name = typeof config.contextGlobal === 'string' ? config.contextGlobal : null;
      if (!name) return {};
      let provider = null;
      try {
        provider = runtime[name];
      } catch {
        return {};
      }
      let value = null;
      try {
        value = typeof provider === 'function' ? provider() : provider;
      } catch {
        return {};
      }
      if (!isPlainObject(value)) return {};
      const out = {};
      try {
        if (typeof value.route === 'string' && project.routes.includes(value.route)) out.route = value.route;
        if (typeof value.release === 'string' && project.releases.includes(value.release)) out.release = value.release;
      } catch {
        return {};
      }
      return out;
    } catch {
      return {};
    }
  }

  function track(event, options = {}) {
    try {
      if (disposed) return false;
      let opts = options;
      try {
        if (isPlainObject(opts)) opts = { ...hostContext(), ...opts };
      } catch {
        opts = options;
      }
      let result = false;
      try {
        result = transport.track(event, opts);
      } catch {
        result = false;
      }
      try {
        paint();
      } catch {
        /* Tracking result stands even when repaint fails. */
      }
      return result;
    } catch {
      return false;
    }
  }

  async function flush() {
    try {
      if (disposed) return 0;
      const result = await transport.flush();
      try {
        paint();
      } catch {
        /* Flush result stands. */
      }
      return result;
    } catch {
      return 0;
    }
  }

  function flushOnHide() {
    try {
      if (disposed) return 0;
      const handed = transport.flushOnHide();
      try {
        paint();
      } catch {
        /* Handoff count stands. */
      }
      return handed;
    } catch {
      return 0;
    }
  }

  function status() {
    try {
      return transport.status();
    } catch {
      return { enabled: false, active: false, queued: 0, requests: 0, sent: 0, dropped: 0, failures: 0 };
    }
  }

  function removeListener(target, type, fn) {
    try {
      if (target && typeof target.removeEventListener === 'function') target.removeEventListener(type, fn);
    } catch {
      /* Cleanup never throws. */
    }
  }

  function disposeInternal(preserveHandoffs) {
    if (disposed) return;
    disposed = true;
    try {
      removeListener(runtime, 'error', onError);
    } catch {
      /* Continue cleanup. */
    }
    try {
      removeListener(runtime, 'unhandledrejection', onError);
    } catch {
      /* Continue cleanup. */
    }
    try {
      removeListener(runtime, 'pagehide', onPageHide);
    } catch {
      /* Continue cleanup. */
    }
    try {
      if (doc && typeof doc.removeEventListener === 'function') doc.removeEventListener('click', onClick);
    } catch {
      /* Continue cleanup. */
    }
    try {
      transport.dispose(preserveHandoffs ? { preserveHandoffs: true } : undefined);
    } catch {
      /* Transport disposal never blocks UI cleanup. */
    }
    try {
      if (details && typeof details.remove === 'function') details.remove();
      else if (details && doc?.body && typeof doc.body.removeChild === 'function') doc.body.removeChild(details);
    } catch {
      /* Element removal is best-effort. */
    }
  }

  function dispose() {
    disposeInternal(false);
  }

  function resume() {
    try {
      if (disposed) return false;
      return paint();
    } catch {
      return false;
    }
  }

  function onToggle() {
    try {
      if (disposed) return false;
      if (privacyBlocked()) {
        try {
          transport.setEnabled(false);
        } catch {
          /* Revocation stands. */
        }
        paint();
        return false;
      }
      let want = false;
      try {
        want = checkbox.checked === true;
      } catch {
        want = false;
      }
      if (want === false) {
        try {
          transport.setEnabled(false);
        } catch {
          /* Explicit off always drops local work. */
        }
        let ok = false;
        try {
          ok = storage ? persistAllow(storage, false) : false;
        } catch {
          ok = false;
        }
        storageWarning = !ok;
        paint();
        return false;
      }
      let ok = false;
      try {
        ok = storage ? persistAllow(storage, true) : false;
      } catch {
        ok = false;
      }
      if (!ok) {
        try {
          transport.setEnabled(false);
        } catch {
          /* Failed persistence never enables collection. */
        }
        storageWarning = true;
        paint();
        return false;
      }
      storageWarning = false;
      let active = false;
      try {
        active = transport.setEnabled(true);
      } catch {
        active = false;
      }
      paint();
      if (active && !announced && project.events.includes('page.view')) {
        announced = true;
        try {
          track('page.view');
        } catch {
          /* Initial view is best-effort. */
        }
        try {
          const pending = flush();
          if (pending && typeof pending.catch === 'function') pending.catch(() => {});
        } catch {
          /* Flush failure still counts as announced. */
        }
      }
      return active;
    } catch {
      return false;
    }
  }

  function onError() {
    try {
      if (project.events.includes('app.error')) track('app.error');
    } catch {
      /* Listener errors never reach the host. */
    }
  }

  function onClick(event) {
    try {
      const clicks = Array.isArray(config.clicks) ? config.clicks : [];
      if (!clicks.length) return;
      const target = event?.target ?? null;
      if (!target || typeof target.closest !== 'function') return;
      for (const item of clicks) {
        try {
          if (!isPlainObject(item)) continue;
          if (typeof item.selector !== 'string' || typeof item.event !== 'string') continue;
          if (!project.events.includes(item.event)) continue;
          if (target.closest(item.selector)) {
            track(item.event);
            break;
          }
        } catch {
          /* One bad click rule never blocks the rest. */
        }
      }
    } catch {
      /* Click tracking never throws. */
    }
  }

  function onPageHide(event) {
    try {
      try {
        transport.flushOnHide();
      } catch {
        /* Handoff failure still disposes below for non-bfcache exits. */
      }
      try {
        paint();
      } catch {
        /* Paint failure still honours the exit path. */
      }
      if (!event?.persisted) disposeInternal(true);
    } catch {
      /* Pagehide never throws. */
    }
  }

  try {
    if (typeof checkbox.addEventListener === 'function') checkbox.addEventListener('change', onToggle);
    else if (typeof checkbox.attachEvent === 'function') checkbox.attachEvent('onchange', onToggle);
  } catch {
    /* Toggle without a listener still shows the initial state. */
  }
  try {
    if (runtime && typeof runtime.addEventListener === 'function') {
      runtime.addEventListener('error', onError);
      runtime.addEventListener('unhandledrejection', onError);
      runtime.addEventListener('pagehide', onPageHide);
    }
  } catch {
    /* Listeners are best-effort; collection still respects eligibility. */
  }
  try {
    if (doc && typeof doc.addEventListener === 'function') doc.addEventListener('click', onClick);
  } catch {
    /* Click tracking is best-effort. */
  }

  // Notice is already mounted; only now may the transport be enabled.
  if (initialAllow && !privacyBlocked()) {
    let active = false;
    try {
      active = transport.setEnabled(true);
    } catch {
      active = false;
    }
    paint();
    if (active && project.events.includes('page.view')) {
      announced = true;
      try {
        transport.track('page.view', { ...hostContext() });
      } catch {
        /* Initial view is best-effort. */
      }
      try {
        paint();
      } catch {
        /* Initial paint failure leaves the queued view for flush. */
      }
      try {
        const pending = transport.flush();
        if (pending && typeof pending.catch === 'function') pending.catch(() => {});
      } catch {
        /* Initial flush failure stays queued for the next flush. */
      }
      try {
        paint();
      } catch {
        /* Final paint is best-effort. */
      }
    }
  } else {
    try {
      transport.setEnabled(false);
    } catch {
      /* Starting off never sends. */
    }
    paint();
  }

  return { track, flush, flushOnHide, status, dispose, resume };
}

const config = {"id":"alibi","project":{"events":["page.view","app.ready","app.error","action.requested","action.completed","action.failed","duration.ms","puzzle.started","puzzle.completed","puzzle.failed","hint.requested"],"routes":["home","puzzle","castle","quiet-wing","other"],"releases":["unattributed","0.11.3","0.11.4","0.11.5","0.11.6","0.12.0"],"measurements":["duration.ms"]},"origin":"https://alibi-after-hours-preview.commit-atlas.workers.dev","endpoint":"https://pulseboard-observatory.commit-atlas.workers.dev/v1/collect-stat/alibi","scopePath":"/","release":"unattributed","route":"home","clicks":[],"contextGlobal":"ALIBI_OBSERVATORY_CONTEXT","publicFlag":{"global":"ALIBI_CONFIG","key":"standalone","expected":false}};
function start() { globalThis.PulseboardUsage?.dispose(); globalThis.PulseboardUsage = mountStatisticObserver(config, createStatisticObserver); }
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
globalThis.addEventListener?.('pageshow', event => { if (event.persisted && globalThis.PulseboardUsage?.resume?.() === undefined) start(); });
})();
