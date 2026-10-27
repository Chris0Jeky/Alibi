# #433 in-app curated collections (2026-10-26)

Scope: first slice of on-demand delivery. Workshop > Puzzle packs gains **Add a
curated collection**; a lazily imported, non-precached module lists Lattice (24) and
Afterlight (10), downloads one on request, verifies listed size and SHA-256, and hands
the bytes to the existing importer. Design and byte table:
[WORKSHOP-DISCOVERY.md](../gameplay/WORKSHOP-DISCOVERY.md#2026-10-26-in-app-adding-first-slice-of-option-b).

Changed: `src/workshop-add.mjs` (new), `tools/build-workshop-shelf.cjs`,
`tools/workshop-entry.cjs`, `tools/build.cjs`; tests `workshop-add.test.mjs` (new),
`workshop_add_browser.py` (new, run from `browser_workshop_discovery.py`), budget,
shelf, delivery and cache-identity updates. No published content, ID, revision, save
format or byte ceiling changed.

Verified locally (Windows, Node 24, Chromium 151): build:android; the adder unit
tests (7, with digest and size guards each mutation-checked red); workshop, budget,
service-worker, delivery, identity and Android-manifest suites; the discovery browser
suite (14 checks) and the adder browser suite (10 checks at 320 and 1280 px:
keyboard entry and Escape focus return, add and play Afterlight, tampered and offline
Lattice refused with saved runs byte-identical, real add with runs byte-identical,
duplicate refused, play with undo/redo and offline resume).

Not verified: full `npm run verify` suite, Android emulator/native, physical phone,
TalkBack/screen reader, hosted origin. The discovery workflow's path filter does not
list `src/workshop-add.mjs` or `tests/workshop_add_browser.py`; a change to only those
files would not trigger it (workflow edit left to an owner-authorized change).
