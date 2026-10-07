'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
const assetNames = fs.readdirSync(path.join(root, 'dist/assets'));
const initialScriptName = assetNames.find((name) => /^alibi\.[a-f0-9]{12}\.js$/.test(name));
assert.ok(initialScriptName, 'Initial JavaScript is emitted');
const initialScript = fs.readFileSync(path.join(root, 'dist/assets', initialScriptName), 'utf8');
for (const globalName of [
  'ALIBI_HOUSE_CONFIG',
  'ALIBI_DELIVERY',
  'ALIBI_CURATION_MEDIA',
  'ALIBI_CONFIG',
  'ALIBI_QUIET_CONFIG',
  'ALIBI_MEDIA',
  'ALIBI_WORKER_URL',
  'ALIBI_CLUB_CONFIG',
])
  assert.ok(
    initialScript.includes(`globalThis.${globalName}=`),
    `${globalName} remains in the initial configuration preamble`,
  );
assert.ok(
  !initialScript.includes('ALIBI_DISCOVERY_STORAGE_URL'),
  'Unwired discovery storage stays out of the initial JavaScript',
);
const serviceWorker = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
const deferredAssets = [
  ['Pulseboard SDK', /^pulseboard\.[a-f0-9]{12}\.js$/, info.observatoryBytes],
  ['Discovery storage', /^discovery-storage\.[a-f0-9]{12}\.js$/, info.discoveryStorageBytes],
];
for (const [label, pattern, reportedBytes] of deferredAssets) {
  const matches = assetNames.filter((name) => pattern.test(name));
  assert.equal(matches.length, 1, `One hashed ${label.toLowerCase()} asset is emitted`);
  const name = matches[0];
  assert.equal(
    fs.statSync(path.join(root, 'dist/assets', name)).size,
    reportedBytes,
    `${label} bytes are reported separately`,
  );
  assert.ok(
    !serviceWorker.includes(`./assets/${name}`),
    `${label} stays outside the core offline shell`,
  );
}
{
  // Registry-deferred official definitions leave the startup payload but stay offline-ready.
  const matches = assetNames.filter((name) => /^official-deferred\.[a-f0-9]{12}\.js$/.test(name));
  assert.equal(matches.length, 1, 'One hashed deferred official-definitions asset is emitted');
  const bytes = fs.readFileSync(path.join(root, 'dist/assets', matches[0]));
  assert.equal(bytes.length, info.deferredContentBytes, 'Deferred definitions are reported');
  assert.equal(zlib.gzipSync(bytes).length, info.deferredContentGzipBytes);
  assert.ok(
    serviceWorker.includes(`"./assets/${matches[0]}"`),
    'Deferred definitions are precached in the core offline shell',
  );
  assert.ok(
    !fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes(matches[0]),
    'Deferred definitions are not a startup script',
  );
  assert.ok(
    info.deferredContentGzipBytes < 12 * 1024,
    'Deferred official definitions stay under 12 KiB gzip',
  );
}
// tools/build.cjs already leaves the deferred Pulseboard SDK and discovery storage assets out of
// coreOfflineBytes; subtracting them again here hid ~56 KiB of real shell growth (#393).
const coreOfflineBytes = info.coreOfflineBytes;
// CAP-03 adds the bounded Cabinet picker consumer to the startup application shell.
// Merges through #297 add a measured net 102 gzip bytes (128,943 -> 129,045)
// for the journey-boundary fix and the single-sourced pack cap.
// Keyboard arrows for dossier/witness mark grids add reachable focus motion (#272).
// #333: atomic restore and stale-merge protection need a measured 256-byte ceiling extension.
// The settings-first sharing hotfix (route visibility sync plus a late-mount observer) needs a
// further measured 128-byte extension: 130,290 -> 130,366 gzip bytes. Moving the control into the
// Settings/Privacy slot (render rescue plus slot move) needs another measured 64 bytes: -> 130,443.
// Pulseboard SDK v3 (0.14.1): the host glue (slot, routes, id-and-number journey props) plus the
// required Privacy copy for the three categories, EEA gating, GPC/DNT and retention measured
// 130,084 -> 130,678 gzip bytes (130,703 on the 0.14.0 base); the SDK stays a separate deferred
// asset. Ceiling +256. Review fixes on #391 (carrying old-embed opt-outs into the SDK before it
// loads, Beta UI only where the SDK shows, traffic-source copy) measured 130,955: ceiling +320.
// Archive Heist rooms 10-33 (grouped room grid, solved markers, end cards, bounded room action)
// measured 131,409: ceiling +512. Labelling the vaults and linking the curated challenges from the
// Games Room and Pocket Borough measured 131,561 (+606 over 130,955): ceiling +640 in total.
// Games Room polish (Play again, journal names, section numbers) on top: measured 132,127: ceiling +2,112 in total.
// Voices (Feedback and Report entry points, places for the rating row, survey invitation and panels,
// flush triggers; the sheet, forms, rating row and delivery are the deferred chunk below) plus
// family/tier journey props: measured 131,011 -> 132,033 gzip on the #396 base; ceiling +1,024.
// Combined with the Archive vaults and Games Room polish: measured 133,186; ceiling +3,200 in total.
// The 0.14.1 core-cabinet audit fixes measured 131,011 -> 131,464 alone (+448); on top of the above: measured 133,670; ceiling +3,648 in total.
// Measured 133,690 on main e0edda4 (after #435): 5 bytes of headroom under the strict <. The bundle inlines
// content-hashed asset URLs, so an unrelated change moves its gzip size by a few bytes, and
// single-digit headroom fails PRs at random. +128 is that noise margin only, not room for code:
// the next feature that adds application JS trims first.
// Swarm quality wave (2026-09-29, unreleased): nine verified correctness fixes measure a net
// +138 gzip bytes (133,749 -> 133,887): dossier link feedback, workshop entry validation via
// the shared draft-shape check, Club run date validation, storage key capture plus restore
// shape guard. Three trim rounds removed ~250 bytes first (shared check instead of a parallel
// validator, compressed guards); a tenth candidate (strict nonogram Solved gate) was reverted
// after the UI suite proved fill-only completion is the player contract. Ceiling +128.
// Session-2 swarm wave (2026-09-29, unreleased): five verified correctness fixes measure a net
// +81 gzip bytes (133,887 -> 133,968): Club record date validation, drag-commit before update,
// dossier clue-toggle guard, challenge restore recovery with conflict preservation, late-import
// toast on route change. Two trim rounds first (redundant Array check, folded guard, comment
// trims); gzip noise absorbed most of the saving. Ceiling +96.
// Apply-update freeze-first (unreleased): setting updateRequested and rendering the paused-input
// banner before the save flush, refusing board input through blocked/commit/undo during the
// update, and resetting the flag when no worker waits or a save step throws, measures a net
// +168 gzip bytes (133,968 -> 134,136) after trim rounds (silent freeze like the paused gate
// instead of a per-tap toast, tightened banner copy, folded guards). The try/catch plus else
// reset is irreducible: without it a failed save would freeze the board forever. Ceiling +128.
// Scene clue-mark bound plus clear-voids-accused (unreleased), on top of the merged club-log
// cap: bounding saved clueMarks by p.clues.length instead of the board size and voiding the
// accusation on clear measures 134,201 combined (+65 over the 134,136 apply-freeze mark).
// Trim rounds: the redo-cap check cannot hoist (the log grows each loop pass), and folding
// the bound back into the shared ints() helper reintroduces the board-size bound the bound
// test pins against. Ceiling +128.
// Damaged-record tolerance (unreleased): getAll/export skip one corrupt localStorage
// record, report its key and preserve its bytes instead of discarding every run.
// Measures 134,286 -> 134,422 gzip (+136 on a base with 18 bytes of headroom).
// Trim rounds: the IndexedDB and session paths keep their original one-liners (no
// parse damage possible there); export reads the store's damaged map rather than
// duplicating per-result lists. Ceiling +256.
// #526: native/Shadow DOM input pause, Club bot cancellation and guarded final flush
// measure 134,475 -> 134,639 (+164), exceeding the old ceiling by 79 bytes.
// Sharing the four pause/release sites trims 81 raw bytes; gzip remains 134,639.
// The recovery guards remain required; ceiling +128 leaves 49 bytes of headroom.
// Borough confirmation reveal (#497): focus/scroll after plot, offer and build adds
// 101 gzip bytes (134,480 -> 134,581). Removing duplicate focus and viewport branches
// trims the first draft from 134,609. Raise 64 bytes for the 21-byte excess; no feature room.
// #535: Workshop edit/route epochs measure 134,748 -> 134,813 (+65).
// Moving generation scroll after the final render removes its duplicate render:
// six emitted bytes and three gzip bytes trimmed. The remaining guards are required.
// Ceiling +64 covers the 61-byte excess, leaving three bytes; no feature room.
// #536: two backup route captures/stale checks measure 134,813 -> 134,833 (+20).
// Both independent inputs need ownership; a shared helper adds overhead.
// Ceiling +32 covers the 17-byte excess and leaves 15 bytes; no feature room.
// #542 unique follow-up to #543: stale errors + picker route ownership measure
// 134,891 gzip / 1,411,498 shell. Composed with #540: 134,903 / 1,411,547.
// Existing lifecycle/limits are reused; capture before pick/read and stale catches remain required.
// Shared +64 gzip ceiling covers both follow-ups and leaves nine bytes; no feature room.
// #538/#541 residual ownership: after retaining the exception on the JS stack through
// cleanup (11 gzip/16 emitted bytes trimmed), the composed source measures 134,924 gzip
// and 1,411,564 shell. Required identity/late-error guards exceed the shared ceilings by
// 12/3.68 bytes. Measured +32 gzip/+16 shell leave 20/12.32 bytes, not feature room.
// Origin transfer (AL1): the app bundle, not the validator worker, measures
// 138,286 gzip. Checksum, shape and the five-store rollback stay in that module.
// Ceiling +3,360 over 127 KiB + 4,896 covers the 3,342-byte excess and leaves 18.
assert.ok(
  info.javascriptGzipBytes < 127 * 1024 + 8256,
  'Application bundle stays under 127 KiB + 8,256 bytes gzip',
);
{
  // The Voices sheet, survey form, rating row, panels and delivery queue: one deferred chunk,
  // precached so feedback works offline, never a startup script.
  const matches = assetNames.filter((name) => /^voices.[a-f0-9]{12}.js$/.test(name));
  assert.equal(matches.length, 1, 'One hashed Voices chunk is emitted');
  assert.equal(
    fs.statSync(path.join(root, 'dist/assets', matches[0])).size,
    info.voicesChunkBytes,
    'Voices chunk bytes are reported',
  );
  assert.ok(serviceWorker.includes(`"./assets/${matches[0]}"`), 'The Voices chunk is precached');
  assert.ok(
    !fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes(matches[0]),
    'The Voices chunk is not a startup script',
  );
  // Measured 19,704 bytes, 8,543 gzip.
  assert.ok(info.voicesChunkBytes < 20 * 1024, 'The Voices chunk stays under 20 KiB');
  assert.ok(info.voicesChunkGzipBytes < 9 * 1024, 'The Voices chunk stays under 9 KiB gzip');
}
assert.ok(info.platformGzipBytes < 6 * 1024, 'Platform and identity stay under 6 KiB gzip');
assert.ok(
  // CAP-03 adds the complete local platform facade (~14 KiB uncompressed). The 200 KiB
  // compressed startup ceiling (below) and the 2.3 MiB total offline ceiling apply separately.
  // Measured without the #393 double subtraction on 0.14.1: 1,372,753 bytes (1.309 MiB).
  // Voices (the precached chunk above plus its startup entry points): measured
  // 1,372,919 -> 1,395,446 bytes on the #396 base; ceiling +22,528.
  // Swarm quality wave (2026-09-29, unreleased): the same ten fixes measure +603
  // bytes here (1,406,648 -> 1,407,251); ceiling +1,024. Not feature room.
  // Session-2 swarm wave (2026-09-29, unreleased): the five correctness fixes plus
  // worker sanitizer/caps measure +739 bytes (1,407,251 -> 1,407,990) after two trim
  // rounds; ceiling +1,024. Not feature room.
  // Scene clue-mark bound plus clear-voids-accused (#495, unreleased): main measures
  // 1,408,653 (43 bytes headroom); the fix measures +222 here (1,408,653 -> 1,408,875).
  // Trim rounds: the accused reset is one statement, and the explicit clue-count bound
  // cannot fold back into ints() (its board-size length cap rejects valid 30-mark saves
  // on smaller boards, pinned by the bound test). Ceiling +1,024. Not feature room.
  // Desk attribution targets (#501, unreleased): min-height plus a blockified flex
  // display on the shared credit rule with a hidden guard measures +73 here
  // (1,409,691 -> 1,409,764). Trim rounds: the explicit focus rule is dropped (the shared
  // a:focus-visible ring already covers every anchor), the hidden guard is unqualified,
  // and align-items plus the inline- prefix are gone (absolute positioning blockifies
  // the box anyway). A smaller fix cannot hold 24px: min-height needs a non-inline
  // display, and any display declaration must re-hide pre-enhancement credits.
  // Ceiling +1,024. Not feature room.
  // #526 on the landed Borough base: 1,410,423 -> 1,411,081 (+658).
  // The shared pause/release helper trims 81 raw bytes; the remaining native and
  // recovery guards are required. Excess is 337 bytes; ceiling +384 leaves 47.
  // #530 plus the landed 800px Borough margin measures 1,411,140: 12 bytes
  // beyond that ceiling. The lesson guard has only its required identity/route
  // captures and stale check (34 emitted bytes); no redundant helper to trim.
  // Ceiling +32 leaves 20 bytes, not feature room. JavaScript gzip ceiling unchanged.
  // #535 measures 1,411,292 (+152), after removing the duplicate generation render
  // (six emitted bytes). The edit/route and post-persistence checks remain required.
  // Ceiling +160 covers the 132-byte excess and leaves 28; no feature room.
  // #536 measures 1,411,339 (+47). Each input needs its route capture/stale check;
  // Cabinet additionally holds validated data locally before publishing it.
  // Ceiling +32 covers the 19-byte excess, leaving 13; no feature room.
  // #542 alone: 1,411,498; with #540: 1,411,547. Shared ceiling +208
  // leaves thirteen bytes for the measured composition and hash noise, not feature room.
  // #552/#555: four independent synchronous hook guards measure 1,411,565 -> 1,411,618
  // (+53). Each ordinary/completion entry must survive its own optional hook failure.
  // Existing JS gzip/startup ceilings pass; shell excess is 41.68 bytes. A measured
  // +48 shell allowance leaves 6.32 bytes for identity/hash noise, not feature room.
  // Origin transfer (AL1) measures shell 1,422,591 (+10,967). The same module is
  // precached with the app. Ceiling +10,976 leaves 9.32 bytes, not feature room.
  coreOfflineBytes - info.officialContentBytes < 1.32 * 1024 * 1024 + 38480,
  'Precached code and shell excluding official content stay under 1.32 MiB + 38,480 bytes',
);
assert.ok(
  info.officialContentBytes < 1024 * 1024,
  'Official definitions and editorial data stay under 1 MiB',
);
assert.ok(coreOfflineBytes < 2.3 * 1024 * 1024, 'Total core offline release stays under 2.3 MiB');
// 0.15.0 measured 205,233 and raised this ceiling by 448 until the startup bundle is trimmed.
// After #425 and #428 it measured 202,721 (a3c6ad9), and 202,748 after #435 (e0edda4). The raise
// stays for now: the draft Interlock studies (#427) measure about 205,075 on top of main.
// Origin transfer (AL1) measures 207,629 gzip (+2,381 over 200 KiB + 448).
// Ceiling +2,400 leaves 19 bytes, not feature room.
assert.ok(
  info.initialCodeAndContentGzipBytes < 200 * 1024 + 2848,
  'Initial code plus official data stays under 200 KiB + 2,848 bytes gzip',
);
for (const [prefix, limit] of [
  // Archive Heist rooms 10-33 (the 24 vault maps and titles) measured 7,661 -> 8,475: +832.
  ['club-engines.', 8 * 1024 + 832],
  // Six offered Games Room games plus retained legacy compatibility surfaces use 33 KiB;
  // the visible first-visit sharing notice adds a measured 170 gzip bytes in 0.12.0.
  // Initial JS, engine, combined initial payload and offline budgets remain unchanged.
  // Archive vault rooms plus Games Room polish measured 34,079 on 2026-09-27: +320.
  // Desk attribution targets (#501, unreleased) measured 34,112: +384.
  ['alibi.', 33 * 1024 + 384],
]) {
  const files = fs
    .readdirSync(path.join(root, 'dist/assets'))
    .filter((n) => n.startsWith(prefix) && (prefix !== 'alibi.' || n.endsWith('.css')));
  assert.equal(files.length, 1);
  assert.ok(
    zlib.gzipSync(fs.readFileSync(path.join(root, 'dist/assets', files[0]))).length < limit,
    prefix + ' fits its download budget',
  );
}

// Optional models and animated companions are downloaded after entering the wing. Core stays unchanged.
// Challenge library (+6,746) and Archive vault rooms (+1,857) on 2,303,623, plus Games Room polish (+310): measured 2,312,559; ceiling +8,576.
assert.ok(
  info.quietWingBytes < 2250 * 1024 + 8576,
  'Optional Quiet Wing pack stays below 2250 KiB + 8,576 bytes',
);
