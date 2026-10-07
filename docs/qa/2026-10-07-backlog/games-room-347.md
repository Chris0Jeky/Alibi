# Games Room #347 evidence note

Date: 2026-10-07. Checkout: `codex/maint-347-proof` at `2758d91f` before this note. Read-only pass over `src/club-engines.js`, `src/club.js`, `src/backup-validation.js`, and the named tests. No production code was changed. This note does not close #347, and it does not claim a browser, device, CI, or merge result.

`docs/design/DESIGN-DOSSIER-2026-09-27.md` still lists Duel strengths and a fresh Block Cabinet seed as open #347 work. `docs/curation/GAMES-RECOVERY.md` and `docs/STATE.md` already describe an earlier recovery. Those documents were not re-verified here and were not edited.

## Command

```text
node --test --test-concurrency=2 tests/duel-strength.test.cjs tests/club-fresh-seed.test.cjs tests/club-result-retention.test.cjs tests/duel-recovery.test.cjs tests/block-replay-cache.test.cjs tests/block-replay-long.test.cjs
```

Result: 49 passed, 0 failed, 0 skipped, about 689 ms. `npm test` and `npm run verify` were not run. Node printed `NO_COLOR` / `FORCE_COLOR` warnings and still exited 0.

The Club session helper freezes `Date.now` at `1790352000000` and `Math.random` at `0`, and it replaces `Worker` with an object that records `postMessage` and does not search.

## Duel strengths

| Requirement | What the source does | What the named tests show | Residual |
| --- | --- | --- | --- |
| Explicit bounded strengths, legacy depth 4 retained | `reversi.strengths` is frozen: Learner 1, Club 3, Keeper 4, Expert 5 (`src/club-engines.js`). `strength()` defaults to Keeper. `best()` defaults to depth 4 and clamps to 1..5. The bot worker is posted `strength(difficulty).depth`. Missing `difficulty` renders and records as Keeper. | `duel-strength.test.cjs` checks the four keys, depths `[1, 3, 4, 5]`, and the default depth 4. A Learner selection posts worker depth 1. An error retry in `duel-recovery.test.cjs` posts depth 4. Mode changes and an ordinary restart keep Club. | The depth bound is the clamp inside `best()`, plus the four frozen settings. This is not an Elo or mistake-rate claim. The note in the Duel fieldset says higher strengths can still make mistakes. |
| Invalid setting validation | `strength()` throws `Unknown Lantern Duel strength.` unless the argument is a own string key. `undefined` uses the Keeper default. Club `validateBackup` loads the engines and calls `validateSave`. For a Duel run, `validateSave` calls `strength(difficulty)` and replays `log` plus reversed `redo` (`src/backup-validation.js`). A Duel journal row with `difficulty` is checked the same way. The strength action calls `strength(value)` before any replacement. | Unknown engine values `null`, `constructor`, `__proto__`, `unknown`, and `1` throw. A save with no difficulty round-trips unchanged. Learner, Club, Keeper, and Expert restore. `constructor` is rejected. `not-a-strength` leaves the finished run and journal untouched and toasts the unknown-strength error. | Puzzle-backup `validateBackup` / `validateRun` in the same file is a different format. Its undo-stack bounds are not the Club Duel history check. |
| Stale worker cancellation | `stopBot()` increments `botJob`, terminates the worker, and clears `botPending`. A reply is ignored unless it is still the current worker, job, salon route, and game. Reset, undo, redo, route changes, and restore also stop the bot. A failed reply pauses for `bot-retry` instead of looping on render. | Changing strength during a live match confirms, terminates the old worker, and a late `onmessage` does not change the replacement run. A late `onerror` does not terminate the replacement worker or clear `botPending`. `duel-recovery.test.cjs` covers error, message error, malformed, illegal, and mismatched id: history stays, one worker remains across five renders, and retry posts a new worker. Late replies after leaving the route do not throw or append moves. A repeated reply does not replay. Retry off-route or during a live request does not add a worker. | The helper Worker does not run the blob. The blob text is only pattern-matched for `reversi.best(e.data.state,e.data.depth)`. |
| Undo and backup | Bot undo and redo call `stopBot()`, then rewind or replay until it is the player's turn or the stack ends. They do not assign `difficulty`. Confirmed strength replacement records a finished game first, then clears `log` and `redo`. `validateSave` is the Club backup check used by `AlibiClub.validateBackup`. | Backup round-trip and invalid-strength refusal are the `duel-strength.test.cjs` save test above. Finished strength or seat changes keep the old Expert journal label, then store the new setting. Unfinished changes ask, change nothing until confirm, then clear the log and add no journal row. | None of the named tests call `club-undo` on a Duel. Undo retaining the selected strength is source behavior, not a result from these 49 tests. `tests/club-storage.test.cjs` exercises Tic-Tac-Toe undo and was not part of this run. |
| Actual strength differs from the choice | `best()` is a minimax search at the requested depth. It does not mutate the passed state. | After Gold plays cell 13, Learner returns cell 19 and Expert returns cell 9. Expert's cell is legal, Expert visits more nodes, and the position string is unchanged. | That assertion calls `reversi.best` in-process. The fake Worker never chooses a cell, so the suite does not show two browser workers playing different moves. |

