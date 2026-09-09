# Wrenmere implementation

Chapter I is The Seventeenth Minute. Start at `#/quiet/castle/map` or the Wrenmere link in the home page's Quiet Wing invitation. This is a review candidate, not a deployment receipt.

Stack: #39 foundation → #40 storage → #41 experience → #42 native integration. The top review branch is `chatgpt/wrenmere-04-integration`. Merge in order and retarget each child after its parent merges. No merge or deployment was performed by this session.

## Code map

- `content.mjs`, `rooms.mjs`, `puzzles.mjs`: chapter records, ten questions and 32 locations. Only ten locations are implemented.
- `engine.mjs`: pure validation, prerequisites, scoring and puzzle checks. First completions award ten points; replays cannot add more. Guided play remains eligible.
- `storage.mjs`: separate `alibi-castle-v1` database, retained session edits, bounded operations and revision-conditional writes.
- `pages.mjs`, `boards.mjs`, `view.mjs`: page composition, accessible boards and owned UI lifecycle.
- `objects.mjs`: optional room observations. Keeping one in the notebook never grants a puzzle reward.
- `art.mjs`: existing local Alibi paintings. These are atmosphere, not architectural evidence. The original Wrenmere procedural scene uploads were blocked before reaching GitHub and are not included here.
- `feedback.mjs`: short opt-in sound and movement responses. Root comfort settings take precedence. Effects never determine gameplay.
- `cache.mjs`, `entry.mjs`: a separate optional castle cache and native mount/flush/dispose contract.
- `tools/build-quiet-pack.cjs`: the unchanged prior Quiet Wing builder, renamed.
- `tools/build-quiet.cjs`: composes the two activity configurations without combining their downloads. Castle has a separate 96 KiB source-bundle limit; the existing Quiet Wing limit is unchanged. `build-info.json` records `castleBytes` separately and excludes it from core offline bytes.

## Boundaries

The root owns routing, the service worker and update activation. Cabinet, Club, Quiet Wing, challenge and castle stores remain separate. No existing puzzle ID, revision, content definition or save is migrated. The original standalone prototype's browser storage is not imported automatically.

Castle export is explicitly Chapter I only. Import, root backup scope and an export-confirmed resolution flow for session-only saves are release gates in #44. An unresolved or protected castle notebook blocks an update. Do not tell players that the root's existing backup includes castle records until it does and the restore contract passes acceptance.

The map uses numbered navigation positions over reused artwork. A full architectural map and distinct Wrenmere paintings remain #45/#46. The optional four-frame text interlude has manual controls and a transcript. The supplied rendered MP4 is not included; #52 owns media integration. Chapters II–V, companion roles, seeds, reward kits and town expansion are not implemented by this stack.

## Verification

`node --test tests/castle*.test.mjs` exercises rules, unknown-state protection, simulated storage failure/CAS, observations, effects and optional cache boundaries. Local Chromium control runs are isolated documents and do not prove IndexedDB or offline operation. Both the 390- and 1280-pixel control runs completed all ten questions, including observations and focus restoration.

`python tests/browser_castle.py` runs against the built native origin. It covers actual controls, real reloads, a stale second tab and offline loading. Its dedicated workflow uploads reports/screenshots and build metadata. Read the report for the actual head before claiming a pass. Early runs exposed a test predicate incompatible with the existing CSP, then dependency-installation failures; neither was treated as a successful native acceptance.

The first #39 layer has a full repository CI pass at `29410d9`. Later layers require their own head checks. Run the existing full `npm run verify` and origin/Quiet Wing suites too. Keep #2, #11 and #13 open for physical Android, TalkBack and sustained-device acceptance. Draft PRs do not close those gates.

## Production queue

#43 coordinates castle production. #44 owns save recovery; #45 navigation; #46 art; #47 inspection; #48 feedback; #49 voices/portraits; #50 museum curation; #51 evidence board; #52 films; #53 Chapter II; #54 later acts; #55 catalogue familiarity; #56 human experience acceptance.

#29 remains the companion/garden/realm epic. Use #30's receipt contract and #37's cross-system acceptance; no parallel wallet or duplicate reward authority.

Writing guidance: [WRITING.md](WRITING.md). Later narrative: [CHAPTERS.md](CHAPTERS.md). Preserve clue wording and evidence qualifications during stylistic edits.
