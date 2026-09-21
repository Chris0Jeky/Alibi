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

test('comparison preserves the supplied two or three record order', () => {
  assert.equal((evidenceComparison(records.slice(0, 2)).match(/<article /g) || []).length, 2);
  const html = evidenceComparison(records);
  assert.equal((html.match(/<article /g) || []).length, 3);
  assert.ok(html.indexOf('The maintenance slip') < html.indexOf('The corrected ticket'));
  assert.ok(html.indexOf('The corrected ticket') < html.indexOf('The green footpath'));
});

test('empty state and record copy remain safe', () => {
  assert.match(evidenceBoard([]), /useful place to start/i);
  const altered = { ...records[0], title: '<img src=x onerror=alert(1)>' };
  assert.doesNotMatch(evidenceBoard([altered, records[1]]), /<img/);
  assert.doesNotMatch(evidenceComparison([altered, records[1]]), /<img/);
});
