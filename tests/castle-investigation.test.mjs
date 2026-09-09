import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, validate, complete, score } from '../src/castle/engine.mjs';
import { mergeTheories, labelQuestions } from '../src/castle/investigation.mjs';
import { mergeStates } from '../src/castle/backup.mjs';

const theory = (id, text) => ({ id, text, position: 'open', records: [] });
test('original castle saves gain empty investigation defaults without losing progress', () => {
  const old = complete(initial(), 'shelves', ['atlas', 'tides', 'stars', 'moss', 'letters']).state;
  delete old.theories;
  delete old.labels;
  const current = validate(old);
  assert.deepEqual(current.theories, []);
  assert.deepEqual(current.labels, {});
  assert.deepEqual(current.completed, old.completed);
});
test('hypotheses are bounded player assessments and can cite only collected records', () => {
  const s = initial();
  s.theories = [theory('h1', 'Is this a departure time?')];
  assert.equal(validate(s).theories[0].position, 'open');
  assert.equal(score(s), 0);
  s.theories[0].records = ['ticket'];
  assert.throws(() => validate(s), /not been collected/);
  s.theories[0].records = [];
  s.theories[0].position = 'proven-by-score';
  assert.throws(() => validate(s), /Invalid hypothesis/);
});
test('merging preserves different hypotheses with colliding IDs and refuses silent overflow', () => {
  assert.deepEqual(mergeTheories([theory('h1', 'First')], [theory('h1', 'Second')]), [
    theory('h1', 'First'),
    theory('h2', 'Second'),
  ]);
  const full = Array.from({ length: 8 }, (_, i) => theory(`h${i + 1}`, `Idea ${i}`));
  assert.throws(() => mergeTheories(full, [theory('h1', 'Ninth idea')]), /exceed/);
  const s = initial();
  s.theories = full;
  assert.deepEqual(mergeStates(s, s).theories, full);
});
test('curatorial labels require the completed object and supported answer, never add points', () => {
  let s = initial();
  s.labels.bridges = 'structure';
  assert.throws(() => validate(s), /curatorial/);
  delete s.labels.bridges;
  for (const [id, answer] of [
    ['bridges', { conclusion: 'impossible', odd: ['N', 'S', 'I', 'E'] }],
    ['magic', [4, 9, 2, 3, 5, 7, 8, 1, 6]],
    ['ur', 2],
  ]) {
    s = complete(s, id, answer, true).state;
    s.labels[id] = labelQuestions[id].answer;
  }
  assert.equal(Object.keys(validate(s).labels).length, 3);
  assert.equal(score(s), 30);
  s.labels.ur = 'rules';
  assert.throws(() => validate(s), /curatorial/);
});
