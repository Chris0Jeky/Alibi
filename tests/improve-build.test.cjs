'use strict';
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const {
  PATH_ROUTE_ALIASES,
  pathRouteAliasDocument,
  files,
  zip,
} = require('../tools/build.cjs');

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  for (let k = 0; k < 8; k++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = CRC_TABLE[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const withTempDir = (prefix, fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const zipEntries = (dir, entries) => {
  const out = path.join(dir, 'out.zip');
  zip(entries, out);
  return fs.readFileSync(out);
};

// Minimal parser for the layout tools/build.cjs emits: local headers,
// central directory, end record. Offsets mirror the ZIP spec fields.
const parseZip = (buf) => {
  const locals = [];
  let offset = 0;
  while (buf.readUInt32LE(offset) === 0x04034b50) {
    const flag = buf.readUInt16LE(offset + 6);
    const method = buf.readUInt16LE(offset + 8);
    const crc = buf.readUInt32LE(offset + 14);
    const compSize = buf.readUInt32LE(offset + 18);
    const uncompSize = buf.readUInt32LE(offset + 22);
    const nameLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.slice(offset + 30, offset + 30 + nameLen).toString('utf8');
    const dataStart = offset + 30 + nameLen + extraLen;
    const compData = buf.slice(dataStart, dataStart + compSize);
    locals.push({ offset, flag, method, crc, compSize, uncompSize, name, compData });
    offset = dataStart + compSize;
  }
  const centrals = [];
  while (buf.readUInt32LE(offset) === 0x02014b50) {
    const flag = buf.readUInt16LE(offset + 8);
    const method = buf.readUInt16LE(offset + 10);
    const crc = buf.readUInt32LE(offset + 16);
    const compSize = buf.readUInt32LE(offset + 20);
    const uncompSize = buf.readUInt32LE(offset + 24);
    const nameLen = buf.readUInt16LE(offset + 28);
    const headerOffset = buf.readUInt32LE(offset + 42);
    const name = buf.slice(offset + 46, offset + 46 + nameLen).toString('utf8');
    centrals.push({ offset, flag, method, crc, compSize, uncompSize, name, headerOffset });
    offset += 46 + nameLen;
  }
  assert.equal(buf.readUInt32LE(offset), 0x06054b50, 'end-of-central-directory signature');
  const eocd = {
    offset,
    countDisk: buf.readUInt16LE(offset + 8),
    countTotal: buf.readUInt16LE(offset + 10),
    cdSize: buf.readUInt32LE(offset + 12),
    cdOffset: buf.readUInt32LE(offset + 16),
  };
  return { locals, centrals, eocd, totalLength: buf.length };
};

const sampleEntries = () => [
  ['hello.txt', 'hello world. '.repeat(60)],
  ['data.bin', Buffer.from('binary-payload-'.repeat(80))],
];

test('files sorts entries (mutant: drop .sort())', () => {
  withTempDir('alibi-files-sort-', (dir) => {
    for (const name of ['b.txt', 'c.txt', 'a.txt']) fs.writeFileSync(path.join(dir, name), name);
    const original = fs.readdirSync;
    fs.readdirSync = (d, o) => {
      const entries = original.call(fs, d, o);
      if (path.resolve(d) !== dir) return entries;
      return [...entries].sort((x, y) => (x.name < y.name ? 1 : x.name > y.name ? -1 : 0));
    };
    try {
      const got = files(dir);
      assert.deepEqual(
        got,
        ['a.txt', 'b.txt', 'c.txt'].map((n) => path.join(dir, n)),
      );
    } finally {
      fs.readdirSync = original;
    }
  });
});

test('files recurses into subdirectories (mutant: drop recursion guard)', () => {
  withTempDir('alibi-files-recurse-', (dir) => {
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, 'top.txt'), 'top');
    fs.writeFileSync(path.join(dir, 'sub', 'inner.txt'), 'inner');
    const got = files(dir);
    assert.deepEqual(got, [path.join(dir, 'sub', 'inner.txt'), path.join(dir, 'top.txt')].sort());
  });
});

test('files lists directory contents, not the directory itself (mutant: flip isDirectory branches)', () => {
  withTempDir('alibi-files-dir-', (dir) => {
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, 'sub', 'inner.txt'), 'inner');
    const got = files(dir);
    assert.deepEqual(got, [path.join(dir, 'sub', 'inner.txt')]);
    assert.ok(!got.includes(path.join(dir, 'sub')));
  });
});

test('zip stores the true CRC-32 of each entry (mutant: drop/zero the crc branch)', () => {
  withTempDir('alibi-zip-crc-', (dir) => {
    const entries = sampleEntries();
    const { locals } = parseZip(zipEntries(dir, entries));
    assert.equal(locals.length, entries.length);
    for (let i = 0; i < entries.length; i++) {
      const raw = Buffer.isBuffer(entries[i][1]) ? entries[i][1] : Buffer.from(entries[i][1]);
      assert.equal(locals[i].crc, crc32(raw), `crc of ${entries[i][0]}`);
    }
  });
});

