'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict'),
  fs = require('node:fs'),
  vm = require('node:vm');
test('static delivery metadata shares official data while keeping its startup global', () => {
  const names = fs.readdirSync('dist/assets');
  const content = fs.readFileSync(
    'dist/assets/' + names.find((n) => /^official-content\..*\.js$/.test(n)),
    'utf8',
  );
  const script = fs.readFileSync(
    'dist/assets/' + names.find((n) => /^alibi\..*\.js$/.test(n)),
    'utf8',
  );
  const context = {};
  vm.createContext(context);
  vm.runInContext(content, context);
  assert.ok(context.ALIBI_CURATION.delivery, 'delivery metadata resides in official data');
  const assignment = script.match(
    /globalThis\.ALIBI_DELIVERY=globalThis\.ALIBI_CURATION\.delivery;/,
  );
  assert.ok(assignment, 'startup retains the established global without repeating the table');
  vm.runInContext(assignment[0], context);
  assert.equal(context.ALIBI_DELIVERY, context.ALIBI_CURATION.delivery);
  assert.ok(Object.keys(context.ALIBI_DELIVERY).length > 0);
  const temp = fs.mkdtempSync(
    require('node:path').join(require('node:os').tmpdir(), 'alibi-delivery-'),
  );
  try {
    fs.mkdirSync(require('node:path').join(temp, 'assets'));
    const values = {};
    for (const name of ['ALIBI_CURATION_MEDIA', 'ALIBI_MEDIA']) {
      const match = script.match(new RegExp('globalThis\\.' + name + '=(.*);\\n'));
      assert.ok(match, name);
      values[name] = JSON.parse(match[1]);
    }
    const expected = require('../tools/build-delivery.cjs')(
      process.cwd(),
      temp,
      values.ALIBI_CURATION_MEDIA,
      values.ALIBI_MEDIA,
    );
    assert.deepEqual(JSON.parse(JSON.stringify(context.ALIBI_DELIVERY)), expected.entries);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
