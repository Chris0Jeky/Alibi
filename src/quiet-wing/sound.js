/* User-initiated playback only. No audio clock or preference belongs to the save engine. */
(function (G) {
  class Sound {
    constructor() {
      this.events = new AbortController();
      this.cues = new Map();
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) this.stop();
        },
        { signal: this.events.signal },
      );
    }
    play(id) {
      if (this.disposed || document.hidden) return;
      const asset = G.QWExperience?.audio.find((a) => a.id === id);
      if (!asset) return;
      let cue = this.cues.get(id);
      if (!cue) {
        cue = new Audio(asset.url);
        cue.preload = 'none';
        cue.volume = 0.55;
        this.cues.set(id, cue);
      }
      // Rapid taps cannot accumulate overlapping cues.
      for (const other of this.cues.values()) other.pause();
      cue.currentTime = 0;
      cue.play().catch(() => {});
    }
    ambience(id) {
      this.ambient?.pause();
      this.ambient = null;
      if (this.disposed || document.hidden || !id) return;
      const asset = G.QWExperience?.audio.find((a) => a.id === id && a.loop);
      if (!asset) return;
      this.ambient = new Audio(asset.url);
      this.ambient.loop = true;
      this.ambient.volume = 0.22;
      this.ambient.play().catch(() => {});
    }
    stop() {
      this.ambient?.pause();
      for (const cue of this.cues.values()) cue.pause();
    }
    dispose() {
      this.disposed = true;
      this.events.abort();
      this.stop();
      for (const cue of [...this.cues.values(), this.ambient].filter(Boolean)) {
        cue.removeAttribute('src');
        cue.load();
      }
      this.cues.clear();
      this.ambient = null;
    }
  }
  G.QWSound = Sound;
})(globalThis);
