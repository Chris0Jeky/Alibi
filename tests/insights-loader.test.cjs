'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.existsSync('src/insights-loader.js')
  ? fs.readFileSync('src/insights-loader.js', 'utf8')
  : '';

function fixture(existing) {
  const scripts = [];
  const context = {
    AlibiCore: existing ? { insights: existing } : {},
    ALIBI_CONFIG: { insights: './assets/insights.fixture.js' },
    document: {
      createElement: () => ({
        remove() {
          this.removed = true;
        },
      }),
      head: { append: (script) => scripts.push(script) },
    },
  };
  vm.runInNewContext(source, context);
  return { C: context.AlibiCore, scripts };
}

test('reasoning is dormant until requested and concurrent requests share one script', async () => {
  const { C, scripts } = fixture();
  assert.equal(scripts.length, 0);
  const first = C.loadInsights(),
    second = C.loadInsights();
  assert.equal(first, second);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, './assets/insights.fixture.js');
  C.insights = { deduction() {} };
  scripts[0].onload();
  assert.equal(await first, C.insights);
  assert.equal(await C.loadInsights(), C.insights);
  assert.equal(scripts.length, 1);
});

test('inline standalone reasoning needs no script request', async () => {
  const insights = { deduction() {} };
  const { C, scripts } = fixture(insights);
  assert.equal(await C.loadInsights(), insights);
  assert.equal(scripts.length, 0);
});

for (const event of ['onerror', 'onload']) {
  test(`a ${event} without an API rejects, removes the failed script and permits retry`, async () => {
    const { C, scripts } = fixture();
    const first = C.loadInsights();
    const rejected = assert.rejects(first, /Reasoning hints could not load/);
    scripts[0][event]();
    await rejected;
    assert.equal(scripts[0].removed, true);
    const retry = C.loadInsights();
    assert.notEqual(retry, first);
    assert.equal(scripts.length, 2);
    C.insights = { recap() {} };
    scripts[1].onload();
    assert.equal(await retry, C.insights);
  });
}
