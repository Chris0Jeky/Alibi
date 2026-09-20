import test from 'node:test';
import assert from 'node:assert/strict';
import W from '../src/castle/content.mjs';
import { evidenceBoard, evidenceComparison } from '../src/castle/evidence-view.mjs';

const records = W.evidence.slice(0, 3);

test('collected evidence renders in source order with stable room links', () => {
  const html = evidenceBoard(records);
  assert.ok(html.indexOf('data-record-id="maintenance"') < html.indexOf('data-record-id="ticket"'));
  assert.ok(html.indexOf('data-record-id="ticket"') < html.indexOf('data-record-id="path"'));
  assert.match(html, /#\/quiet\/castle\/room\/library/);
  assert.match(html, /#\/quiet\/castle\/room\/observatory/);
  assert.match(html, /#\/quiet\/castle\/room\/cartography/);
  assert.doesNotMatch(html, /data-record-id="margin"/);
});

test('comparison accepts only two or three distinct known records', () => {
  const html = evidenceComparison(records);
  assert.equal((html.match(/<article /g) || []).length, 3);
  assert.throws(() => evidenceComparison(records.slice(0, 1)), /two or three/i);
  assert.throws(() => evidenceComparison([...records, W.evidence[3]]), /two or three/i);
  assert.throws(() => evidenceComparison([records[0], records[0]]), /distinct/i);
  assert.throws(
    () => evidenceComparison([records[0], { ...records[1], id: 'future-record' }]),
    /collected records/i,
  );
});

test('record copy is escaped in both the board and comparison', () => {
  const altered = { ...records[0], title: '<img src=x onerror=alert(1)>' };
  assert.doesNotMatch(evidenceBoard([altered, records[1]]), /<img/);
  assert.doesNotMatch(evidenceComparison([altered, records[1]]), /<img/);
});
