# Sunrise Studies and Eclipse Lab integration

Base: GitHub main `7636d385050e8a3c308cf46cccc615fc3e6fd9ce`, reconciled byte-for-byte with the uploaded source archive before work began.

Chris requested more Sun & Moon content, related puzzles, experiments with different rules and interactions, player ratings/feedback, and reviewed merges. This change combines the independently reviewed content and Lab slices; it does not publish a production release.

## Delivered

- Sunrise Studies adds 30 classic Sun & Moon levels (15 at 6×6, 15 at 8×8) and 12 Futoshiki levels at 7×7. The official catalogue becomes 612 puzzles / 33 packs, including 85 Sun & Moon and 63 Futoshiki. Its original 403 startup definitions remain unchanged; 209 definitions are deferred.
- Eclipse Lab adds 32 separate levels across Constellation, Eclipse, Harbour and Switchback, with linked implications, exact window sums and adjacent-change counts. These are not added to the official catalogue total.
- An optional player provides complete textual rules, phone-sized controls, keyboard movement and brushes, undo/redo, clue highlighting, explicit group fills and local reasoning hints. Navigation and Workshop expose `#/quiet/eclipse`.
- Lab saves pin definitions and use bounded local storage with write locks, conflict checks, protected unknown bytes, export and confirmed restore with recovery. The Lab is separate from the combined Cabinet/Club/Wing/castle backup.
- Optional ratings, difficulty impressions and notes stay local. A prefilled GitHub issue link sends only saved feedback fields when the player explicitly reviews and submits it. Boards, histories and recovery payloads are excluded.
- One separately cached asset contains all Lab rules, levels, styles and controls. A 64 KiB raw limit applies to that asset; existing startup and shell limits are unchanged. Android payload receipts include it, and the rules digest covers its model and storage validation.

## Review findings addressed

Independent source review found and reproduced full-save edit loss and protected recovery payload loss; both now have storage regression tests. Later review found an offline diagnostics API mismatch and focus loss after rerendering. The real API and keyboard journeys now cover those cases, including the final Undo/Redo boundary. The independent Futoshiki counter now also rejects a violated inequality between two fixed givens.

Review at integrated source `bb5b1e0` found no remaining blocking finding, conditional on final-head CI and budgets. Small delivery/accounting tests and this handoff were added afterward and are covered by final verification.

## Verification and boundaries

- The untouched baseline passed 2,545 Node tests and the web/Android payload build.
- The content slice passed all eight Sunrise proof/regeneration tests, including independent uniqueness, explicit exhaustion, symmetry/complement rejection, and hashes of all 570 earlier definitions and legacy fixtures. Existing Night, authoring, catalogue and deferred-count checks also passed.
- The integrated Lab passed focused model, content, storage, build and activity-lifecycle tests. Real Chromium 153 / Playwright 1.62 journeys passed at 320, 390 and 1280 pixels, including all four first levels, 6×6 target sizes, keyboard focus, group undo, feedback export/sharing, restore/recovery, protected records, session-only saving and offline reloads.
- The first clean Lab web/Android build emitted a 50,018-byte asset (14,943 gzip bytes) and passed the existing budget/accounting checks. Copy was shortened without changing behavior or raising limits. The separate content slice's earlier shell-budget failure is historical; final combined measurements belong to the final CI build receipt.
- `.github/workflows/eclipse-lab.yml` runs the real browser journey against the exact PR head and retains source/tree identifiers, screenshots and the build receipt. The normal required verification and Android workflows remain merge gates.

No human difficulty calibration, physical Android/TalkBack acceptance or hosted production acceptance is claimed. The existing owner release decision in `HUMAN_TODO.md` remains separate. The 42 official additions have no human no-guess certificate; the Lab levels are experimental. See [the player guide](../ECLIPSE-LAB.md), [research](../research/2026-11-09-eclipse-lab.md), and the separate Sunrise/model handoffs for method and limitations.
