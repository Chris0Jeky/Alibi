// #433 in-app collection adder: listed, same-directory, size-bounded and SHA-256-checked delivery.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { fetchPack, handOff, COLLECTIONS } from '../src/workshop-add.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(import.meta.dirname, '..');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'content/workshop/catalogue.json')));
const BASE = 'https://alibi.test/assets/workshop/add.0123456789ab.js';
const source = (id) => {
  const entry = policy.collections.find((item) => item.id === id);
  return fs.readFileSync(path.join(root, 'content/workshop', entry.source));
};
const listed = (id) => {
  const entry = policy.collections.find((item) => item.id === id);
  return {
    id,
    title: id,
    bytes: entry.bytes,
    sha256: entry.sha256,
    download: `${id}.${entry.sha256}.json`,
  };
};
const chunked = (bytes, size = 4096) =>
  new ReadableStream({
    start(controller) {
      for (let at = 0; at < bytes.length; at += size)
        controller.enqueue(bytes.subarray(at, at + size));
      controller.close();
    },
  });
function recorder(respond) {
  const calls = [];
  const get = async (url, options) => {
    calls.push({ url: String(url), options });
    return respond(url, options);
  };
  return { calls, get };
}

test('the source module lists nothing until the build embeds the hashed catalogue', () => {
  assert.deepEqual(COLLECTIONS, []);
});

test('a listed pack loads from the same directory only after its size and digest match', async () => {
  const entry = listed('lattice'),
    bytes = source('lattice'),
    seen = [];
  const { calls, get } = recorder(() => new Response(chunked(bytes)));
  const loaded = await fetchPack(entry, BASE, get, (got, total) => seen.push([got, total]));
  assert.deepEqual(Buffer.from(loaded), bytes);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://alibi.test/assets/workshop/${entry.download}`);
  assert.deepEqual(calls[0].options, { credentials: 'same-origin', redirect: 'error' });
  assert.deepEqual(seen.at(-1), [bytes.length, bytes.length], 'progress reaches the listed size');
  assert.ok(seen.length > 1, 'progress is reported while downloading');
  assert.equal(JSON.parse(Buffer.from(loaded)).puzzles.length, 24);
});

test('a tampered, truncated or oversized pack is refused', async () => {
  const entry = listed('afterlight'),
    bytes = source('afterlight');
  const tampered = Buffer.from(bytes);
  tampered[40] ^= 1;
  for (const [label, body, pattern] of [
    ['tampered', tampered, /fingerprint/],
    ['truncated', bytes.subarray(0, bytes.length - 1), /fingerprint/],
    ['oversized', Buffer.concat([bytes, Buffer.from(' ')]), /larger than listed/],
  ])
    await assert.rejects(
      fetchPack(entry, BASE, async () => new Response(chunked(body))),
      (error) => pattern.test(error.message) && /Nothing was installed/.test(error.message),
      label,
    );
});

