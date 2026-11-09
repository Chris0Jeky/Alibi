const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const build = require('../tools/build-eclipse.cjs');

test('the optional lab emits one self-contained hashed asset with exact separate accounting', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alibi-eclipse-build-'));
  try {
    fs.mkdirSync(path.join(root, 'src/eclipse-lab'), { recursive: true });
    fs.mkdirSync(path.join(root, 'dist'));
    fs.writeFileSync(path.join(root, 'src/eclipse-lab/style.css'), '.lab { color: navy; }');
    fs.writeFileSync(
      path.join(root, 'src/eclipse-lab/entry.mjs'),
      'import css from "./style.css"; globalThis.AlibiEclipse = { css };',
    );
    const out = build(root, path.join(root, 'dist'));
    assert.equal(out.config.files.length, 1);
    assert.match(out.config.script, /^\.\/assets\/eclipse-lab\.[a-f0-9]{12}\.js$/);
    const bytes = fs.readFileSync(path.join(root, 'dist', out.config.script));
    assert.equal(bytes.length, out.bytes);
    assert.equal(out.standalone.source, bytes.toString());
    const scope = {};
    vm.runInNewContext(bytes.toString(), scope);
    assert.match(scope.AlibiEclipse.css, /color: navy/);
    assert.deepEqual(build(root, path.join(root, 'dist')), out);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
