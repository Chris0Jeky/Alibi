'use strict';

// Issue #580: phone landscape used to leave the Lantern Duel board below the fold.
// 299e17d8 places the board beside its controls; def02827 keeps a way back.
// This locks that source contract. It does not measure a painted viewport.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..', 'src');
const css = fs.readFileSync(path.join(root, 'club.css'), 'utf8');
const club = fs.readFileSync(path.join(root, 'club.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');

const shortLandscape =
  '@media (min-width: 600px) and (max-width: 1000px) and (max-height: 500px) ' +
  'and (orientation: landscape)';
const boardRule = new RegExp(
  '\\.club-boardpanel:has\\(#duel-0\\) > \\.duel-grid \\{' +
    '[^}]*grid-column:\\s*1;' +
    '[^}]*width:\\s*calc\\(100dvh - 148px\\)',
  's',
);

test('Lantern Duel short landscape keeps the board beside its controls', () => {
  assert.ok(
    css.includes('Short landscape: Lantern Duel only (#duel-0)'),
    'the duel landscape contract is present',
  );
  assert.ok(css.includes(shortLandscape), 'reported 667 by 375 and 844 by 390 viewports match');
  assert.match(css, boardRule);
  assert.match(css, /\.main:has\(#duel-0\) > \.club-gameheading > div:first-child/);
  assert.match(css, /width:\s*calc\(100dvh - 190px\)/);
});

test('the #duel-0 hook is the first Lantern Duel cell, not Tic-Tac-Toe', () => {
  const duelStart = club.indexOf('function duelPage');
  const ticStart = club.indexOf('function ticTacToePage');
  const duel = club.slice(duelStart, ticStart);
  const tic = club.slice(ticStart, club.indexOf('function ', ticStart + 10));
  assert.match(duel, /<section class="club-boardpanel">/);
  assert.match(
    duel,
    /<div class="duel-grid"[^>]*>\$\{s\.board\.map\(\(v, i\) => `<button id="duel-\$\{i\}"/,
  );
  assert.match(tic, /id="tictactoe-\$\{i\}"/);
  assert.doesNotMatch(tic, /id="duel-/);
  assert.match(app, /<main id="main" class="main" tabindex="-1">\$\{content\}/);
});
