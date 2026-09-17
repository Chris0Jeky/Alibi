const FAILURE_CODES = new Set([
  'unavailable',
  'cancelled',
  'denied',
  'timeout',
  'quota',
  'conflict',
  'invalid',
  'unsupported',
  'protected',
]);
const DOMAIN_IDS = new Set(['cabinet', 'club', 'quiet-wing', 'challenges', 'castle']);
const TARGETS = new Set(['web', 'android']);
const SHA256 = /^[a-f0-9]{64}$/i;
const HANDLE_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;
const OPERATION_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/i;

export class PlatformFailure extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'PlatformFailure';
    this.code = FAILURE_CODES.has(code) ? code : 'unavailable';
  }
}

export function ok(value) {
  return Object.freeze({ ok: true, value });
}

export function failure(code, message) {
  if (!FAILURE_CODES.has(code)) throw new TypeError('Unknown platform failure code.');
  return Object.freeze({ ok: false, code, message: String(message || 'The operation failed.') });
}

export function isDomainId(value) {
  return DOMAIN_IDS.has(value);
}

export function isHandleId(value) {
  return typeof value === 'string' && HANDLE_ID.test(value);
}

export function isSha256(value) {
  return typeof value === 'string' && SHA256.test(value);
}

export function utf8Bytes(value) {
  return new TextEncoder().encode(String(value)).byteLength;
}

export function assertBuildIdentity(value, target) {
  if (!value || typeof value !== 'object' || !TARGETS.has(value.target))
    throw new TypeError('A valid platform build identity is required.');
  if (target && value.target !== target)
    throw new TypeError(`Expected a ${target} build identity.`);
  if (typeof value.sourceSha !== 'string' || !value.sourceSha.trim())
    throw new TypeError('Build sourceSha is required.');
  if (!isSha256(value.payloadSha256)) throw new TypeError('Build payloadSha256 must be SHA-256.');
  if (typeof value.appVersion !== 'string' || !value.appVersion.trim())
    throw new TypeError('Build appVersion is required.');
  if (typeof value.contentManifestRevision !== 'string' || !value.contentManifestRevision.trim())
    throw new TypeError('Build contentManifestRevision is required.');
  if (!value.rulesCompatibility || typeof value.rulesCompatibility !== 'object')
    throw new TypeError('Build rulesCompatibility is required.');
  if (
    value.versionCode !== undefined &&
    (!Number.isSafeInteger(value.versionCode) || value.versionCode < 1)
  )
    throw new TypeError('Build versionCode must be a positive integer.');
  const rulesCompatibility = Object.fromEntries(
    Object.entries(value.rulesCompatibility).map(([id, revision]) => {
      if (!isHandleId(id) || !Number.isSafeInteger(revision) || revision < 0)
        throw new TypeError('Invalid rules compatibility entry.');
      return [id, revision];
    }),
  );
  return Object.freeze({
    target: value.target,
    sourceSha: value.sourceSha,
    payloadSha256: value.payloadSha256.toLowerCase(),
    appVersion: value.appVersion,
    ...(value.versionCode === undefined ? {} : { versionCode: value.versionCode }),
    contentManifestRevision: value.contentManifestRevision,
    rulesCompatibility: Object.freeze(rulesCompatibility),
  });
}

export function validateOperationOptions(value) {
  if (!value || typeof value !== 'object')
    return failure('invalid', 'Operation options are required.');
  if (typeof value.operationId !== 'string' || !OPERATION_ID.test(value.operationId))
    return failure('invalid', 'A bounded operationId is required.');
  if (!Number.isSafeInteger(value.timeoutMs) || value.timeoutMs < 1 || value.timeoutMs > 60_000)
    return failure('invalid', 'timeoutMs must be between 1 and 60000.');
  if (value.signal !== undefined && !(value.signal instanceof AbortSignal))
    return failure('invalid', 'signal must be an AbortSignal.');
  return ok(value);
}

function errorResult(error, fallbackCode, fallbackMessage) {
  if (error instanceof PlatformFailure) return failure(error.code, error.message);
  const name = error?.name;
  if (name === 'AbortError') return failure('cancelled', 'The operation was cancelled.');
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return failure('denied', 'The operation was denied.');
  if (name === 'QuotaExceededError') return failure('quota', 'Storage quota was exceeded.');
  return failure(fallbackCode, fallbackMessage);
}

/** Execute one platform operation with a deadline and an optional AbortSignal.
 * Late resolution is observed but ignored, preventing unhandled rejections and state mutation after timeout.
 */
export async function runBounded(action, options, host = globalThis, fallback = {}) {
  const validated = validateOperationOptions(options);
  if (!validated.ok) return validated;
  if (options.signal?.aborted) return failure('cancelled', 'The operation was cancelled.');
  const setTimer = host.setTimeout?.bind(host) || setTimeout;
  const clearTimer = host.clearTimeout?.bind(host) || clearTimeout;
  let timer = 0;
  let abort = null;
  const work = Promise.resolve()
    .then(action)
    .then(
      (value) => ({ type: 'value', value }),
      (error) => ({ type: 'error', error }),
    );
  const races = [work];
  races.push(
    new Promise((resolve) => {
      timer = setTimer(() => resolve({ type: 'timeout' }), options.timeoutMs);
    }),
  );
  if (options.signal)
    races.push(
      new Promise((resolve) => {
        abort = () => resolve({ type: 'cancelled' });
        options.signal.addEventListener('abort', abort, { once: true });
      }),
    );
  const result = await Promise.race(races);
  clearTimer(timer);
  if (abort) options.signal.removeEventListener('abort', abort);
  if (result.type === 'value') return ok(result.value);
  if (result.type === 'timeout') return failure('timeout', 'The operation timed out.');
  if (result.type === 'cancelled') return failure('cancelled', 'The operation was cancelled.');
  return errorResult(
    result.error,
    fallback.code || 'unavailable',
    fallback.message || 'The platform operation is unavailable.',
  );
}

export function createLease(dispose) {
  let active = true;
  return Object.freeze({
    dispose() {
      if (!active) return;
      active = false;
      dispose();
    },
  });
}

function method(value, name) {
  if (typeof value?.[name] !== 'function') throw new TypeError(`Platform ${name}() is required.`);
}

export function assertPlatform(value) {
  if (!value || typeof value !== 'object') throw new TypeError('A platform implementation is required.');
  assertBuildIdentity(value.build);
  method(value, 'capabilities');
  method(value, 'subscribeLifecycle');
  method(value, 'openExternal');
  for (const name of ['emit', 'setPreferences', 'suspend', 'dispose']) method(value.feedback, name);
  for (const name of ['pickBackup', 'readLimited', 'writeBackup', 'release'])
    method(value.documents, name);
  for (const name of ['checkpoint', 'read', 'list']) method(value.recovery, name);
  method(value.assets, 'resolve');
  const capabilities = value.capabilities();
  if (
    !capabilities ||
    capabilities.target !== value.build.target ||
    typeof capabilities.nativeFeedback !== 'boolean' ||
    typeof capabilities.userDocuments !== 'boolean' ||
    typeof capabilities.recoveryVault !== 'boolean' ||
    capabilities.remoteTelemetry !== false
  )
    throw new TypeError('Platform capabilities do not match the build identity.');
  return value;
}
