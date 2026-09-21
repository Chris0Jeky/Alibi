import * as Cascade from './cascade.mjs';

self.onmessage = (event) => {
  try {
    const text = event.data?.text;
    if (typeof text !== 'string' || text.length > 32 * 1024)
      throw Error('Replay must be smaller than 32 KiB.');
    let value = null;
    try {
      value = JSON.parse(text);
    } catch {
      throw Error('That file is not a readable replay. Nothing was changed.');
    }
    Cascade.replay(value);
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || String(error) });
  }
};
