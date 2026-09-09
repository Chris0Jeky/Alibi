import * as view from './view.mjs';
import { attachFeedback } from './feedback.mjs';

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
globalThis.AlibiCastle = { mount, flush: view.flush, diagnostics: view.diagnostics };