test('zip keeps compressed/uncompressed sizes in order (mutant: swap the two size arguments)', () => {
  withTempDir('alibi-zip-sizes-', (dir) => {
    const entries = sampleEntries();
    const { locals } = parseZip(zipEntries(dir, entries));
    for (let i = 0; i < entries.length; i++) {
      const raw = Buffer.isBuffer(entries[i][1]) ? entries[i][1] : Buffer.from(entries[i][1]);
      assert.ok(
        locals[i].compSize !== raw.length || locals[i].uncompSize !== raw.length,
        'fixture sizes differ so a swap is observable',
      );
      assert.equal(locals[i].uncompSize, raw.length, `uncompressed size of ${entries[i][0]}`);
      assert.deepEqual(zlib.inflateRawSync(locals[i].compData), raw, `payload of ${entries[i][0]}`);
      assert.equal(locals[i].compSize, locals[i].compData.length);
    }
  });
});

test('zip marks entries as deflated method 8 (mutant: flip method 8 to stored 0)', () => {
  withTempDir('alibi-zip-method-', (dir) => {
    const { locals, centrals } = parseZip(zipEntries(dir, sampleEntries()));
    for (const local of locals) assert.equal(local.method, 8, `local method of ${local.name}`);
    for (const central of centrals) assert.equal(central.method, 8, `central method of ${central.name}`);
  });
});

test('zip central offsets point at local headers (mutant: drop name length from offset)', () => {
  withTempDir('alibi-zip-offset-', (dir) => {
    const entries = [['long-name-here.txt', 'x'.repeat(200)], ['b.txt', 'y'.repeat(200)]];
    const buf = zipEntries(dir, entries);
    const { locals, centrals, eocd } = parseZip(buf);
    assert.equal(centrals.length, entries.length);
    for (let i = 0; i < entries.length; i++) {
      assert.equal(centrals[i].name, entries[i][0]);
      assert.equal(centrals[i].headerOffset, locals[i].offset, `offset of ${entries[i][0]}`);
      assert.equal(buf.readUInt32LE(centrals[i].headerOffset), 0x04034b50);
    }
    const last = locals[locals.length - 1];
    assert.equal(eocd.cdOffset, last.offset + 30 + Buffer.byteLength(last.name) + last.compSize);
    assert.equal(eocd.cdSize, eocd.offset - eocd.cdOffset);
  });
});

test('zip end record counts match the entry count (mutant: move count boundary by one)', () => {
  withTempDir('alibi-zip-count-', (dir) => {
    const entries = sampleEntries();
    const { eocd, centrals } = parseZip(zipEntries(dir, entries));
    assert.equal(eocd.countDisk, entries.length);
    assert.equal(eocd.countTotal, entries.length);
    assert.equal(centrals.length, entries.length);
  });
});

test('zip sets the UTF-8 filename flag (mutant: drop the 0x800 flag)', () => {
  withTempDir('alibi-zip-flag-', (dir) => {
    const { locals, centrals } = parseZip(zipEntries(dir, sampleEntries()));
    for (const local of locals) assert.equal(local.flag, 0x800, `local flag of ${local.name}`);
    for (const central of centrals) assert.equal(central.flag, 0x800, `central flag of ${central.name}`);
  });
});

test('zip of no entries still emits a valid end record (mutant: return early on empty)', () => {
  withTempDir('alibi-zip-empty-', (dir) => {
    const buf = zipEntries(dir, []);
    assert.equal(buf.length, 22);
    const { locals, centrals, eocd } = parseZip(buf);
    assert.deepEqual(locals, []);
    assert.deepEqual(centrals, []);
    assert.equal(eocd.countDisk, 0);
    assert.equal(eocd.countTotal, 0);
    assert.equal(eocd.cdSize, 0);
  });
});

test('alias document titles the alias, routes to the target (mutant: swap alias/target arguments)', () => {
  const document = pathRouteAliasDocument('my-alias', 'my-target');
  assert.ok(document.includes('<title>Alibi · my-alias</title>'), 'title names the alias');
  assert.ok(document.includes('url=/#/my-target'), 'meta refresh routes to the target');
  assert.ok(document.includes(`var h=location.hash||'#/my-target'`), 'script defaults to the target');
  assert.ok(!document.includes('#/my-alias'), 'alias never appears as a route');
});

test('alias redirect keeps the leading slash (mutant: drop the "/" prefix)', () => {
  const document = pathRouteAliasDocument('privacy', PATH_ROUTE_ALIASES.privacy);
  assert.ok(document.includes(`location.replace('/'+h)`), 'redirect prefixes the hash route');
});

test('alias redirect strips the outer question mark (mutant: move slice boundary to 0)', () => {
  const document = pathRouteAliasDocument('about', PATH_ROUTE_ALIASES.about);
  assert.ok(document.includes('q.slice(1)'), 'outer query drops its leading ?');
});

test('alias document keeps its standalone preamble (mutant: drop the doctype/head guard)', () => {
  const document = pathRouteAliasDocument('login', PATH_ROUTE_ALIASES.login);
  assert.ok(document.startsWith('<!doctype html><html lang="en">'), 'doctype and language survive');
  assert.ok(document.includes('<meta charset="utf-8">'), 'charset survives');
  assert.ok(document.includes('<a href="/#/login">Continue to Alibi</a>'), 'fallback link survives');
});