test('an endless response is cut off at the listed size instead of being buffered', async () => {
  const entry = listed('lattice');
  let pulled = 0,
    cancelled = false;
  const endless = new ReadableStream({
    pull(controller) {
      pulled++;
      controller.enqueue(new Uint8Array(4096));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    fetchPack(entry, BASE, async () => new Response(endless)),
    /larger than listed/,
  );
  assert.ok(pulled <= Math.ceil(entry.bytes / 4096) + 2, `read ${pulled} chunks`);
  assert.ok(cancelled, 'the download is cancelled');
});

test('cancelling before a download starts makes no request', async () => {
  const controller = new AbortController();
  controller.abort();
  const { calls, get } = recorder(() => new Response(source('lattice')));
  await assert.rejects(
    fetchPack(listed('lattice'), BASE, get, undefined, controller.signal),
    /cancelled.*Nothing was installed/,
  );
  assert.equal(calls.length, 0);
});

test('cancelling a pending response discards and cancels even a late body', async () => {
  const controller = new AbortController();
  let resolve,
    cancelled = false;
  const { calls, get } = recorder(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const pending = fetchPack(listed('lattice'), BASE, get, undefined, controller.signal);
  controller.abort();
  resolve(
    new Response(
      new ReadableStream({
        start(stream) {
          stream.enqueue(source('lattice'));
          stream.close();
        },
        cancel() {
          cancelled = true;
        },
      }),
    ),
  );
  await assert.rejects(pending, /cancelled.*Nothing was installed/);
  assert.equal(calls[0].options.signal, controller.signal);
  assert.equal(cancelled, true, 'an ignored abort cannot leave an unneeded response streaming');
});

test('cancelling while reading stops the stream and never returns bytes for installation', async () => {
  const controller = new AbortController();
  let stream,
    cancelled = false;
  const body = new ReadableStream({
    start(value) {
      stream = value;
      value.enqueue(source('lattice'));
    },
    cancel() {
      cancelled = true;
    },
  });
  const pending = fetchPack(
    listed('lattice'),
    BASE,
    async () => new Response(body),
    () => controller.abort(),
    controller.signal,
  );
  // Let the old implementation finish, so a missing cancellation fails rather than hanging.
  const timer = setTimeout(() => {
    if (!cancelled) stream.close();
  }, 30);
  try {
    await assert.rejects(pending, /cancelled.*Nothing was installed/);
    assert.equal(cancelled, true);
  } finally {
    clearTimeout(timer);
  }
});

test('unavailable, offline or invalid listings fail closed before anything is handed on', async () => {
  const entry = listed('lattice');
  await assert.rejects(
    fetchPack(entry, BASE, async () => new Response('missing', { status: 404 })),
    /unavailable/,
  );
  await assert.rejects(
    fetchPack(entry, BASE, async () => {
      throw TypeError('Failed to fetch');
    }),
    /needs a connection; installed puzzles still play offline/,
  );
  for (const change of [
    { download: '../lattice.json' },
    { download: '//evil.test/x.json' },
    { download: `other.${entry.sha256}.json` },
    { sha256: 'A'.repeat(64) },
    { bytes: 3 * 1024 * 1024 + 1 },
    { bytes: 0 },
    { id: '../x' },
  ]) {
    const { calls, get } = recorder(() => new Response(source('lattice')));
    await assert.rejects(fetchPack({ ...entry, ...change }, BASE, get), /listing is not valid/);
    assert.equal(calls.length, 0, 'an invalid listing never reaches the network');
  }
  await assert.rejects(
    fetchPack(undefined, BASE, async () => {}),
    /listing is not valid/,
  );
});

test('verified bytes reach the existing importer as one chosen JSON file', async () => {
  const events = [],
    input = { dispatchEvent: (event) => events.push(event) };
  globalThis.DataTransfer = class {
    constructor() {
      const list = [];
      this.items = { add: (file) => list.push(file) };
      this.files = list;
    }
  };
  try {
    const bytes = source('lattice');
    handOff(bytes, listed('lattice'), input);
    assert.equal(input.files.length, 1);
    assert.equal(input.files[0].name, 'lattice.json');
    assert.equal(input.files[0].type, 'application/json');
    assert.deepEqual(Buffer.from(await input.files[0].arrayBuffer()), bytes);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'change');
    assert.equal(events[0].bubbles, true);
  } finally {
    delete globalThis.DataTransfer;
  }
});

test('the built adder embeds exactly the shipped listing and verifies the shipped files', async () => {
  const { buildShelf } = require('../tools/build-workshop-shelf.cjs');
  const { loadCatalogue } = require('../tools/workshop-catalogue.cjs');
  const shelf = buildShelf(root),
    manifest = loadCatalogue(root).manifest;
  const adder = shelf.files.find((file) =>
    /^assets\/workshop\/add\.[a-f0-9]{12}\.js$/.test(file.path),
  );
  assert.ok(adder);
  assert.equal(shelf.loaderURL, './' + adder.path);
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-adder-'));
  try {
    for (const file of shelf.files) {
      fs.mkdirSync(path.join(temp, path.dirname(file.path)), { recursive: true });
      fs.writeFileSync(path.join(temp, file.path), file.data);
    }
    const built = await import(pathToFileURL(path.join(temp, adder.path)).href);
    assert.deepEqual(
      built.COLLECTIONS.map(({ id, download, bytes, sha256, count }) => ({
        id,
        download,
        bytes,
        sha256,
        count,
      })),
      manifest.collections.map(({ id, download, bytes, sha256, count }) => ({
        id,
        download,
        bytes,
        sha256,
        count,
      })),
    );
    const readLocal = async (url) => new Response(fs.readFileSync(url));
    for (const entry of built.COLLECTIONS) {
      const bytes = await built.fetchPack(entry, undefined, readLocal);
      assert.equal(bytes.length, entry.bytes, entry.id);
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
