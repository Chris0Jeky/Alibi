import * as view from './view.mjs';
import { attachFeedback } from './feedback.mjs';
import { createPackCache } from './cache.mjs';

const cache = createPackCache(() => globalThis.ALIBI_QUIET_CONFIG?.castle);
let active;
async function mount(options) {
  const handle = await view.mount(options);
  active = handle;
  const feedback = attachFeedback(options.root);
  return {
    ...handle,
    setPreferences(value) {
      handle.setPreferences(value);
      feedback.sync();
    },
    dispose() {
      if (active === handle) active = null;
      feedback.dispose();
      handle.dispose();
    },
  };
}
async function cachePack() {
  const ready = await cache.load();
  active?.setOffline(ready);
  return ready;
}
globalThis.AlibiCastle = {
  mount,
  flush: view.flush,
  diagnostics: view.diagnostics,
  exportBackup: view.exportBackup,
  prepareImport: view.prepareImport,
  cachePack,
  offline: cache.available,
};
