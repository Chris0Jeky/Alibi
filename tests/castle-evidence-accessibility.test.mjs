import test from 'node:test';
import assert from 'node:assert/strict';
import W from '../src/castle/content.mjs';
import { escape } from '../src/castle/html.mjs';
import { evidenceBoard, evidenceComparison } from '../src/castle/evidence-view.mjs';

const records = W.evidence.slice(0, 3);
const choices = (html) => [...html.matchAll(/<input\b[^>]*data-compare-record[^>]*>/g)];

test('each comparison choice names its collected record', () => {
  const inputs = choices(evidenceBoard(records));
  assert.equal(inputs.length, records.length);
  records.forEach((record, index) => {
    assert.ok(inputs[index][0].includes(`aria-label="Compare ${escape(record.title)}"`));
  });
});

test('selection guidance is visible and described by choices and the compare action', () => {
  const html = evidenceBoard(records);
  assert.match(html, /<p\b[^>]*id="compare-guidance"[^>]*>Select 2 or 3 collected records, then choose Compare\.<\/p>/);
  for (const [input] of choices(html)) {
    assert.match(input, /aria-describedby="compare-guidance"/);
  }
  assert.match(html, /<button\b[^>]*data-do="compare-records"[^>]*aria-describedby="compare-guidance"/);
  assert.equal((html.match(/id="compare-guidance"/g) || []).length, 1);
});

test('record names are escaped inside accessible attributes', () => {
  const record = { ...records[0], title: 'A "ticket" & <note>' };
  const [[input]] = choices(evidenceBoard([record]));
  assert.ok(input.includes(`aria-label="Compare ${escape(record.title)}"`));
  assert.doesNotMatch(input, /aria-label="Compare A "ticket"/);
});

test('empty and read-only comparisons do not expose selection controls', () => {
  assert.equal(choices(evidenceBoard([])).length, 0);
  const comparison = evidenceComparison(records);
  assert.equal(choices(comparison).length, 0);
  assert.doesNotMatch(comparison, /compare-guidance/);
});
