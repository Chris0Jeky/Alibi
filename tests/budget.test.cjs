'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const path = require('node:path');
const test = require('node:test');

test('shell and content stay inside the existing ceilings', async (t) => {
  const root = path.resolve(__dirname, '..');
  const info = JSON.parse(fs.readFileSync(path.join(root, 'build-info.json')));
  const assetNames = fs.readdirSync(path.join(root, 'dist/assets'));
  await t.test('initial JavaScript retains the configuration preamble', () => {
    const initialScriptName = assetNames.find((name) => /^alibi\.[a-f0-9]{12}\.js$/.test(name));
    assert.ok(initialScriptName, 'Initial JavaScript is emitted');
    const initialScript = fs.readFileSync(
      path.join(root, 'dist/assets', initialScriptName),
      'utf8',
    );
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
  });
  const serviceWorker = fs.readFileSync(path.join(root, 'dist/sw.js'), 'utf8');
  const deferredAssets = [
    ['Pulseboard SDK', /^pulseboard\.[a-f0-9]{12}\.js$/, info.observatoryBytes],
    ['Discovery storage', /^discovery-storage\.[a-f0-9]{12}\.js$/, info.discoveryStorageBytes],
  ];
  for (const [label, pattern, reportedBytes] of deferredAssets) {
    await t.test(`${label} is emitted, accounted for and outside the core shell`, () => {
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
    });
  }
  await t.test('deferred official definitions are precached within their budget', () => {
    // Authors add a pack path once to content/official-packs.json's deferred list; build,
    // worker IDs, backup collision checks and receipts follow it without changing puzzle sources.
    // Optional WebP assets use content/asset-delivery.json's deferred declarations and the
    // existing verified image loader/enhancement receipt (outside startup and core precache).
    // See docs/content/DELIVERY.md. Official definitions remain precached for offline play.
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
    // Owner decision 2026-10-15: 12,288 -> 32,768 bytes. Baseline 14,633 already fails;
    // deferring both Interlock packs plus Expert Families and Master/Grandmaster measures
    // 21,266, leaving 11,502 bytes for roughly two more similarly sized study waves.
    assert.ok(
      info.deferredContentGzipBytes < 32 * 1024,
      'Deferred official definitions stay under 32 KiB gzip',
    );
  });
  await t.test('collection adder is optional, outside startup and the core shell', () => {
    // #433: one on-demand module beside the optional packs, counted in workshopCollectionBytes.
    // Measured 4,222 bytes / 2,168 gzip; application and shell ceilings above are unchanged.
    const matches = fs
      .readdirSync(path.join(root, 'dist/assets/workshop'))
      .filter((name) => /^add\.[a-f0-9]{12}\.js$/.test(name));
    assert.equal(matches.length, 1, 'One hashed collection adder is emitted');
    const url = `./assets/workshop/${matches[0]}`;
    const bytes = fs.readFileSync(path.join(root, 'dist', url));
    assert.ok(!serviceWorker.includes(url), 'The adder is not precached');
    assert.ok(
      !fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes(matches[0]),
      'The adder is not a startup script',
    );
    assert.ok(zlib.gzipSync(bytes).length < 3 * 1024, 'The adder stays under 3 KiB gzip');
  });
  // tools/build.cjs already leaves the deferred Pulseboard SDK and discovery storage assets out of
  // coreOfflineBytes; subtracting them again here hid ~56 KiB of real shell growth (#393).
  const coreOfflineBytes = info.coreOfflineBytes;
  const contentBytes = require('../tools/content-budget-accounting.cjs')(info);
  await t.test('application JavaScript stays within its gzip budget', () => {
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
    // #407 durable solved rooms: main 134,935 -> 135,053 gzip (+118) after replacing the per-room
    // record scans with one prefix helper. The record-time copy and its save validation are
    // required. Excess 109 bytes; ceiling +128 leaves 19; no feature room.
    // #738/#744/#761 save-integrity maintenance: measured 135,052 -> 135,121 gzip (+69).
    // Shared revision/prefix helpers and the existing save promise keep the guards bounded.
    // Ceiling +96 covers the 49-byte excess with 47 bytes for identity/hash noise.
    // #761 separate Borough bests: reviewed final copy measures 135,121 -> 135,618 (+497).
    // One shared bounded table builder preserves legacy metadata across load, record and import.
    // Ceiling +512 covers the 450-byte excess and leaves 62 bytes for identity/hash noise.
    // #738 protected-load recovery, required Duel engine loading and unchanged Add-missing rows:
    // clean composed source measures 135,616 -> 135,755 (+139). Ceiling +128 covers the
    // 75-byte excess and leaves 53 bytes for identity/hash noise; validation remains strict.
    // #825: the Privacy & credits copy moves to the deferred chunk below: 134,166 -> 131,760 (-2,406).
    // Ceiling -2,368 (38 bytes of noise room on top of the headroom main already had).
    assert.ok(
      // Second 2026-10-30 composition (#833 clue audit, #828 Rehearse, #832 read clues): the
      // first composition measures 132,844; this tree 133,538 (+694). #845 freed 2,368 bytes and
      // lowered the ceiling to match; these three Workshop/accessibility features use part of it.
      // Excess 98; ceiling +128 leaves 30, still 2,240 below the pre-#845 ceiling. No feature room.
      // Scene follow-ups (#844 per-clue remove names and the singular conflict heading, #854
      // rehearsal save-lock guards and review copy; the honest budget refusal shares one helper
      // with the audit): 133,538 -> 133,579 (+41) after one shared locked() helper replaced six
      // saveError/storageFatal tests. Excess 11; ceiling +32 leaves 21; no feature room.
      // #831 resume previews (Picture logic cards drawn from saved marks in src/presentation.js,
      // which ships in the startup bundle): 133,579 -> 133,705 (+126). Excess 105; ceiling +128
      // leaves 23; no feature room.
      // #864 Scene Maker draft file (Import draft and Export draft controls, the confirm-then-
      // replace step that goes through Undo, the stale-reply guard and the placeholder-answer
      // check): 133,705 -> 134,098 (+393) after merging the worker's two refusals into one and
      // trimming the dialog and toast copy. The answer is deliberately never in the file, so the
      // import must supply a placeholder and the editor must not show it as an author solution.
      // Excess 371; ceiling +416 (to 131 KiB) leaves 45 for identity/hash noise; no feature room.
      info.javascriptGzipBytes < 127 * 1024 + 4096,
      'Application bundle stays under 127 KiB + 4,096 bytes gzip',
    );
  });
  await t.test('Privacy copy is deferred, precached and inline only in standalone', () => {
    // #825: cold page copy, loaded on entry to #/privacy; precached so the page works offline.
    const matches = assetNames.filter((name) => /^privacy\.[a-f0-9]{12}\.js$/.test(name));
    assert.equal(matches.length, 1, 'One hashed Privacy chunk is emitted');
    const chunk = fs.readFileSync(path.join(root, 'dist/assets', matches[0]), 'utf8');
    assert.equal(
      Buffer.byteLength(chunk),
      info.privacyChunkBytes,
      'Privacy chunk bytes are reported',
    );
    assert.equal(zlib.gzipSync(chunk).length, info.privacyChunkGzipBytes);
    assert.ok(serviceWorker.includes(`"./assets/${matches[0]}"`), 'The Privacy chunk is precached');
    assert.ok(
      !fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8').includes(matches[0]),
      'The Privacy chunk is not a startup script',
    );
    const app = fs.readFileSync(
      path.join(
        root,
        'dist/assets',
        assetNames.find((n) => /^alibi\.[a-f0-9]{12}\.js$/.test(n)),
      ),
      'utf8',
    );
    assert.ok(app.includes(`"privacy":"./assets/${matches[0]}"`), 'The app config names the chunk');
    assert.match(chunk, /Your device is the save file\./);
    assert.doesNotMatch(app, /Your device is the save file\./);
    const standalone = fs.readFileSync(path.join(root, 'alibi-deluxe-play.html'), 'utf8');
    assert.match(standalone, /Your device is the save file\./);
    // Measured 6,940 bytes, 3,198 gzip.
    assert.ok(info.privacyChunkGzipBytes < 4 * 1024, 'The Privacy chunk stays under 4 KiB gzip');
  });
  await t.test('Voices is deferred, precached and within its budgets', () => {
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
  });
  await t.test('platform and identity stay within their gzip budget', () => {
    assert.ok(info.platformGzipBytes < 6 * 1024, 'Platform and identity stay under 6 KiB gzip');
  });
  await t.test('precache shell stays within its byte budget', () => {
    assert.ok(
      // CAP-03 adds the complete local platform facade (~14 KiB uncompressed). The 220 KiB
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
      // #580 Lantern Duel short-landscape layout (two scoped, minified media queries) measure
      // 1,411,538 -> 1,412,758 (+1,220); the rules cannot shrink below their selectors, so excess is 1,134 bytes.
      // Ceiling +1,168 leaves 34 bytes; no feature room.
      // Worker restore revalidation (2026-10-22, #734, unreleased): measures +2,106 bytes
      // (1,411,404 -> 1,413,510) after trimming 95 worker bytes; ceiling +3,072. Not feature room.
      // Workshop drafts in Cabinet backups (#735/#743): main 1,414,769 -> 1,416,210 (+1,441)
      // after collapsing the draft shape guard to one optional-chain test (also brings the JS
      // gzip back under its unchanged ceiling). Export validation, the restore conflict/recovery
      // fields and the completion notice are required. Excess 346 bytes; ceiling +384 leaves 38.
      // Damaged-draft restore recovery (2026-10-24, #744, unreleased): main 1,416,210 -> 1,416,423
      // (+213) after sharing one draft-validity helper with export and shortening the note. The
      // damaged-bytes recovery field and the replace-if-damaged branch are required. Excess 175
      // bytes; ceiling +192 leaves 17; no feature room. JS gzip ceiling unchanged.
      // #407 durable solved rooms: main 1,416,422 -> 1,416,951 (+529); the validator ships in both
      // the bundle and the validator worker. Excess 511 bytes; ceiling +544 leaves 33; no feature room.
      // #738/#744/#761 revision fence, draft-save/export refusal, readable restore note and
      // durable game stamps measure 1,416,648 -> 1,417,177 (+529). Ceiling +256 covers
      // the 192.68-byte excess and leaves 63.32 bytes for identity/hash noise.
      // #761 separate Borough bests and optional backup validation ship in the application and
      // validator worker: 1,417,177 -> 1,418,911 (+1,734). Ceiling +1,792 covers the
      // 1,670.68-byte excess and leaves 121.32 bytes; startup/content ceilings remain unchanged.
      // #738 load-only recovery and atomic Add-missing revision preservation measure
      // 1,418,911 -> 1,419,648 (+737). Ceiling +704 covers the 615.68-byte excess and leaves
      // 88.32 bytes for identity/hash noise; initial payload and content limits stay unchanged.
      // Initiative wave 2026-10-30 (#818/#821/#822/#823/#824): reasoning hints for Sudoku,
      // Futoshiki and Number trails ship in the precached reasoning chunk; level-aware
      // continuation, the staged hint dialog and the first-puzzle letter in the application.
      // Measured on 328d5dcd: #819 +1,024, #836 +1,396, #838 +1,083, #842 +196, #839 +161
      // (+3,860) against 1,295 bytes of headroom. Ceiling +2,816 leaves ~250 bytes for
      // identity/hash noise; startup gzip and content limits are unchanged.
      // #846 crime-scene reasoning hints (candidate pruning, line rule, accusation pointer in
      // src/insights.js): main 1,418,441 -> 1,420,969 (+2,528, including the line-rule
      // explanation from review). Excess 1,232.68 bytes; ceiling +1,280 (20 x 64) leaves
      // 47.32 bytes; no feature room.
      // 2026-10-30 composition (one measurement replaces the per-PR raises above): the hint
      // wave (#819/#836/#838/#839/#842/#850), Scene Maker conflict diagnosis (#840), board
      // analysis once per render (#829) and the deferred Privacy chunk (#845, whose loader and
      // chunk wrapper add raw precached bytes while startup gzip falls) measure 1,426,795 bytes
      // (1.32 MiB + 42,674.68) on the composed tree. Ceiling 1.32 MiB + 42,944 (64-byte step)
      // leaves 269.32 bytes for identity/hash noise; startup gzip and content limits unchanged.
      // #833 Scene Maker clue audit (the 'audit' worker request in the validator worker and the
      // Audit clues control, result region and strict reply check in the application): the base
      // measures 1,426,794 bytes; the change measures 1,428,315 (+1,521) after sharing the clue-index
      // check with the conflict diagnosis and its list renderer with the audit result. The honest
      // refusal, the two result sentences and the reply refusal are required text. Excess 1,250.68
      // bytes; ceiling +1,280 (20 x 64) leaves 29.32 for identity/hash noise; no feature room.
      // JavaScript gzip (133,133 against 135,808) and startup/content limits are unchanged.
      // #828 Scene Maker Rehearse (the in-memory rehearsal run, its route branch, the save and
      // preference guards, the unsaved banner and labels, the Back to the editor exits and the
      // Pulseboard journey guard): the base measures 1,428,315 bytes; the change measures
      // 1,429,342 (+1,027). The run builder is shared with getRun, and one guard each covers every
      // save, preference and journey caller rather than one per call site. Excess 997.68 bytes;
      // ceiling +1,024 (16 x 64) leaves 26.32 for identity/hash noise; no feature room.
      // JavaScript gzip (133,387 against 135,808) and startup/content limits are unchanged.
      // #832 Picture logic Read clues (the C shortcut, the button and its toast text) on the
      // composed tree with #833 and #828: 1,429,765 bytes (+423 over #828's 1,429,342). Excess
      // 396.68; ceiling +448 (7 x 64) leaves 51.32 for identity/hash noise; no feature room.
      // Scene follow-ups #844/#854 (the honest diagnosis-budget refusal and its shared bounded()
      // helper, the per-clue remove names, the singular conflict heading, the rehearsal lock
      // guards and the review-record exit label): 1,429,765 -> 1,430,091 (+326). The refusal
      // text is the issue's required copy and the helper replaces the audit's own catch. Excess
      // 274.68; ceiling +320 (5 x 64) leaves 45.32 for identity/hash noise; no feature room.
      // #831 resume previews on the composed tree: 1,430,091 -> 1,430,393 (+302). Excess 256.68;
      // ceiling +320 (5 x 64) leaves 63.32 for identity/hash noise; no feature room.
      // #864 Scene Maker draft file (the 'scene-draft-import' worker request, the two controls, the
      // replace step, the hidden file input in the shell): 1,430,393 -> 1,432,234 (+1,841). The
      // placeholder answer, the byte-accurate cap and the refusal copy are required. Excess
      // 1,777.68; ceiling +1,824 (57 x 32) leaves 46.32 for identity/hash noise; no feature room.
      // #864 review fixes (room-brush clamp, real-solution guard, seed stripped on export):
      // 1,432,234 -> 1,432,301 (+67). Excess 20.68; ceiling +64 leaves 43.32; no feature room.
      contentBytes.shellBytes < 1.32 * 1024 * 1024 + 48224,
      'Precached code and shell excluding official content stay under 1.32 MiB + 48,224 bytes',
    );
  });
  await t.test('official definitions and editorial data stay within their byte budget', () => {
    assert.ok(
      contentBytes.officialBytes < 1024 * 1024,
      'Official definitions and editorial data stay under 1 MiB',
    );
  });
  await t.test('total core offline release stays within its byte budget', () => {
    assert.ok(
      coreOfflineBytes < 2.3 * 1024 * 1024,
      'Total core offline release stays under 2.3 MiB',
    );
  });
  await t.test('initial code and official data stay within their gzip budget', () => {
    // Owner decision 2026-10-15: 205,248 -> 225,280 (220 KiB). Clean baseline 205,710;
    // declarative advanced-pack deferral measures 200,827, already 4,421 under the OLD cap.
    // New headroom 24,453 supports the next few content waves without byte-sized cap patches.
    // JS (133,780 / 134,944) and shell (~1,406,586 / 1,412,792.32) still fit; do not raise them.
    assert.ok(
      info.initialCodeAndContentGzipBytes < 220 * 1024,
      'Initial code plus official data stays under 220 KiB gzip',
    );
  });
  for (const [prefix, limit] of [
    // Archive Heist rooms 10-33 (the 24 vault maps and titles) measured 7,661 -> 8,475: +832.
    ['club-engines.', 8 * 1024 + 832],
    // Six offered Games Room games plus retained legacy compatibility surfaces use 33 KiB;
    // the visible first-visit sharing notice adds a measured 170 gzip bytes in 0.12.0.
    // Initial JS, engine, combined initial payload and offline budgets remain unchanged.
    // Archive vault rooms plus Games Room polish measured 34,079 on 2026-09-27: +320.
    // Desk attribution targets (#501, unreleased) measured 34,112: +384.
    // #580 Duel short-landscape layout measures 34,157 -> 34,427 gzip (+270): +672 in total.
    ['alibi.', 33 * 1024 + 672],
  ]) {
    await t.test(`${prefix} asset stays within its download budget`, () => {
      const files = fs
        .readdirSync(path.join(root, 'dist/assets'))
        .filter((n) => n.startsWith(prefix) && (prefix !== 'alibi.' || n.endsWith('.css')));
      assert.equal(files.length, 1);
      assert.ok(
        zlib.gzipSync(fs.readFileSync(path.join(root, 'dist/assets', files[0]))).length < limit,
        prefix + ' fits its download budget',
      );
    });
  }

  await t.test('optional Quiet Wing pack stays within its byte budget', () => {
    // Optional models and animated companions are downloaded after entering the wing. Core stays unchanged.
    // Challenge library (+6,746) and Archive vault rooms (+1,857) on 2,303,623, plus Games Room polish (+310): measured 2,312,559; ceiling +8,576.
    assert.ok(
      info.quietWingBytes < 2250 * 1024 + 8576,
      'Optional Quiet Wing pack stays below 2250 KiB + 8,576 bytes',
    );
  });
});
