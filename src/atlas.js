/* One procedural scene, shared by OffscreenCanvas worker and main-thread fallback. */
(function (root) {
  'use strict';
  class Atlas {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', { alpha: false });
      this.paused = !!options.paused;
      this.hidden = false;
      this.quality = 30;
      this.time = 0;
      this.ripples = [];
      this.count = 0;
      this.cost = 0;
      this.since = performance.now();
      this.onStats = options.onStats || (() => {});
      this.resize(options);
      this.draw();
      this.schedule();
    }
    resize({ width = 1000, height = 480, dpr = 1 }) {
      this.width = Math.max(1, width);
      this.height = Math.max(1, height);
      this.dpr = Math.min(dpr, 1.5);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
    }
    schedule() {
      clearTimeout(this.timer);
      if (!this.hidden && !this.paused)
        this.timer = setTimeout(() => {
          this.time += 1 / this.quality;
          const start = performance.now();
          this.draw();
          this.count++;
          this.cost += performance.now() - start;
          const now = performance.now();
          if (now - this.since > 1000) {
            this.onStats({
              fps: Math.round((this.count * 1000) / (now - this.since)),
              cost: this.cost / this.count,
            });
            this.count = 0;
            this.cost = 0;
            this.since = now;
          }
          this.schedule();
        }, 1000 / this.quality);
    }
    message(m) {
      if (m.type === 'resize') {
        this.resize(m);
        this.draw();
      }
      if (m.type === 'ripple') {
        this.ripples.push({ x: m.x * 1100, y: m.y * 550, t: this.time });
        this.ripples = this.ripples.slice(-12);
        this.draw();
      }
      if (m.type === 'pause') this.paused = m.value;
      if (m.type === 'quality') this.quality = m.value === 60 ? 60 : 30;
      if (m.type === 'hidden') this.hidden = m.value;
      this.schedule();
      if (this.paused || this.hidden) this.onStats({ fps: 0, cost: 0 });
    }
    stop() {
      clearTimeout(this.timer);
    }
    draw() {
      const c = this.ctx,
        t = this.time;
      c.setTransform(this.canvas.width / 1100, 0, 0, this.canvas.height / 550, 0, 0);
      const polygon = (points, fill, stroke) => {
        c.beginPath();
        points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.fillStyle = fill;
        c.fill();
        if (stroke) {
          c.strokeStyle = stroke;
          c.stroke();
        }
      };
      const line = (x, y, x2, y2, color, width = 1) => {
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x2, y2);
        c.strokeStyle = color;
        c.lineWidth = width;
        c.stroke();
      };
      const sky = c.createLinearGradient(0, 0, 0, 550);
      sky.addColorStop(0, '#193f52');
      sky.addColorStop(0.48, '#647f80');
      sky.addColorStop(0.7, '#c2b18e');
      sky.addColorStop(1, '#547f86');
      c.fillStyle = sky;
      c.fillRect(0, 0, 1100, 550);
      c.fillStyle = '#e6d5a7';
      c.beginPath();
      c.arc(830, 112, 37, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#ffffff60';
      for (let i = 0; i < 32; i++) {
        const x = (i * 137 + 21) % 1100,
          y = (i * 53 + 17) % 180;
        c.fillRect(x, y, 1.5, 1.5);
      }
      polygon(
        [
          [0, 258],
          [0, 174],
          [112, 134],
          [194, 187],
          [331, 133],
          [462, 223],
          [596, 157],
          [717, 205],
          [826, 172],
          [1010, 224],
          [1100, 181],
          [1100, 280],
        ],
        '#294f5e',
      );
      polygon(
        [
          [0, 270],
          [0, 214],
          [140, 228],
          [324, 203],
          [486, 240],
          [678, 211],
          [860, 248],
          [1030, 220],
          [1100, 235],
          [1100, 291],
        ],
        '#456a72',
      );
      const sea = c.createLinearGradient(0, 258, 0, 550);
      sea.addColorStop(0, '#678d91');
      sea.addColorStop(1, '#193f53');
      c.fillStyle = sea;
      c.fillRect(0, 258, 1100, 292);
      for (let row = 0; row < 24; row++) {
        const y = 270 + row * 12;
        for (let j = 0; j < 11; j++) {
          const x = (j * 119 + row * 31 + Math.sin(t * 0.2 + row) * 9) % 1150;
          line(x, y, x + 20 + Math.sin(t + row + j) * 13, y, '#acc6b52e', 1);
        }
      }
      for (let i = 0; i < 16; i++) {
        const y = 265 + i * 10,
          w = 7 + i * 3;
        line(830 - w + Math.sin(t + i) * 5, y, 830 + w + Math.sin(t + i) * 5, y, '#d1be872c', 2);
      }
      polygon(
        [
          [0, 353],
          [331, 281],
          [622, 385],
          [424, 447],
          [0, 427],
        ],
        '#2a4e55',
      );
      polygon(
        [
          [0, 333],
          [329, 262],
          [627, 365],
          [424, 421],
          [0, 408],
        ],
        '#8b9b8c',
      );
      polygon(
        [
          [0, 377],
          [332, 310],
          [472, 359],
          [371, 387],
        ],
        '#a9ae95',
      );
      const house = (x, y, w, h, roof, wall) => {
        polygon(
          [
            [x, y],
            [x + w * 0.5, y - 16],
            [x + w, y],
            [x + w, y + h],
            [x + w * 0.5, y + h + 16],
            [x, y + h],
          ],
          wall,
        );
        polygon(
          [
            [x + w * 0.5, y - 16],
            [x + w, y],
            [x + w, y + h],
            [x + w * 0.5, y + h + 16],
          ],
          '#345b61',
        );
        polygon(
          [
            [x - 8, y + 2],
            [x + w * 0.5, y - 38],
            [x + w + 8, y + 2],
            [x + w * 0.5, y + 18],
          ],
          roof,
        );
        for (let row = 0; row < Math.max(1, Math.floor(h / 22)); row++) {
          c.fillStyle = '#e8cd91';
          c.fillRect(x + 9, y + 20 + row * 20, 8, 9);
          c.fillRect(x + 25, y + 25 + row * 20, 8, 9);
          c.fillStyle = '#cdae77';
          c.fillRect(x + w * 0.5 + 13, y + 22 + row * 20, 6, 8);
        }
      };
      house(65, 238, 72, 83, '#674f48', '#bbad88');
      house(165, 225, 88, 104, '#776653', '#bac1a1');
      house(270, 241, 65, 60, '#476e6d', '#b0bc9a');
      house(360, 278, 76, 60, '#785b4c', '#c1b493');
      polygon(
        [
          [183, 180],
          [183, 114],
          [204, 96],
          [226, 114],
          [226, 179],
          [204, 190],
        ],
        '#b9baa0',
      );
      polygon(
        [
          [179, 116],
          [204, 85],
          [231, 116],
          [204, 128],
        ],
        '#454f4d',
      );
      c.fillStyle = '#ebd494';
      c.fillRect(196, 129, 12, 16);
      // Timber pier and a working lighthouse.
      polygon(
        [
          [517, 380],
          [763, 454],
          [777, 445],
          [545, 369],
        ],
        '#b2a789',
      );
      polygon(
        [
          [517, 380],
          [763, 454],
          [763, 463],
          [517, 389],
        ],
        '#4f6262',
      );
      for (let i = 0; i < 11; i++)
        line(536 + i * 20, 380 + i * 6, 549 + i * 20, 375 + i * 6, '#716c5b', 1);
      polygon(
        [
          [793, 280],
          [850, 261],
          [898, 279],
          [866, 305],
        ],
        '#849184',
      );
      polygon(
        [
          [817, 194],
          [849, 189],
          [872, 202],
          [880, 274],
          [844, 291],
          [810, 274],
        ],
        '#d0c7a9',
      );
      polygon(
        [
          [849, 189],
          [872, 202],
          [880, 274],
          [844, 291],
        ],
        '#819793',
      );
      polygon(
        [
          [808, 199],
          [817, 179],
          [855, 168],
          [878, 194],
          [846, 212],
        ],
        '#475b5d',
      );
      c.fillStyle = '#efcf85';
      c.fillRect(826, 178, 27, 17);
      polygon(
        [
          [812, 176],
          [843, 152],
          [868, 177],
          [840, 190],
        ],
        '#776d52',
      );
      const sweep = Math.sin(t * 0.14) * 0.15;
      c.globalAlpha = 0.12;
      polygon(
        [
          [840, 182],
          [1100, 109 + sweep * 200],
          [1100, 237 + sweep * 200],
        ],
        '#f5df8e',
      );
      c.globalAlpha = 1;
      for (let i = 0; i < 7; i++) {
        const x = 79 + i * 61,
          y = 363 - i * 13;
        line(x, y - 24, x, y, '#364c4f', 3);
        c.fillStyle = '#f0cf88';
        c.beginPath();
        c.arc(x, y - 24, 3.5, 0, 7);
        c.fill();
      }
      const boat = (x, y, scale) => {
        c.save();
        c.translate(x, y + Math.sin(t * 1.6 + x) * 1.5);
        c.scale(scale, scale);
        polygon(
          [
            [-24, 0],
            [20, 0],
            [12, 8],
            [-13, 8],
          ],
          '#d0b38b',
        );
        polygon(
          [
            [-10, -4],
            [-10, -22],
            [4, -22],
            [9, -4],
          ],
          '#ebe1c2',
        );
        line(-5, -24, -5, -43, '#394f54', 1);
        polygon(
          [
            [-4, -43],
            [-4, -24],
            [15, -24],
          ],
          '#ddd8ba',
        );
        line(-30, 11, 21, 11, '#bed5c275', 1);
        c.restore();
      };
      boat(((t * 5 + 780) % 1300) - 70, 399, 1);
      boat(595 + Math.sin(t * 0.1) * 50, 488, 0.85);
      for (let i = 0; i < 26; i++) {
        const x = (i * 157 + Math.sin(t * 0.11 + i) * 17) % 1100,
          y = 438 + ((i * 33) % 111);
        const glow = 0.45 + Math.sin(t + i) * 0.2;
        c.fillStyle = `rgba(237,194,108,${glow})`;
        c.fillRect(x, y, 3, 3);
        line(x - 2, y + 5, x + 5, y + 5, '#cfb6793d', 1);
      }
      this.ripples = this.ripples.filter((r) => t - r.t < 4);
      for (const r of this.ripples) {
        const age = t - r.t;
        c.strokeStyle = `rgba(238,215,163,${Math.max(0, 0.7 - age / 6)})`;
        c.lineWidth = 1.5;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.ellipse(r.x, r.y, age * 29 + 8 + k * 9, age * 9 + 3 + k * 3, 0, 0, Math.PI * 2);
          c.stroke();
        }
      }
      c.font = '11px Georgia';
      c.fillStyle = '#e4dec487';
      c.fillText('ALIBI  /  WEST QUAY', 34, 518);
    }
  }
  root.AlibiAtlas = Atlas;
  if (typeof document === 'undefined') {
    let scene = null;
    root.onmessage = (e) => {
      if (e.data.type === 'init')
        scene = new Atlas(e.data.canvas, { ...e.data, onStats: (data) => root.postMessage(data) });
      else scene?.message(e.data);
    };
  }
})(globalThis);
