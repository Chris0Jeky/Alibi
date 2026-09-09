# Wrenmere implementation

The first chapter is The Seventeenth Minute. Start at `#/quiet/castle/map` or the Wrenmere link in the home page's Quiet Wing invitation. This is a review candidate, not a deployment receipt.

## Code map

- `content.mjs`, `rooms.mjs`, `puzzles.mjs`: versioned chapter records, ten questions and 32 locations. Only ten locations are implemented.
- `engine.mjs`: pure validation, prerequisites, scoring and puzzle checks. First completions award ten points; replays cannot add more. Guided play remains eligible.
- `storage.mjs`: the separate `alibi-castle-v1` database, retained session edits, bounded operations and revision-conditional writes.
- `pages.mjs`, `boards.mjs`, `view.mjs`: page composition, accessible boards and owned UI lifecycle.
- `objects.mjs`: optional room observations. Keeping one in the notebook never grants a puzzle reward.
- `art.mjs`: existing local Alibi paintings. These are atmosphere, not architectural evidence. The original Wrenmere procedural scene uploads were blocked before reaching GitHub and are not included here.
- `feedback.mjs`: optional short sound and movement responses. Root comfort settings take precedence. No gameplay outcome depends on effects.
- `entry.mjs`: the native mount/flush/dispose contract.
- `tools/build-quiet-pack.cjs`: the unchanged prior Quiet Wing builder, renamed.
- `tools/build-quiet.cjs`: composes its optional manifest with the castle bundle. Both execute only when entered; the shared optional pack may download in the background without blocking navigation.

## Boundaries

The root owns routing, the service worker and update activation. Cabinet, Club, Quiet Wing, challenge and castle stores remain separate. No existing puzzle ID, revision, content definition or save is migrated. The original standalone prototype's browser storage is not imported automatically.

Castle export is explicitly Chapter I only. Import, cross-store backup coverage and an export-confirmed resolution flow for session-only saves are release follow-ups. An unresolved or protected castle notebook blocks an update. Do not tell players that the root's existing backup includes castle records until the backup integration is implemented and tested.

The map uses numbered navigation positions over reused artwork. A full architectural map and distinct Wrenmere room paintings remain production work. The optional four-frame text interlude has manual controls and a transcript. The supplied rendered MP4 is not included. Chapters II–V, companion roles, new seeds, reward kits and town expansion are not implemented by this stack; #29 owns the latter systems.

## Verification

`node --test tests/castle*.test.mjs` exercises rules, unknown-state protection, simulated storage failure/CAS, observations and effects. Local Chromium control runs are isolated documents and do not prove IndexedDB or offline operation. `python tests/browser_castle.py` runs against the built native origin and writes a separate acceptance report, covering both 390- and 1280-pixel layouts, actual controls, real reloads, a stale second tab and offline loading. The dedicated workflow runs that suite. Inspect its result at the actual commit before claiming a pass.

Run the existing full `npm run verify` and all existing origin/Quiet Wing suites too. Keep #2, #11 and #13 open for physical Android, TalkBack and sustained-device acceptance. New draft PRs do not close those gates. No merge, deployment, paid asset submission or account change was performed by the castle PR session.

Writing guidance is in [WRITING.md](WRITING.md). Apply it to room details and feedback without weakening clue wording or evidence qualifications.
