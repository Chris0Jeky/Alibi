import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createCaseReceipt } from '../src/castle/case-receipt.mjs';
import { CASE_HASH } from '../src/castle/case-state.mjs';

const definition = JSON.parse(
  readFileSync(new URL('../content/cases/reading-room-blackout.json', import.meta.url)),
);
const makeReceipt = () => createCaseReceipt({ definition, sourceSha256: CASE_HASH });

test('Castle receipt stays off until consent and snapshots only prior assistance', () => {
  const receipt = makeReceipt();
  receipt.mode(true);
  receipt.hint('window');
  receipt.reveal('window');
  receipt.submission('window', false, [{ hasVerdict: false, citations: [] }]);
  assert.equal(receipt.enabled, false);
  assert.equal(receipt.draft, null);

  assert.equal(
    receipt.start({ storyOn: false, stageId: 'window', completed: false, priorAssistance: true }),
    true,
  );
  assert.equal(receipt.enabled, true);
  const draft = receipt.draft;
  assert.equal(draft.format, 'postern-case-playtest-1');
  assert.equal(draft.sourceSha256, CASE_HASH);
  assert.deepEqual(draft.modes, ['storyOff']);
  assert.deepEqual(draft.stages, [
    {
      id: 'window',
      outcome: 'not-completed',
      assisted: true,
      priorAssistance: true,
      hints: 0,
      reveals: 0,
      submissions: 0,
      rejectedIncomplete: 0,
      rejectedReasoning: 0,
      afterCompletion: 0,
    },
  ]);
});

test('active Castle collection separates help, checks, completion, revisits, and abandoned stages', () => {
  const receipt = makeReceipt();
  receipt.start({ storyOn: true, stageId: 'window', completed: false });
  receipt.mode(false);
  receipt.hint('window');
  receipt.reveal('window');
  receipt.submission('window', false, [{ hasVerdict: false, citations: [] }]);
  receipt.submission('window', false, [{ hasVerdict: true, citations: [true] }]);
  receipt.submission('window', true, [{ hasVerdict: true, citations: [true] }]);
  receipt.open('window', true);
  receipt.submission('window', true, [{ hasVerdict: true, citations: [true] }]);
  receipt.open('alarm', false);

  const draft = receipt.draft;
  assert.deepEqual(draft.modes, ['storyOn', 'storyOff']);
  assert.deepEqual(draft.stages, [
    {
      id: 'window',
      outcome: 'completed',
      assisted: true,
      priorAssistance: false,
      hints: 1,
      reveals: 1,
      submissions: 3,
      rejectedIncomplete: 1,
      rejectedReasoning: 1,
      afterCompletion: 1,
    },
    {
      id: 'alarm',
      outcome: 'not-completed',
      assisted: false,
      priorAssistance: false,
      hints: 0,
      reveals: 0,
      submissions: 0,
      rejectedIncomplete: 0,
      rejectedReasoning: 0,
      afterCompletion: 0,
    },
  ]);
  const serialized = JSON.stringify(draft);
  for (const forbidden of ['answer text', 'checks', 'notebook', 'deviceId', 'drafts', 'timestamp'])
    assert.equal(serialized.includes(forbidden), false);
});

test('review is editable, copy is explicit and exact, rejection keeps the preview, cancel returns off', async () => {
  const receipt = makeReceipt();
  receipt.start({ storyOn: true, stageId: 'window', completed: false });
  assert.equal(receipt.review(), true);
  const markup = receipt.markup();
  assert.match(markup, /Review local playtest receipt/);
  assert.match(markup, /id="case-receipt-observation"/);
  assert.match(markup, /id="case-receipt-preview"/);
  assert.match(markup, /postern-case-playtest-1/);
  receipt.observe('  synthetic local observation  ');
  const preview = receipt.preview;
  assert.match(preview, /synthetic local observation/);
  assert.equal(
    await receipt.copy(async () => {
      throw new Error('denied');
    }),
    'blocked',
  );
  assert.equal(receipt.preview, preview);

  let resolve;
  let calls = 0;
  const pending = receipt.copy((text) => {
    calls++;
    assert.equal(text, preview);
    return new Promise((done) => {
      resolve = done;
    });
  });
  assert.equal(receipt.copying, true);
  assert.equal(
    await receipt.copy(() => {
      calls++;
    }),
    'ignored',
  );
  resolve();
  assert.equal(await pending, 'copied');
  assert.equal(calls, 1);
  assert.equal(receipt.reviewing, false);

  receipt.cancel();
  assert.equal(receipt.enabled, false);
  assert.equal(receipt.draft, null);
  assert.equal(receipt.reviewing, false);
});

test('disposal makes a pending copy result stale and drops receipt state', async () => {
  const receipt = makeReceipt();
  receipt.start({ storyOn: true, stageId: 'window', completed: false });
  receipt.review();
  let finish;
  const pending = receipt.copy(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  receipt.dispose();
  finish();
  assert.equal(await pending, 'stale');
  assert.equal(receipt.enabled, false);
  assert.equal(receipt.preview, null);
});

test('cancel invalidates pending UI completion without claiming to undo a clipboard request', async () => {
  const receipt = makeReceipt();
  receipt.start({ storyOn: true, stageId: 'window', completed: false });
  receipt.review();
  let finish;
  let calls = 0;
  const pending = receipt.copy(() => {
    calls++;
    return new Promise((resolve) => {
      finish = resolve;
    });
  });
  assert.equal(receipt.cancel(), true);
  finish();
  assert.equal(await pending, 'stale');
  assert.equal(calls, 1);
  assert.equal(receipt.enabled, false);
  assert.equal(receipt.preview, null);
});
