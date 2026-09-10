/* Fetch the browser validator with a bounded response and body lifetime. */
(function (G) {
  'use strict';
  const MAX_BYTES = 4 * 1024 * 1024,
    DEADLINE_MS = 10000;

  function tooLarge() {
    return Error('The validator asset exceeds its 4 MiB limit.');
  }

  async function readBody(response) {
    const declared = Number(response.headers?.get?.('content-length'));
    if (Number.isFinite(declared) && declared > MAX_BYTES) throw tooLarge();
    if (!response.body || typeof response.body.getReader !== 'function')
      throw Error('The validator response body is unavailable.');
    const reader = response.body.getReader(),
      chunks = [];
    let bytes = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        bytes += part.value.byteLength;
        if (bytes > MAX_BYTES) {
          await reader.cancel().catch(() => {});
          throw tooLarge();
        }
        chunks.push(part.value);
      }
    } finally {
      reader.releaseLock?.();
    }
    const data = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      data.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder().decode(data);
  }

  async function load(url) {
    if (!url) throw Error('The validator could not be loaded. Reconnect and try again.');
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), DEADLINE_MS);
    try {
      const response = await fetch(url, {
        credentials: 'same-origin',
        signal: controller.signal,
      });
      if (!response.ok) throw Error('The validator could not be loaded. Reconnect and try again.');
      return await readBody(response);
    } catch (error) {
      if (controller.signal.aborted)
        throw Error('The validator could not be loaded before its 10-second deadline.');
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  G.AlibiValidatorLoader = { load, maxBytes: MAX_BYTES, deadlineMs: DEADLINE_MS };
})(globalThis);