Keyboard focus after an empty-log Expert selection is asserted in `duel-recovery.test.cjs`. Finished Duel, Tic-Tac-Toe, and Lantern Gardens replays record one journal row, including reload. A second restart of the same Tic-Tac-Toe result does not duplicate it. A full 100-row journal stays at 100, with the new row first. A revision-exhausted save refuses replay and keeps the stored text. Those retention checks are adjacent to #347; they do not add a Block Cabinet journal case.

## Fresh Block Cabinet seed

Confirmed restart of `blockcabinet` sets `freshSeed`. On confirm, `reset-confirm` refuses when `saveError` is set and storage is protected or not session-only. Otherwise it records a finished game, stops the bot, and builds:

```text
BLOCK- + hash(previousSeed + ":" + Date.now() + ":" + Math.random()).toString(36), upper case
```

If that string equals the previous seed, one `X` is appended. `log` and `redo` are then cleared. An explicit `block-use-seed` value replaces that generated seed after the same confirm path.

| Requirement | Evidence | Residual |
| --- | --- | --- |
| Constant time and random | `club-fresh-seed.test.cjs` restarts an empty `BLOCK-01` run 12 times under the frozen clock and `Math.random`. Each confirm yields a new `^[A-Z0-9_-]{1,32}$` seed, empty log and redo, and clears `__clubReset`. The hash input includes the previous seed, so frozen time and random still move the chain. | Distinctness is for those 12 chained values in the helper. The `X` fallback compares only the immediate previous seed. There is no global or cryptographic uniqueness claim. |
| Cancel and protected refusal | Opening restart leaves `diagnostics().state` unchanged. A save whose payload is `{ schema: 500 }` refuses confirm, keeps that state, keeps the raw `alibi-afterhours-v1` text, and toasts a save/storage message. Session-only storage (`unavailable: true`) still allows a new Block seed and a Learner selection. | The fresh-seed comment says cancelling changes nothing, but the test never dispatches Cancel or Escape. It compares Club state after the dialog opens. `close-dialog` lives in `src/app.js` and does not clear `__clubReset`. This session did not show a stale intent being confirmed later. |
| Journal and log clearing | Confirm assigns `log = []` and `redo = []` after `record()`. `record()` returns immediately unless the current game is done, skips an existing id, and slices the journal to 100. The Duel copy says completed records stay. | The fresh-seed fixture starts from an empty unfinished log, so it does not prove a finished Block Cabinet journal row. The result-retention file covers Tic-Tac-Toe, Duel, and Lantern Gardens, not Block Cabinet. The journal is retained or prepended, not wiped. |
| Simple and tactile actions | Tactile Start again is `data-command="new"` and calls `action('restart', { id: 'blockcabinet' })` (`src/block-cabinet/integration.mjs`). Simple controls call `restoreSimple`, which removes the tactile host and leaves the Club board. Both therefore use the Club restart path rather than a second seed generator. | No named Node test mounts the tactile surface or clicks Simple. `tests/browser_block_cabinet.py` clicks tactile Start again, expects a new seed, then switches to simple controls. It was not run. |

`block-replay-cache.test.cjs` and `block-replay-long.test.cjs` passed with the suites above. They pin the Block replay cache: independent state, suffix replay, undo/redo as log arrays, rejection of bad moves, a 268-move history under the 500-move cap, and one real Club placement surviving reload. "New seed and restart do not reuse old tray, score or board" calls `blockCabinet.replay` with another seed string. It does not call the Club `freshSeed` generator.

## Browser evidence limits

Not run in this session:

- `tests/browser_gameplay_continuation.py` (standalone Duel strengths, Escape on a live confirm, real worker reply, retry, 390 and 1280 CSS pixels).
- `tests/browser_block_cabinet.py` (tactile restart, simple controls, undo/redo, explicit seed).
- Any served origin, IndexedDB, service worker, offline reload, Android, TalkBack, or physical phone pass.

`HUMAN_TODO.md` still has open device items, including q-2 and q-4 through q-9, and the Block Cabinet tactile candidate says no physical Android result is claimed. Those items were not changed.

Node proof here is the 49-test command plus source reading. It does not show pixels, focus in a real document, or a worker thread executing the search.
