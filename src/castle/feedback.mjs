/** Small optional responses; neither animation nor sound participates in game state. */
export function attachFeedback(root, environment = {}) {
  const doc = environment.document || globalThis.document;
  const Audio =
    environment.AudioContext || globalThis.AudioContext || globalThis.webkitAudioContext;
  const abort = new AbortController();
  const voices = new Set(),
    animations = new Set();
  let context = null,
    generation = 0,
    disposed = false;
  const allowed = () => !disposed && !doc.hidden && root.host.dataset.sound === 'true';
  function stopSound() {
    generation++;
    for (const voice of voices) {
      try {
        voice.stop();
      } catch {}
    }
    voices.clear();
    const old = context;
    context = null;
    old?.close().catch(() => {});
  }
  function sync() {
    if (!allowed()) stopSound();
    if (doc.hidden || root.host.dataset.reduced === 'true') {
      for (const animation of animations) animation.cancel();
      animations.clear();
    }
  }
  async function cue(event) {
    const kind = event.detail?.kind;
    if (disposed || doc.hidden || !['place', 'undo', 'complete'].includes(kind)) return;
    if (root.host.dataset.reduced !== 'true') {
      const animation = root
        .querySelector('#board')
        ?.animate?.([{ transform: 'translateY(1px)' }, { transform: 'translateY(0)' }], {
          duration: kind === 'complete' ? 220 : 130,
          easing: 'ease-out',
        });
      if (animation) {
        animations.add(animation);
        animation.onfinish = animation.oncancel = () => animations.delete(animation);
      }
    }
    if (!allowed() || !Audio) return;
    try {
      if (!context) context = new Audio();
      const ctx = context,
        token = ++generation;
      await ctx.resume();
      if (token !== generation || ctx !== context || !allowed()) return;
      for (const voice of voices) {
        try {
          voice.stop();
        } catch {}
      }
      voices.clear();
      const tone = ctx.createOscillator(),
        gain = ctx.createGain(),
        now = ctx.currentTime;
      tone.type = 'sine';
      tone.frequency.value = kind === 'complete' ? 620 : kind === 'undo' ? 240 : 360;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.022, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      tone.connect(gain);
      gain.connect(ctx.destination);
      tone.onended = () => {
        voices.delete(tone);
        tone.disconnect();
        gain.disconnect();
      };
      voices.add(tone);
      tone.start(now);
      tone.stop(now + 0.11);
    } catch {
      stopSound();
    }
  }
  root.addEventListener('castle-feedback', cue, { signal: abort.signal });
  root.addEventListener('change', sync, { signal: abort.signal });
  doc.addEventListener('visibilitychange', sync, { signal: abort.signal });
  return {
    sync,
    dispose() {
      disposed = true;
      abort.abort();
      stopSound();
      for (const animation of animations) animation.cancel();
      animations.clear();
    },
  };
}
