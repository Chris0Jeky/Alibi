import { assertPlatform } from './contract.mjs';
import { createWebPlatform } from './web.mjs';

let current = null;

/** Install one reviewed host adapter before any consumer asks for the platform.
 * Native entry points use this seam; ordinary browser startup needs no setup.
 */
export function installPlatform(platform) {
  if (current) throw new Error('A platform is already installed.');
  current = assertPlatform(platform);
  return current;
}

/** Resolve the installed host or create the explicit web fallback once. */
export function getPlatform(options) {
  current ||= assertPlatform(createWebPlatform(options));
  return current;
}

/** Test isolation only. Application code must never replace a live platform. */
export function __resetPlatformForTests() {
  current = null;
}
