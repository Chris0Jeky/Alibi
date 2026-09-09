# Wrenmere implementation

Chapter I is The Seventeenth Minute. Start at `#/quiet/castle/map` or the Wrenmere link in the home page's Quiet Wing invitation. This is a review candidate, not a deployment receipt.

The original stack (#39 foundation → #40 storage → #41 experience → #42 native integration)
is preserved in `codex/wrenmere-production`, integrated with current main. The production PR
will supersede those drafts with their original commits intact. Start with [STRATEGY.md](STRATEGY.md).
No production deployment is claimed by this source checkpoint.

## Code map

- `content.mjs`, `rooms.mjs`, `puzzles.mjs`: chapter records, ten questions and 32 locations. Only ten locations are implemented.
- `engine.mjs`: pure validation, prerequisites, scoring and puzzle checks. First completions award ten points; replays cannot add more. Guided play remains eligible.
- `storage.mjs`: separate `alibi-castle-v1` database, retained session edits, bounded operations and revision-conditional writes.
- `backup.mjs`, `validation-entry.mjs`: bounded worker validation and merge rules. Restore
  writes the previous notebook and replacement atomically; other database keys stay untouched.
- `pages.mjs`, `boards.mjs`, `view.mjs`: page composition, accessible boards and owned UI lifecycle.
- `objects.mjs`: optional room observations. Keeping one in the notebook never grants a puzzle reward.
- `art.mjs`: existing local Alibi paintings. These are atmosphere, not architectural evidence. The original Wrenmere procedural scene uploads were blocked before reaching GitHub and are not included here.
- `feedback.mjs`: short opt-in sound and movement responses. Root comfort settings take precedence. Effects never determine gameplay.
- `cache.mjs`, `entry.mjs`: a separate optional castle cache and native mount/flush/dispose contract.
- `tools/build-quiet-pack.cjs`: the unchanged prior Quiet Wing builder, renamed.
- `tools/build-quiet.cjs`: composes the two activity configurations without combining their downloads. Castle has a separate 96 KiB source-bundle limit; the existing Quiet Wing limit is unchanged. `build-info.json` records `castleBytes` separately and excludes it from core offline bytes.

## Boundaries

The root owns routing, the service worker and update activation. Cabinet, Club, Quiet Wing, challenge and castle stores remain separate. No existing puzzle ID, revision, content definition or save is migrated. The original standalone prototype's browser storage is not imported automatically.

Castle export is explicitly Chapter I only. The notebook now reviews bounded imports before
merge or confirmed replacement, and exports the previous notebook for recovery. Session and
protected modes refuse restore. Stale revisions and unknown stored fields abort writes.
Settings exports a castle section alongside available Cabinet/Club/Quiet Wing sections; its
manifest and warnings identify omissions. Each section restores separately, never atomically
across stores. Legacy combined exports remain readable. Challenge replays remain separate.

A dirty or protected notebook blocks updates until the player explicitly confirms saving an
export of that exact session. Initiating or cancelling a download does not acknowledge it.
Further edits invalidate the acknowledgement. Confirmation never makes protected storage writable.

The map uses numbered navigation positions over reused artwork. A full architectural map and distinct Wrenmere paintings remain #45/#46. The optional four-frame text interlude has manual controls and a transcript. The supplied rendered MP4 is not included; #52 owns media integration. Chapters II–V, companion roles, seeds, reward kits and town expansion are not implemented by this stack.

## Verification

`node --test tests/castle*.test.mjs` exercises rules, unknown-state protection, simulated storage failure/CAS, observations, effects and optional cache boundaries. Local Chromium control runs are isolated documents and do not prove IndexedDB or offline operation. Both the 390- and 1280-pixel control runs completed all ten questions, including observations and focus restoration.

`python tests/browser_castle.py` runs against the built native origin. It covers actual controls, real reloads, a stale second tab and offline loading. Its dedicated workflow uploads reports/screenshots and build metadata. Read the report for the actual head before claiming a pass. Early runs exposed a test predicate incompatible with the existing CSP, then dependency-installation failures; neither was treated as a successful native acceptance.

`python tests/browser_castle_recovery.py` adds real control export/import/cancel/merge/replace,
the pre-restore copy, malformed/future imports, stale tabs, combined manifests and simulated
quota/interruption in real IndexedDB. `tests/castle-backup.test.mjs` covers atomicity, bounds,
future records, revision races and exact export acknowledgement with deterministic fixtures.

The first #39 layer has a full repository CI pass at `29410d9`. Later layers require their own head checks. Run the existing full `npm run verify` and origin/Quiet Wing suites too. Keep #2, #11 and #13 open for physical Android, TalkBack and sustained-device acceptance. Draft PRs do not close those gates.

## Production queue

#43 coordinates castle production. #44 owns save recovery; #45 navigation; #46 art; #47 inspection; #48 feedback; #49 voices/portraits; #50 museum curation; #51 evidence board; #52 films; #53 Chapter II; #54 later acts; #55 catalogue familiarity; #56 human experience acceptance.

#29 remains the companion/garden/realm epic. Use #30's receipt contract and #37's cross-system acceptance; no parallel wallet or duplicate reward authority.

Writing guidance: [WRITING.md](WRITING.md). Later narrative: [CHAPTERS.md](CHAPTERS.md). Preserve clue wording and evidence qualifications during stylistic edits.
