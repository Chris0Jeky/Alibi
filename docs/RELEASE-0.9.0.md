# Alibi 0.9.0 · A clearer way to explore

Published 2026-09-09 from `92565a4a064c02dae00dd3bd80678ecaaaf91cd4` (PR #65).
Build `f0b367c654a4`; 328 puzzles, thirteen families, four casebooks.

## Player changes

The desk introduces recent additions through direct feature invitations and illustrated collection
cards. The library retains family-first browsing and visible filter escape. What’s new is available
from the desk and footer, works offline, and covers the original source baseline and all public
versions. [CHANGELOG.md](../CHANGELOG.md) and historical GitHub release entries retain earlier changes.

Keyboard links focus the destination in both the cabinet and Quiet Wing. Bridges arrow keys stay
within the intended row or column. Local Quiet Wing motion remains a distinct saved choice;
root/OS reduced motion restricts the effective animation without overwriting that choice.
Garden imports reject inherited property names as seed identifiers.
The three anthology casebooks now use standalone-record framing; Bellweather retains its authored
chronology and revelations. A scoped Miniflare Sharp override deduplicates its vulnerable copy
onto the existing patched 0.35.4 dependency; clean install and audit report zero vulnerabilities.

## Verified

See [POLISH-QA.md](POLISH-QA.md). The news/history slice passes full source verification, 182 UI
checks, 66 curation checks, 20 discovery/history checks, the player-feedback matrix and 92 real-origin
storage/offline checks. The integrated Bridges expedition passes 261 checks. Focus/motion tests
exercise actual controls at phone/desktop widths. Final combined source verification passed.
Fresh independent review found no confirmed HIGH/CRITICAL defect; generator drift is tracked in #66.
Both complete CI runs passed: [push](https://github.com/Chris0Jeky/Alibi/actions/runs/34400930963)
and [PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34400934553).

- [Primary](https://alibi-after-hours-preview.commit-atlas.workers.dev/): Worker version
  `470dd0bf-f066-4a01-94d9-116b8842d924`; all 254 public files match the release.
- [Fallback](https://alibi-puzzle-club.jeky-tck.chatgpt.site/): Sites version 9,
  deployment `appgdep_6aa1c3f7c8e881918aa2a2e220f087ce`; all 250 non-HTML files match.
  Four HTML files retain exact source plus the known 938-byte hosting challenge script.
- Each live origin passes 92 real storage/offline checks. The primary also passes all 20
  discovery/history checks at 390px and 1440px, including actual large-text/contrast controls.
- A disposable saved Sudoku on each origin passed the actual 0.8.2-to-0.9.0 Check for updates /
  Save & update flow. An additional move was saved before activation; exact state and pinned
  definition survived activation and offline reload. Issue #63's transition gap is resolved.

The first primary file sweep timed out; a complete sweep with three concurrent requests and
60-second request limits passed. The initial hosted discovery test used string predicates
incompatible with the primary CSP. Function predicates pass without changing site security.
Earlier live-update seed failures and the unproven historical timeout remain separate evidence.

Build sizes: 155,899 bytes initial code/content gzip, 1,899,140 bytes core offline,
2,281,447 bytes Quiet Wing and 28,847,806 bytes upload ZIP. No budget was relaxed.
Local evidence is preserved under `test-results/polish-qa-2026-09-09/` in the primary checkout;
the release/update receipts originate in the coordinator's `release-0.9.0/` and `live-update-03/` folders.

## Historical release repair

Eight GitHub releases now lead with concise player changes. Missing 0.6.0, 0.8.0, 0.8.1 and 0.8.2
entries point to their original deployed source commits. Twelve API checks verified original tag
sources and preservation of the four existing receipts and asset IDs/names/sizes. GitHub normalizes
line endings; no substantive original receipt text was removed. No newer binary was presented as
an older release. The source-only 0.2 baseline remains labelled as such.

## Remaining acceptance

Physical Android/TalkBack, human sensory/difficulty review and owner decisions remain in
[HUMAN_TODO.md](../HUMAN_TODO.md). Simulated Chromium viewports do not certify a physical phone.
The castle production stack and its dependency issues remain separate active work, owned by
the **Explore Alibi castle expansion** task. Provider-controlled fallback headers/MIME remain #6.
