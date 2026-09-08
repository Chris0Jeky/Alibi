# Release and acceptance checklist

Do not mark unperformed checks as passed. This is the long-term acceptance backlog. See STATE.md for the measured 0.3.0 gate results. Automated real-origin acceptance and physical Android certification are separate.

## Before the first public link

- [ ] Choose the permanent origin and public working name. Confirm that you control the deployment account.
- [ ] Review the on-site privacy/credits page. Add the real operator/support contact and decide source/content licensing before public source redistribution.
- [ ] Keep an untouched copy of the original 0.1 deployment and export any existing player progress.
- [ ] Run `npm run build`, `npm test`, and optionally the Python UI suite. Retain build-info and test reports with the release.
- [ ] Upload only the deployment ZIP. Verify index, manifest, service worker, icons and hashed assets return successful responses and appropriate MIME types.
- [ ] Verify security headers on the actual host. Check for unexpected external requests in the Network panel.

## Hosted desktop: storage and migration

- [ ] Make moves and notes in all three mystery formats and at least one visual puzzle. Reload the browser, then close/reopen it. Verify moves, notes, completion and settings remain.
- [ ] With real IndexedDB, export a backup. Change a board. Restore using Add missing only: the existing board must remain. Restore using Replace: the backed-up board must return, and Recovery export must contain the pre-restore state.
- [ ] Import a v0.1 backup into v0.2. Complete and resume legacy cases. Record any unsupported data without deleting it.
- [ ] Open the same puzzle in two tabs. Save from both. Confirm conflict protection blocks silent overwrites and the losing session can export before reload.
- [ ] Simulate quota/transaction failure in a disposable profile. Confirm Not saved, edit blocking and export recovery. Never perform destructive tests on the real playing profile.
- [ ] Test newer-database refusal and malformed backup rejection with disposable fixtures. The app must not clear or overwrite incompatible data.

## Android: five-minute first pass, then deeper play

- [ ] Open the permanent HTTPS URL in normal Chrome. Start a scene, read the lesson and place two people. Open the bottom Evidence drawer and My notes without leaving the board.
- [ ] Install from the browser/app prompt. Launch from its home-screen icon. Check title/icon, safe-area spacing, portrait layout and keyboard behaviour.
- [ ] Wait for Offline ready. Close, enable airplane mode and reopen. Open an unplayed puzzle, make a move, close and reopen again. Progress must remain.
- [ ] Play one paint/drag game, one number-pad game and one waterline/rotation game. Confirm ordinary scrolling works outside painting boards and the enlarged board pans locally.
- [ ] Export to the Android file picker and restore from that file with normal IndexedDB available.
- [ ] Test with large system font/display settings, reduced motion, dark theme and Android back behaviour. Use TalkBack for the intended accessibility scope; this is not a fully nonvisual implementation.

## Two-release update acceptance

- [ ] Deploy release A, install it, start an unfinished puzzle and record its definition/revision and several moves.
- [ ] Build B with a visible version/content change. Deploy B to the SAME production project, not another preview hostname.
- [ ] Open A online and Check for updates. The new release should wait. Make another move before selecting Save & update.
- [ ] Select Save & update. Verify B loads and the latest move, notes and old puzzle definition remain intact.
- [ ] Change a published puzzle to revision 2 in a staging test. Continue revision 1 and start revision 2 separately; neither may silently replace the other.
- [ ] Interrupt a new shell download. A must remain usable; a partial B must not activate.
- [ ] Leave a second tab open through the update and test it. Confirm no forced mid-game reload and no database loss.
- [ ] Attempt rollback in staging. Confirm you understand what app version controls each tab; do not expect the database or service-worker cache to roll back automatically.

## Content and UX acceptance

- [ ] A human solves at least two puzzles in each family without the solution array, including one Tricky case.
- [ ] Review every mystery's names, story, room grammar, furniture clue and final accusation explanation.
- [ ] Confirm displayed difficulty/time estimates are reasonable; revise labels from playtest evidence.
- [ ] Test keyboard-only navigation, focus restoration, all twelve lessons, error messages, favourites, search, casebook unlocks and restart confirmation.
- [ ] Check at least one small Android device in landscape, not only emulated portrait widths. Confirm colour is not the only meaningful cue.

## Rollback or repair

Stop promoting a release with data-loss symptoms. Keep the affected site's data intact, export, and capture build/version/browser details. Prefer a forward fix that reads all current save formats. A previously tested ZIP can restore application files but cannot reverse a database migration. Never include `indexedDB.deleteDatabase` or broad cache deletion as a routine rollback. Domain migration requires an explicit old-origin export/new-origin restore plan.
