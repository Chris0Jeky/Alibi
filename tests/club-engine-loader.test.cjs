'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const delay = (milliseconds) =>
  new Promise((resolve) => setTimeout(() => resolve({ hung: true }), milliseconds));

test('a silent Games Room engine download times out, cleans up and remains retryable', async () => {
  const scripts = [];
  const context = {
    ALIBI_CLUB_CONFIG: { engine: '/assets/club-engines.js', engineTimeout: 10 },
    clearTimeout,
    console,
    document: {
      createElement() {
        return {
          removed: false,
          remove() {
            this.removed = true;
          },
        };
      },
      head: {
        append(script) {
          scripts.push(script);
        },
      },
    },
    JSON,
    setTimeout,
  };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/club.js'), 'utf8'), context);

  const first = await Promise.race([
    context.AlibiClub.engine().then(
      () => ({ resolved: true }),
      (error) => ({ error }),
    ),
    delay(80),
  ]);

  assert.equal(first.hung, undefined, 'the optional loader must have bounded completion');
  assert.match(first.error?.message || '', /did not finish loading/i);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].removed, true, 'a timed-out script tag is removed');

  const expected = { ready: true };
  const retry = context.AlibiClub.engine();
  assert.equal(scripts.length, 2, 'the failed promise does not poison later retries');
  context.AlibiClubEngines = expected;
  scripts[1].onload();

  assert.equal(await retry, expected);
  assert.equal(scripts[1].removed, true, 'a completed script tag is removed');
});
