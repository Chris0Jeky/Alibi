# Goal planner — 2 October 2026

| Priority | Work | State and next action |
| --- | --- | --- |
| 1 | #523 wave-2 integration | Refreshed at 16f203b; full local verify passes; Muse xhigh review has no findings; exact-head CI pending. Merge when green. |
| 2 | Update save/reload boundary | Muse and Sol confirm optional-store and note input gaps. Reproduce and implement a synchronous pause plus final flush as a separate slice. |
| 3 | #524 challenge import cap | Source and built-worker focused checks pass (19); actual file and Worker browser boundary passes, including unchanged replay on oversize and valid at-limit restore. Complete full gate and review. |
| 4 | #497 Borough control reachability | Three phone sizes and desktop confirmation pass; main UI suite 184 checks passes; screenshots inspected. Explicit focus/reveal and phone navigation margin. Full gate/review pending. |
| 5 | #512/#513 activity regressions | Independent Sol review finds no blockers. Refresh after #523 lands, rerun changed seam, then exact-head CI and merge. |
| 6 | #522 dependency maintenance | Existing green PR; inspect diff, independently review and refresh after current changes. |
| 7 | Lifecycle backlog | Stale lesson completion and disposal-flush claims await causal triage; no worker dispatched from unconfirmed claims. |

Per-slice limit: one implementation, one real review, one confirmed-blocker repair and scoped verification. Three distinct red-check attempts, then preserve and park with evidence. Continue high-impact delivery before speculative new infrastructure or puzzle volume.
