import * as view from './view.mjs';
import { attachFeedback } from './feedback.mjs';
import { createPackCache } from './cache.mjs';

const cache = createPackCache(() => globalThis.ALIBI_QUIET_CONFIG?.castle);
async function mount(options) {
  const handle = await view.mount(options);
  const feedback = attachFeedback(options.root);
  return {
    ...handle,
    setPreferences(value) {
      handle.setPreferences(value);
      feedback.sync();
    },
    dispose() {
      feedback.dispose();
      handle.dispose();
    },
  };
}
globalThis.AlibiCastle = {
  mount, flush: view.flush, diagnostics: view.diagnostics,
  cachePack: cache.load, offline: cache.available,
};
