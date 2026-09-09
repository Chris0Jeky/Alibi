import test from 'node:test';
import assert from 'node:assert/strict';
import { attachFeedback } from '../src/castle/feedback.mjs';

test('Feedback respects mute, reduced motion, backgrounding and disposal', async () => {
  const root = new EventTarget();
  const doc = new EventTarget();
  doc.hidden = false;
  root.host = { dataset: { sound: 'false', reduced: 'true' } };
  let opened = 0;
  let closed = 0;
  let played = 0;
  let moved = 0;
  root.querySelector = () => ({
    animate: () => {
      moved++;
      return { cancel() {} };
    },
  });
  class Audio {
    constructor() {
      opened++;
      this.currentTime = 0;
    }
    async resume() {}
    async close() {
      closed++;
    }
    createOscillator() {
      return {
        frequency: {},
        connect() {},
        disconnect() {},
        start: () => played++,
        stop() {},
      };
    }
    createGain() {
      return {
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      };
    }
  }
  const feedback = attachFeedback(root, { document: doc, AudioContext: Audio });
  const cue = () =>
    root.dispatchEvent(new CustomEvent('castle-feedback', { detail: { kind: 'place' } }));
  cue();
  await Promise.resolve();
  assert.equal(opened, 0);
  assert.equal(moved, 0);
  root.host.dataset.sound = 'true';
  cue();
  await Promise.resolve();
  assert.equal(played, 1);
  doc.hidden = true;
  doc.dispatchEvent(new Event('visibilitychange'));
  assert.equal(closed, 1);
  cue();
  assert.equal(opened, 1);
  feedback.dispose();
  doc.hidden = false;
  cue();
  assert.equal(opened, 1);
});
