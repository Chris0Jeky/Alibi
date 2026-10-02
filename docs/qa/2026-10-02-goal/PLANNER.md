# Goal planner — 2 October 2026

| Priority | Work | State and next action |
| --- | --- | --- |
| 1 | #523 wave-2 integration | Merged at 45102bc after local verify, independent Muse review, exact-head CI and aging. Primary fast-forwarded cleanly. |
| 2 | #526 update save/reload boundary | Native Club, Shadow DOM rename and note mutation reproduced after flush. Candidate blocks all three; failure recovery, final-flush rejection and no-worker retry pass. Full gate, UI 184 and origin 270 pass. Muse findings triaged and final Sol review has no blockers. Updated-base Android/seam 31 and browser pause 4 + lifecycle 18 pass. Ready PR #533 is stacked on #527; await CI and merge oldest first. |
| 3 | #524 challenge import cap / PR #527 | Full gate, actual file/Worker boundary and independent Muse review pass. Refreshed after #528 at efa683f with full local verify. Fresh CI pending after prior cancellation, tracked #531. |
| 4 | #497 Borough / PR #528 | Merged at 9f7e09d after full verify, UI 184, four viewport checks, independent review, exact-head CI and aging. Physical acceptance remains open. |
| 5 | #512/#513 activity regressions | Independent Sol review has no blockers; 12 changed-seam checks pass and source blob matches refreshed heads. Refresh after #528 and await exact-head CI. |
| 6 | #522 dependency maintenance | Merged at 8072981. Install, full verify, Cloudflare dry-run, independent Sol review and exact-head CI pass. No live deployment or claim that every advisory is resolved. |
| 7 | #530 stale lesson completion | Real committed IndexedDB preferences reproduce navigation from Home back to Sudoku. Bounded Muse guard and four unit cases have RED/GREEN proof. Actual IDB regression also fails baseline and passes the guard plus normal finish. Existing budgets pass without increase; full verify, UI 184, mobile 14 and independent Muse review pass. Publish ready child PR on #533; await CI. |
| 8 | #529 Borough tablet / PR #532 | 700x800 and 700x568 baseline hit tests fail. Nav-aligned margin passes six viewport checks, full verify, UI 184 and final Android/budget 17 without ceiling increase. Independent Muse review has no blockers; CI pending. |
| 9 | Lifecycle disposal claim | Declined claimed Wing/Castle loss: retained state survives failed disposal and later update flush still rejects. Challenge-only path untraced, not counted as a defect. |
| 10 | #531 CI installation cancellation | Tracked observed dependency-install delays and cancellation near the 25-minute job limit. No workflow detour; fresh runs must complete before merge. |

Per-slice limit: one implementation, one real review, one confirmed-blocker repair and scoped verification. Three distinct red-check attempts, then preserve and park with evidence. Continue high-impact delivery before speculative infrastructure or puzzle volume. Human acceptance remains in [HUMAN_TODO.md](../../../HUMAN_TODO.md).

Stale issues #517 and #518 are closed after live-source verification: five byte-cap tests pass, and the trusted registry/build/docs agree on 510 unique puzzles across 30 packs, with 80 deferred.
