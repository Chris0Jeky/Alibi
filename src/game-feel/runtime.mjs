/** Small, event-driven game presentation primitives. No game rules or save writes here. */
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

/** Convert a pointer to a top-left board origin. Do not clamp an off-board drop into legality. */
export function dropOrigin(point, board, shape, grip = { x: 0.5, y: 0.5 }, lift = 0) {
  const cell = board.width / 8;
  const width = Math.max(...shape.map(([x]) => x)) + 1;
  const height = Math.max(...shape.map(([, y]) => y)) + 1;
  const x = Math.round((point.x - board.left) / cell - width * grip.x);
  const y = Math.round((point.y - board.top - lift) / cell - height * grip.y);
  return x < 0 || y < 0 || x + width > 8 || y + height > 8 ? -1 : y * 8 + x;
}

/** Renders while invalidated/animating, sleeps when settled, and never catches up hidden time. */
export class FrameLoop {
  constructor(draw, host = globalThis) {
    this.host = host;
    this.draw = draw;
    this.frame = 0;
    this.dead = false;
    this.samples = [];
    this.tick = (time) => {
      this.frame = 0;
      if (this.dead || host.document?.hidden) return;
      const start = host.performance.now();
      const again = this.draw(time);
      this.samples.push(host.performance.now() - start);
      if (this.samples.length > 120) this.samples.shift();
      if (again) this.invalidate();
    };
    this.visibility = () => {
      if (host.document.hidden) this.cancel();
      else this.invalidate();
    };
    host.document?.addEventListener('visibilitychange', this.visibility);
  }
  invalidate() {
    if (!this.dead && !this.frame && !this.host.document?.hidden)
      this.frame = this.host.requestAnimationFrame(this.tick);
  }
  cancel() {
    if (this.frame) this.host.cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
  stats() {
    const values = [...this.samples].sort((a, b) => a - b);
    return {
      samples: values.length,
      drawP95Ms: values[Math.floor((values.length - 1) * 0.95)] || 0,
      scheduled: !!this.frame,
    };
  }
  dispose() {
    this.dead = true;
    this.cancel();
    this.host.document?.removeEventListener('visibilitychange', this.visibility);
  }
}

/** One gesture owns one pointer. Cancellation is never a placement. */
export function bindDrag(element, hooks) {
  let active = null;
  const listeners = [];
  const listen = (target, name, fn, options) => {
    target.addEventListener(name, fn, options);
    listeners.push(() => target.removeEventListener(name, fn, options));
  };
  const cancel = () => {
    if (!active) return;
    const prior = active;
    active = null;
    if (element.hasPointerCapture?.(prior.id)) element.releasePointerCapture(prior.id);
    hooks.cancel?.();
  };
  listen(element, 'pointerdown', (e) => {
    if (active || e.button !== 0 || e.isPrimary === false) return;
    const target = e.target.closest('[data-piece]');
    if (!target || !element.contains(target) || target.disabled) return;
    const slot = Number(target.dataset.piece);
    if (hooks.start(slot, e) === false) return;
    active = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, slot };
    element.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  listen(element, 'pointermove', (e) => {
    if (!active || e.pointerId !== active.id) return;
    active.moved ||= Math.hypot(e.clientX - active.x, e.clientY - active.y) > 6;
    hooks.move(e, active.moved);
  });
  listen(element, 'pointerup', (e) => {
    if (!active || e.pointerId !== active.id) return;
    const prior = active;
    active = null;
    if (element.hasPointerCapture?.(prior.id)) element.releasePointerCapture(prior.id);
    hooks.end(e, prior.moved);
  });
  listen(element, 'pointercancel', cancel);
  listen(element, 'lostpointercapture', cancel);
  listen(globalThis, 'blur', cancel);
  listen(globalThis, 'resize', cancel);
  listen(document, 'visibilitychange', () => {
    if (document.hidden) cancel();
  });
  return () => {
    cancel();
    listeners.forEach((off) => off());
  };
}

/** Opt-in local sound; a native shell may inject impact(). Rejections cannot break a move. */
export function createFeedback(native = null) {
  let context = null,
    enabled = false,
    haptics = false,
    dead = false;
  return {
    configure(options) {
      enabled = !!options.sound;
      haptics = !!options.haptics;
    },
    unlock() {
      if (dead || !enabled) return;
      try {
        const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (!Audio) return;
        context ||= new Audio();
        if (context.state === 'suspended') context.resume().catch(() => {});
      } catch {
        /* Sound remains optional. */
      }
    },
    play(kind = 'place', strength = 1) {
      if (dead) return;
      if (haptics) {
        try {
          if (native?.impact) Promise.resolve(native.impact(kind)).catch(() => {});
          else globalThis.navigator?.vibrate?.(kind === 'clear' ? [10, 24, 10] : 6);
        } catch {
          /* Missing hardware is an ordinary fallback. */
        }
      }
      if (!enabled || !context || context.state !== 'running') return;
      const now = context.currentTime;
      const frequencies = kind === 'clear' ? [392, 494, 587] : kind === 'reject' ? [130] : [294];
      frequencies.forEach((frequency, i) => {
        const oscillator = context.createOscillator(),
          gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency * Math.min(1.5, 1 + (strength - 1) * 0.08);
        gain.gain.setValueAtTime(0, now + i * 0.035);
        gain.gain.linearRampToValueAtTime(0.035, now + i * 0.035 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.035 + 0.16);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(now + i * 0.035);
        oscillator.stop(now + i * 0.035 + 0.18);
      });
    },
    dispose() {
      dead = true;
      context?.close().catch(() => {});
      context = null;
    },
  };
}
