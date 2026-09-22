import { assertBuildIdentity } from './contract.mjs';
import { installPlatform } from './index.mjs';
import { createBrowserFallbackPlatform } from './web.mjs';

function targetFromMarker(host) {
  const marker = host.ALIBI_BUILD_TARGET;
  if (marker === undefined || marker === 'standalone') return 'web';
  if (marker === 'android') return 'android';
  throw new TypeError('ALIBI_BUILD_TARGET must be absent, standalone, or android.');
}

/** Select and publish the browser adapter before application consumers initialize. */
export function bootstrapPlatform(options = {}) {
  const host = options.host ?? globalThis;
  const target = targetFromMarker(host);
  const build = assertBuildIdentity(options.build ?? host.ALIBI_PLATFORM_BUILD, target);
  if (Object.hasOwn(host, 'AlibiPlatform')) throw new Error('AlibiPlatform is already defined.');
  if (!Object.isExtensible(host)) throw new Error('AlibiPlatform cannot be defined on this host.');

  const adapterFactory = options.adapterFactory ?? createBrowserFallbackPlatform;
  if (typeof adapterFactory !== 'function')
    throw new TypeError('A platform adapter factory is required.');
  const candidate = adapterFactory({ host, build });
  const adapterBuild = assertBuildIdentity(candidate?.build, target);
  if (JSON.stringify(adapterBuild) !== JSON.stringify(build))
    throw new TypeError('Platform adapter identity does not match the selected build identity.');
  const platform = installPlatform(candidate);
  Object.defineProperty(host, 'AlibiPlatform', {
    value: platform,
    enumerable: true,
    writable: false,
    configurable: false,
  });
  return platform;
}
