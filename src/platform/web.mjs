import {
  PlatformFailure,
  assertBuildIdentity,
  createLease,
  failure,
  isDomainId,
  isHandleId,
  isSha256,
  ok,
  runBounded,
  utf8Bytes,
} from './contract.mjs';

const MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;
const ASSET_STATUSES = new Set(['bundled', 'verified-local', 'compact-fallback']);
const FEEDBACK_KINDS = new Set(['select', 'invalid', 'place', 'clear', 'complete']);
const SAFE_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._ -]{0,119}$/;

function fallbackBuild(host) {
  return host.ALIBI_PLATFORM_BUILD;
}

function documentUnavailable() {
  return failure('unavailable', 'User-selected documents are unavailable in this browser.');
}

function recoveryUnavailable() {
  return failure('unavailable', 'Recovery checkpoints are unavailable in this browser adapter.');
}

function safeInvoke(listener, value) {
  try {
    listener(value);
  } catch {
    /* A listener cannot break lifecycle delivery to other owners. */
  }
}

function tokenFactory(host) {
  let fallback = 0;
  return () => {
    const id =
      host.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${(++fallback).toString(36)}`;
    return `web-document:${String(id).toLowerCase()}`;
  };
}

async function sha256(host, text) {
  if (!host.crypto?.subtle?.digest)
    throw new PlatformFailure('unsupported', 'SHA-256 is unavailable in this browser.');
  const digest = await host.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');
}

function validateLocalAssetUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('./') || value.includes('\\')) return false;
  const segments = value.slice(2).split('/');
  return (
    segments.length > 1 &&
    segments.every((segment) => segment && segment !== '.' && segment !== '..')
  );
}

function assetRegistry(entries) {
  const registry = new Map();
  for (const entry of entries || []) {
    if (!isHandleId(entry?.id) || !isHandleId(entry?.revision))
      throw new TypeError('Asset id and revision must be allowlisted handles.');
    if (!ASSET_STATUSES.has(entry.status)) throw new TypeError('Invalid asset status.');
    if (!validateLocalAssetUrl(entry.url))
      throw new TypeError('Asset URL must be a reviewed local relative URL.');
    if (!isSha256(entry.digest)) throw new TypeError('Asset digest must be SHA-256.');
    if (!Number.isSafeInteger(entry.bytes) || entry.bytes < 0)
      throw new TypeError('Asset bytes must be a non-negative integer.');
    const key = `${entry.id}@${entry.revision}`;
    if (registry.has(key)) throw new TypeError('Duplicate platform asset entry.');
    registry.set(
      key,
      Object.freeze({
        status: entry.status,
        url: entry.url,
        digest: entry.digest.toLowerCase(),
        bytes: entry.bytes,
      }),
    );
  }
  return registry;
}

function externalRegistry(entries) {
  const registry = new Map();
  for (const [purpose, value] of Object.entries(entries || {})) {
    if (!isHandleId(purpose))
      throw new TypeError('External purpose must be an allowlisted handle.');
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new TypeError('External destination must be an approved HTTPS URL.');
    }
    if (url.protocol !== 'https:' || url.username || url.password)
      throw new TypeError('External destination must be an approved HTTPS URL.');
    registry.set(purpose, url.href);
  }
  return registry;
}

function createFeedback(host) {
  let preferences = Object.freeze({ sound: false, haptics: false, reducedMotion: false });
  let suspended = false;
  let disposed = false;
  return Object.freeze({
    emit(kind) {
      if (disposed || suspended || !FEEDBACK_KINDS.has(kind) || !preferences.haptics) return;
      try {
        const pattern =
          kind === 'clear' || kind === 'complete' ? [10, 24, 10] : kind === 'invalid' ? 10 : 6;
        host.navigator?.vibrate?.(pattern);
      } catch {
        /* Feedback is optional and never escapes into game logic. */
      }
    },
    setPreferences(value) {
      if (disposed || !value || typeof value !== 'object') return;
      preferences = Object.freeze({
        sound: !!value.sound,
        haptics: !!value.haptics,
        reducedMotion: !!value.reducedMotion,
      });
      suspended = false;
    },
    suspend() {
      if (!disposed) suspended = true;
    },
    dispose() {
      disposed = true;
      suspended = true;
      preferences = Object.freeze({ sound: false, haptics: false, reducedMotion: true });
    },
  });
}

function createDocuments(host) {
  const handles = new Map();
  const nextToken = tokenFactory(host);
  return Object.freeze({
    async pickBackup(options) {
      if (typeof host.showOpenFilePicker !== 'function') return documentUnavailable();
      const picked = await runBounded(
        () =>
          host.showOpenFilePicker({
            multiple: false,
            types: [
              {
                description: 'Alibi JSON backup',
                accept: { 'application/json': ['.json'] },
              },
            ],
          }),
        options,
        host,
        { message: 'The backup picker is unavailable.' },
      );
      if (!picked.ok) return picked;
      if (
        !Array.isArray(picked.value) ||
        picked.value.length !== 1 ||
        typeof picked.value[0]?.getFile !== 'function'
      )
        return failure('invalid', 'The document picker returned an invalid handle.');
      const token = nextToken();
      handles.set(token, picked.value[0]);
      return ok(token);
    },
    async readLimited(token, maxUtf8Bytes, options) {
      if (typeof token !== 'string' || !handles.has(token))
        return failure('invalid', 'The document token is unknown or released.');
      if (
        !Number.isSafeInteger(maxUtf8Bytes) ||
        maxUtf8Bytes < 1 ||
        maxUtf8Bytes > MAX_DOCUMENT_BYTES
      )
        return failure('invalid', 'The document byte limit is invalid.');
      return runBounded(
        async (operation) => {
          const file = await handles.get(token).getFile();
          operation.throwIfCancelled();
          if (
            !file ||
            typeof file.text !== 'function' ||
            !Number.isFinite(file.size) ||
            file.size < 0
          )
            throw new PlatformFailure('invalid', 'The selected document is invalid.');
          if (file.size > maxUtf8Bytes)
            throw new PlatformFailure('protected', 'The selected document exceeds the byte limit.');
          const value = await file.text();
          if (typeof value !== 'string')
            throw new PlatformFailure('invalid', 'The selected document is not text.');
          if (utf8Bytes(value) > maxUtf8Bytes)
            throw new PlatformFailure('protected', 'The selected document exceeds the byte limit.');
          return value;
        },
        options,
        host,
        { message: 'The selected document could not be read.' },
      );
    },
    async writeBackup(request, options) {
      if (typeof host.showSaveFilePicker !== 'function') return documentUnavailable();
      if (
        !request ||
        typeof request !== 'object' ||
        !SAFE_FILE_NAME.test(request.suggestedName || '') ||
        typeof request.utf8Payload !== 'string' ||
        utf8Bytes(request.utf8Payload) > MAX_DOCUMENT_BYTES ||
        !isSha256(request.digest)
      )
        return failure('invalid', 'The backup write request is invalid.');
      return runBounded(
        async (operation) => {
          const actualDigest = await sha256(host, request.utf8Payload);
          operation.throwIfCancelled();
          if (actualDigest !== request.digest.toLowerCase())
            throw new PlatformFailure('invalid', 'The backup digest does not match its payload.');
          const handle = await host.showSaveFilePicker({
            suggestedName: request.suggestedName,
            types: [
              {
                description: 'Alibi JSON backup',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });
          operation.throwIfCancelled();
          if (!handle || typeof handle.createWritable !== 'function')
            throw new PlatformFailure('invalid', 'The document picker returned an invalid handle.');
          let writable;
          try {
            writable = await handle.createWritable();
            if (
              !writable ||
              typeof writable.write !== 'function' ||
              typeof writable.close !== 'function'
            )
              throw new PlatformFailure(
                'invalid',
                'The document provider returned an invalid stream.',
              );
            operation.throwIfCancelled();
            operation.commit();
            await writable.write(request.utf8Payload);
            await writable.close();
          } catch (error) {
            try {
              await writable?.abort?.();
            } catch {
              /* Preserve the original provider failure. */
            }
            throw error;
          }
          const bytes = utf8Bytes(request.utf8Payload);
          let verifiedReadback = false;
          if (typeof handle.getFile === 'function') {
            const readback = await runBounded(
              async (readbackOperation) => {
                const file = await handle.getFile();
                readbackOperation.throwIfCancelled();
                if (file && typeof file.text === 'function' && file.size === bytes) {
                  const value = await file.text();
                  readbackOperation.throwIfCancelled();
                  return (
                    typeof value === 'string' &&
                    (await sha256(host, value)) === request.digest.toLowerCase()
                  );
                }
                return false;
              },
              options,
              host,
              { message: 'The backup readback could not be verified.' },
            );
            verifiedReadback = readback.ok && readback.value === true;
          }
          return { verifiedReadback, bytes };
        },
        options,
        host,
        { message: 'The backup could not be written.' },
      );
    },
    async release(token) {
      if (typeof token === 'string') handles.delete(token);
    },
  });
}

function createRecovery() {
  const validDomain = (value) =>
    isDomainId(value) ? null : failure('invalid', 'The save domain is not registered.');
  return Object.freeze({
    async checkpoint(snapshot) {
      return validDomain(snapshot?.domain) || recoveryUnavailable();
    },
    async read(domain) {
      return validDomain(domain) || recoveryUnavailable();
    },
    async list(domain) {
      return validDomain(domain) || recoveryUnavailable();
    },
  });
}

function createBrowserPlatform(options, target) {
  const host = options.host || globalThis;
  const build = assertBuildIdentity(options.build ?? fallbackBuild(host), target);
  const assets = assetRegistry(options.assets);
  const externalLinks = externalRegistry(options.externalLinks);
  const capabilities = Object.freeze({
    target,
    nativeHost: false,
    nativeFeedback: false,
    userDocuments:
      typeof host.showOpenFilePicker === 'function' &&
      typeof host.showSaveFilePicker === 'function',
    recoveryVault: false,
    remoteTelemetry: false,
  });
  return Object.freeze({
    build,
    capabilities: () => capabilities,
    feedback: createFeedback(host),
    documents: createDocuments(host),
    recovery: createRecovery(),
    assets: Object.freeze({
      async resolve(id, revision, operationOptions) {
        if (!isHandleId(id) || !isHandleId(revision))
          return failure('invalid', 'Asset id and revision must be allowlisted handles.');
        const asset = assets.get(`${id}@${revision}`);
        if (!asset) return failure('unavailable', 'The requested asset revision is unavailable.');
        return runBounded(() => asset, operationOptions, host, {
          message: 'The requested asset is unavailable.',
        });
      },
    }),
    async subscribeLifecycle(listener) {
      if (typeof listener !== 'function') throw new TypeError('A lifecycle listener is required.');
      const removers = [];
      const listen = (target, name, callback) => {
        if (!target?.addEventListener || !target?.removeEventListener) return;
        target.addEventListener(name, callback);
        removers.push(() => target.removeEventListener(name, callback));
      };
      let hidden = !!host.document?.hidden;
      listen(host.document, 'visibilitychange', () => {
        const next = !!host.document.hidden;
        if (next === hidden) return;
        hidden = next;
        safeInvoke(listener, { kind: next ? 'pause' : 'resume' });
      });
      listen(host, 'popstate', () => safeInvoke(listener, { kind: 'back' }));
      return createLease(() => removers.splice(0).forEach((remove) => remove()));
    },
    async openExternal(purposeId, operationOptions) {
      if (!isHandleId(purposeId) || !externalLinks.has(purposeId))
        return failure('invalid', 'The external destination is not approved.');
      return runBounded(
        (operation) => {
          if (typeof host.open !== 'function')
            throw new PlatformFailure('unavailable', 'External navigation is unavailable.');
          operation.commit();
          const opened = host.open(externalLinks.get(purposeId), '_blank', 'noopener,noreferrer');
          if (!opened)
            throw new PlatformFailure('denied', 'The browser blocked the external window.');
          try {
            opened.opener = null;
          } catch {
            /* noopener is already requested. */
          }
        },
        operationOptions,
        host,
        { message: 'The approved external destination could not be opened.' },
      );
    },
  });
}

/** Browser implementation pinned to a web identity. It never infers Android from browser signals. */
export function createWebPlatform(options = {}) {
  return createBrowserPlatform(options, 'web');
}

/** Browser API fallback for an explicitly selected web or Android build target. */
export function createBrowserFallbackPlatform(options = {}) {
  const host = options.host || globalThis;
  const build = assertBuildIdentity(options.build ?? fallbackBuild(host));
  return createBrowserPlatform({ ...options, host, build }, build.target);
}
