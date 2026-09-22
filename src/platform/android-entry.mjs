import { Capacitor } from '@capacitor/core';
import { bootstrapPlatform } from './bootstrap.mjs';
import { createAndroidPreviewPlatform } from './android.mjs';

const host = globalThis;
if (host.Capacitor !== Capacitor)
  throw new TypeError('The official Capacitor bridge must be installed on globalThis.Capacitor.');
if (host.ALIBI_BUILD_TARGET !== 'android')
  throw new TypeError('The Android entry requires an explicit android build marker.');

bootstrapPlatform({
  host,
  adapterFactory: ({ host: adapterHost, build }) =>
    createAndroidPreviewPlatform({ host: adapterHost, build }),
});
