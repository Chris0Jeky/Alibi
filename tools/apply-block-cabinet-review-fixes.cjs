'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function exact(filename, before, after, label) {
  const absolute = path.join(ROOT, filename);
  const source = fs.readFileSync(absolute, 'utf8');
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label} expected one match in ${filename}; found ${count}.`);
  fs.writeFileSync(absolute, source.replace(before, after));
}

exact(
  'src/block-cabinet/style.css',
  '  position: relative;\n  overflow: hidden;\n}\n.bc-studio::before {',
  '  position: relative;\n  overflow: clip;\n}\n.bc-studio::before {',
  'Block Cabinet overflow boundary',
);

const existing = `## Block Cabinet integration candidate (not deployed)\n\nA separately hashed optional surface now attaches to the original Club Block Cabinet rules and save queue. Cascade uses an independent versioned replay store, with a separate export and a bounded replay-validation worker. The initial loader is a small separate shell script; heavy game code and art load on entry. The integration honors the app-level reduced-motion setting. See [architecture](BLOCK-CABINET-ENGINE.md) and the browser acceptance suite. This is a review candidate, not a hosted release or physical Android acceptance.\n`;
const replacement = `## Block Cabinet phone action hierarchy candidate, 2026-09-17 (not deployed)\n\nPR #176 keeps Undo, Redo, Rotate, Cancel and restart/new-seed together as the primary phone action set while sound, haptics, motion and replay/display tools remain reachable as secondary options. A persistent selected-piece summary reports dimensions, occupied squares, orientation and legal origins. Invalid placements preserve the selection and explain the rejection; Cancel and Escape clear it with deterministic focus recovery. The phone action group remains inside the viewport while the page scrolls.\n\nThe exact-head Chromium suite exercises phone and desktop widths, primary and secondary hierarchy, selection details, legal origins, invalid-placement persistence, cancellation, focus recovery, restart confirmation and phone scrolling. The original Block Cabinet rules, replay reducer and save owner are unchanged. This remains simulated browser evidence: physical Android touch, TalkBack, comfort review and human acceptance stay open in [HUMAN_TODO.md](../HUMAN_TODO.md).\n\n${existing}`;
exact('docs/STATE.md', existing, replacement, 'Block Cabinet state section');
