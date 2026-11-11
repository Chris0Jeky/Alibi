const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const build = require('../tools/build-timeline.cjs');

test('the optional desk emits one self-contained hashed asset with exact separate accounting', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-timeline-build-'));
  try {
    fs.mkdirSync(path.join(root, 'src/timeline-lab'), { recursive: true });
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'src/timeline-lab/style.css'), '.desk { color: navy; }');
    fs.writeFileSync(
      path.join(root, 'src/timeline-lab/entry.mjs'),
      'import css from "./style.css"; globalThis.AlibiTimeline = { css };',
    );
    const out = build(root, path.join(root, 'dist'));
    assert.equal(out.config.files.length, 1);
    assert.match(out.config.script, /^\.\/assets\/timeline-lab\.[a-f0-9]{12}\.js$/);
    const bytes = fs.readFileSync(path.join(root, 'dist', out.config.script));
    assert.equal(bytes.length, out.bytes);
    assert.equal(out.standalone.source, bytes.toString());
    const scope = {};
    vm.runInNewContext(bytes.toString(), scope);
    assert.match(scope.AlibiTimeline.css, /color: navy/);
    assert.deepEqual(build(root, path.join(root, 'dist')), out);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test('a pack above its own ceiling fails the build instead of shipping', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-timeline-big-'));
  try {
    fs.mkdirSync(path.join(root, 'src/timeline-lab'), { recursive: true });
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'src/timeline-lab/style.css'), 'x{}');
    const filler = Array.from(
      { length: 4000 },
      (_, i) => `"${i}-${'abcdef'.repeat((i % 9) + 2)}"`,
    ).join(',');
    fs.writeFileSync(
      path.join(root, 'src/timeline-lab/entry.mjs'),
      `import css from "./style.css"; globalThis.AlibiTimeline = { css, big: [${filler}] };`,
    );
    assert.throws(() => build(root, path.join(root, 'dist')), /48 KiB/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
