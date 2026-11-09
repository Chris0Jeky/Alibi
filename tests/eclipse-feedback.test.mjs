import test from 'node:test';
import assert from 'node:assert/strict';
import { feedbackText, canSendFeedback, reviewFeedback } from '../src/eclipse-lab/feedback.mjs';

const puzzle = { id: 'eclipse-01', revision: 1, mode: 'eclipse' };
const run = { rating: 4, difficulty: 'just-right', feedback: 'The windows made sense.' };
function fixture() {
  const calls = [];
  const host = {
    AlibiVoices: { eligible: true },
    ALIBI_VOICES: { chunk: './assets/voices.pinned.js' },
    AlibiActivities: {
      async loadSource(config) {
        calls.push(['load', config]);
        host.AlibiVoicesSheet = { open: (...args) => calls.push(['open', ...args]) };
      },
    },
  };
  return { host, calls, opener: { isConnected: true }, current: () => true };
}

test('the review text reads only saved experiment metadata and impressions', () => {
  const privateField = {
    get() {
      throw Error('private game state read');
    },
  };
  const p = Object.defineProperty({ ...puzzle }, 'solution', privateField);
  const r = Object.defineProperties(
    { ...run },
    {
      cells: privateField,
      undo: privateField,
      redo: privateField,
      recovery: privateField,
    },
  );
  assert.equal(
    feedbackText(p, r),
    'Eclipse Lab\nExperiment: eclipse\nPuzzle: eclipse-01\nRevision: 1\nEnjoyment: 4/5\nDifficulty: just-right\n\nFeedback:\nThe windows made sense.',
  );
});

test('review loads the existing composer and sends nothing by itself', async () => {
  const f = fixture();
  assert.equal(await reviewFeedback(puzzle, run, f.opener, f.current, f.host), true);
  assert.deepEqual(f.calls, [
    ['load', { script: './assets/voices.pinned.js' }],
    ['open', 'puzzle', '', feedbackText(puzzle, run), f.opener],
  ]);
  await reviewFeedback(puzzle, run, f.opener, f.current, f.host);
  assert.equal(f.calls.filter(([kind]) => kind === 'load').length, 1);
});

test('preview and unknown origins cannot load or submit the composer', async () => {
  for (const eligible of [false, undefined, 1, 'true']) {
    const f = fixture();
    f.host.AlibiVoices.eligible = eligible;
    assert.equal(canSendFeedback(f.host), false);
    await assert.rejects(
      reviewFeedback(puzzle, run, f.opener, f.current, f.host),
      /main Alibi site/,
    );
    assert.deepEqual(f.calls, []);
  }
  assert.equal(canSendFeedback({}), false);
});

test('an overlong note is preserved and refused before loading, never silently truncated', async () => {
  const f = fixture();
  const long = { ...run, feedback: 'x'.repeat(2000) };
  await assert.rejects(
    reviewFeedback(puzzle, long, f.opener, f.current, f.host),
    /Shorten your note.*Nothing was sent/,
  );
  assert.equal(long.feedback.length, 2000);
  assert.deepEqual(f.calls, []);
});

test('a delayed load cannot open a composer after leaving the level or disconnecting its control', async () => {
  for (const disconnected of [false, true]) {
    const f = fixture();
    let release,
      current = true;
    const original = f.host.AlibiActivities.loadSource;
    f.host.AlibiActivities.loadSource = async (config) => {
      await new Promise((r) => {
        release = r;
      });
      await original(config);
    };
    const pending = reviewFeedback(puzzle, run, f.opener, () => current, f.host);
    if (disconnected) f.opener.isConnected = false;
    else current = false;
    release();
    assert.equal(await pending, false);
    assert.equal(
      f.calls.some(([kind]) => kind === 'open'),
      false,
    );
  }
});

test('load failure is actionable and a later explicit action can retry', async () => {
  const f = fixture(),
    original = f.host.AlibiActivities.loadSource;
  f.host.AlibiActivities.loadSource = async () => {
    throw Error('network');
  };
  await assert.rejects(
    reviewFeedback(puzzle, run, f.opener, f.current, f.host),
    /Feedback could not open/,
  );
  f.host.AlibiActivities.loadSource = original;
  assert.equal(await reviewFeedback(puzzle, run, f.opener, f.current, f.host), true);
});
