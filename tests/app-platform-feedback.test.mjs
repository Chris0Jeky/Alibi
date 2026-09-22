import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createWebPlatform } from '../src/platform/web.mjs';

const app = fs.readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
function between(start, end) {
  assert.equal(app.split(start).length, 2);
  assert.equal(app.split(end).length, 2);
  return app.slice(app.indexOf(start), app.indexOf(end));
}
const feedback = between('  function feedbackSound()', '  function blocked()');
const commit = between('  function commit(next,', '  function act(action,');
const settings = { haptics: true, sound: false, reducedMotion: true };
const build = {
  target: 'web',
  sourceSha: '1'.repeat(40),
  sourceDirty: false,
  payloadSha256: '2'.repeat(64),
  appVersion: 'fixture',
  contentManifestRevision: 'fixture',
  rulesCompatibility: {},
};

function play(platform) {
  const calls = [];
  const context = {
    settings,
    platform,
    current: { state: { cell: 0 }, undo: [], redo: [], moves: 0, hints: 0 },
    C: { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b), clone: structuredClone },
    checking: false,
    feedback: '',
    completion: () => calls.push('complete'),
    enqueueSave: () => calls.push('save'),
    render: () => calls.push('render'),
  };
  const result = vm.runInNewContext(feedback + commit + '\ncommit({cell:1});', context);
  assert.equal(result, true, 'validated move returns synchronously');
  assert.equal(context.current.moves, 1);
  assert.deepEqual(calls, ['complete', 'save', 'render']);
}

test('actual move commit still completes, saves and renders when browser vibration throws', () => {
  let attempted = 0;
  const platform = createWebPlatform({
    build,
    host: {
      navigator: {
        vibrate() {
          attempted++;
          throw Error('fixture device failure');
        },
      },
    },
  });
  platform.feedback.setPreferences(settings);
  play(platform);
  assert.equal(attempted, 1);
});

test('a throwing, rejected or unresolved feedback adapter cannot escape or delay a move', async () => {
  for (const emit of [
    () => {
      throw Error('fixture adapter failure');
    },
    () => Promise.reject(Error('fixture adapter rejection')),
    () => new Promise(() => {}),
  ])
    play({ feedback: { emit } });
  await new Promise((resolve) => setImmediate(resolve));
});

test('application owns its lifecycle lease and retains it only for a cached-page return', async () => {
  const source = between(
    '  const platformLifecycle =',
    "  window.addEventListener('beforeinstallprompt'",
  );
  const calls = [];
  let listener, hide;
  const context = {
    settings,
    platform: {
      subscribeLifecycle: async (callback) => {
        listener = callback;
        return { dispose: () => calls.push('release') };
      },
      feedback: {
        suspend: () => calls.push('suspend'),
        setPreferences: () => calls.push('resume'),
        dispose: () => calls.push('dispose'),
      },
    },
    window: {
      addEventListener: (name, callback) => {
        assert.equal(name, 'pagehide');
        hide = callback;
      },
    },
    endPaint: () => calls.push('end-paint'),
    enqueueSave: () => calls.push('save'),
  };
  await vm.runInNewContext(`(async()=>{${source}})()`, context);
  listener({ kind: 'pause' });
  listener({ kind: 'resume' });
  hide({ persisted: true });
  assert.deepEqual(calls, [
    'end-paint',
    'save',
    'suspend',
    'resume',
    'end-paint',
    'save',
    'suspend',
  ]);
  hide({ persisted: false });
  assert.deepEqual(calls.slice(-5), ['end-paint', 'save', 'suspend', 'release', 'dispose']);
});
