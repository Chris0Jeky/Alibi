# Completed-board instruction (issue #967)

Changed the shared solved-board instruction so it does not promise another puzzle when the family is complete. The existing next-puzzle, family-list, casebook and rehearsal action labels and routes are unchanged. Refreshed the catalogue fingerprints for the teaching entries that reference the application source.

- Verified: The new assertions failed against the original wording. The core-cabinet Playwright suite passed 59 checks in Chromium at 390 and 1280 CSS pixels; both widths still open the actual family list. Inspected both screenshots.
- Verified: Formatting, Android web-payload build, and the 19 focused asset-catalogue and budget checks passed. Precached shell size fell from 1,444,254 to 1,444,251 bytes, below the unchanged ceiling.
- Not verified: Full hosted CI, a physical phone, installed Android, or deployed origins.
- Residual risk: The new instruction is intentionally generic. The action label continues to name the destination.

[Owner decisions and manual checks](../../HUMAN_TODO.md)
