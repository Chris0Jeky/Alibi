import { assertBuildIdentity, failure } from './contract.mjs';
import { createBrowserFallbackPlatform } from './web.mjs';

function unavailableDocuments() {
  return Object.freeze({
    async pickBackup() {
      return failure('unavailable', 'Native document plugins are not available in this preview.');
    },
    async readLimited() {
      return failure('unavailable', 'Native document plugins are not available in this preview.');
    },
    async writeBackup() {
      return failure('unavailable', 'Native document plugins are not available in this preview.');
    },
    async release() {},
  });
}

function assertAndroidBridge(host) {
  const bridge = host.Capacitor;
  if (
    !bridge ||
    typeof bridge.isNativePlatform !== 'function' ||
    typeof bridge.getPlatform !== 'function'
  )
    throw new TypeError('The Capacitor bridge is required for the Android preview adapter.');
  if (bridge.isNativePlatform() !== true)
    throw new TypeError('The Capacitor bridge does not report a native platform.');
  if (bridge.getPlatform() !== 'android')
    throw new TypeError('The Capacitor bridge does not report the Android platform.');
  if (host.location?.origin !== 'https://localhost')
    throw new TypeError('The Android preview adapter requires the https://localhost origin.');
}

/** Explicit Capacitor Android adapter. It never selects itself from browser identity. */
export function createAndroidPreviewPlatform(options = {}) {
  const host = options.host ?? globalThis;
  const build = assertBuildIdentity(options.build ?? host.ALIBI_PLATFORM_BUILD, 'android');
  if (build.flavor !== 'capacitor-preview')
    throw new TypeError('The Android preview adapter requires the capacitor-preview flavor.');
  assertAndroidBridge(host);
  const browser = createBrowserFallbackPlatform({ ...options, host, build });
  const capabilities = Object.freeze({
    target: 'android',
    nativeHost: true,
    nativeFeedback: false,
    userDocuments: false,
    recoveryVault: false,
    remoteTelemetry: false,
  });
  return Object.freeze({
    ...browser,
    capabilities: () => capabilities,
    documents: unavailableDocuments(),
  });
}
