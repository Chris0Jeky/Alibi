import * as Cascade from './cascade.mjs';

self.onmessage = (event) => {
  try {
    const text = event.data?.text;
    if (typeof text !== 'string' || text.length > 32 * 1024)
      throw Error('Replay must be smaller than 32 KiB.');
    const value = JSON.parse(text);
    Cascade.replay(value);
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || String(error) });
  }
};
