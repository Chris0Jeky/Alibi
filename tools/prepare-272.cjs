'use strict';
const fs = require('node:fs');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const edits = {"src/app.js":{"blob":"cc99ac2e9e5cfb5d36216c0f6013792933699cb1","edits":[["Tap ? → T → F to keep notes. Your marks are hypotheses, not verdicts.","Tap ? → T → F to keep notes. Arrow keys move between accounts; Enter cycles a mark. Your marks are hypotheses, not verdicts."],["    if (t === 'bridges')\n      return `<div class=\"toolrow\">","    if (t === 'dossier')\n      return '<p class=\"control-note\">Arrow keys move within the current evidence table. Enter cycles a mark; Tab reaches the other controls.</p>';\n    if (t === 'bridges')\n      return `<div class=\"toolrow\">"],["    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -p.size, ArrowDown: p.size }[e.key];","    if (\n      ['dossier', 'witness'].includes(p.type) &&\n      /^Arrow(Left|Right|Up|Down)$/.test(e.key)\n    ) {\n      const mark = e.target.closest?.('[data-action=\"mark\"][data-cell]');\n      if (!mark || mark.disabled || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;\n      const index = Number(mark.dataset.cell),\n        n = p.size,\n        offset = p.type === 'dossier' ? dossierTab * n * n : 0,\n        length = p.type === 'dossier' ? n * n : p.statements.length;\n      if (!Number.isInteger(index) || index < offset || index >= offset + length) return;\n      const local = index - offset;\n      let next = local;\n      if (p.type === 'dossier') {\n        if (e.key === 'ArrowLeft' && local % n > 0) next--;\n        if (e.key === 'ArrowRight' && local % n < n - 1) next++;\n        if (e.key === 'ArrowUp' && local >= n) next -= n;\n        if (e.key === 'ArrowDown' && local < length - n) next += n;\n      } else {\n        const step = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1;\n        next = Math.max(0, Math.min(length - 1, local + step));\n      }\n      e.preventDefault();\n      selectedCell = offset + next;\n      document.getElementById('mark-' + selectedCell)?.focus();\n      return;\n    }\n    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -p.size, ArrowDown: p.size }[e.key];"]]},"tests/browser_ui.py":{"blob":"2aafea8e2abfd6b17ebb1d59f7296ebb5810cf49","edits":[["from official_fixture import OFFICIAL_COUNT","from official_fixture import OFFICIAL_COUNT\nfrom mark_grid_cases import check_mark_keys"],["        if typ=='scene':\n            for person in p['people']:","        if typ in ['dossier','witness']:\n            check_mark_keys(page,p)\n            check(True,typ+' arrows, category bounds, Tab and Enter preserve board behavior')\n        if typ=='scene':\n            for person in p['people']:"]]}};
for (const [path, change] of Object.entries(edits)) {
  let source = fs.readFileSync(path, 'utf8');
  const hash = crypto.createHash('sha1').update('blob ' + Buffer.byteLength(source) + '\0').update(source).digest('hex');
  assert.equal(hash, change.blob, path + ' must match the reviewed source');
  for (const [before, after] of change.edits) {
    assert.equal(source.split(before).length, 2, path + ' replacement must be unique');
    source = source.replace(before, after);
  }
  fs.writeFileSync(path, source);
}
const path = 'docs/STATE.md';
let state = fs.readFileSync(path, 'utf8');
const outstanding = '- #272: complete dossier/witness arrow-key semantics without breaking their Tab/Enter paths.\n';
assert.equal(state.split(outstanding).length, 2);
state = state.replace(outstanding, '');
state = state.replace('| #263 / #275:', '| #272: evidence-grid keyboard candidate | Dossier arrows stay inside the active category; Witness arrows follow the account list. Native Tab/Enter remain intact. Four focused handler tests and actual controls at 390px/1280px pass locally. The shared browser helper runs in the existing UI suite. Exact-head full CI, independent review and physical accessibility acceptance remain separate. |\n| #263 / #275:');
fs.writeFileSync(path, state);
