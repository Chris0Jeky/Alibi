# Live development state

Updated 2026-09-08. Git, CI and review threads take precedence over prose.

- Editable source extracted to root. Original input bundle retained untouched and ignored.
- Public repository: https://github.com/Chris0Jeky/Alibi
- Active slice: `feat/public-puzzle-cabinet`, preparing 0.3.0.
- Sites project registered in `.openai/hosting.json`; no deployment claimed yet.
- Baseline passed locally: 1,741 engine/content assertions, 27 storage assertions,
  24 build/service-worker assertions and 157 isolated Chromium UI checks.
- Candidate 0.3.0 build `f7d5da27ca94`: illustrated phone cabinet, clue-based reasoning hints,
  solved-case records, save/draft validation and keyboard fixes are implemented.
- Candidate local evidence: 1,741 engine/content + 27 storage + 29 worker/build assertions,
  seven named hint/recovery regressions, 169 isolated Chromium UI checks,
  92 real-origin checks and 18 A/B release-update checks. All pass.
- Browser scope: Chromium 151.0.7922.34, including 390px persistent-profile acceptance,
  all twelve family completions, restart/restore, stale-tab protection and offline reload.
- Release bundling includes only browser reports whose application build matches.
- Next: hosted CI, independent adversarial review, public deployment and origin acceptance.
- Tracked follow-up: #1 curated casebook, #2 physical Android acceptance, #3 estate registration.

The bundle's reports are historical. `docs/RELEASE-CHECKLIST.md` retains the broader acceptance
backlog. Owner decisions: [`HUMAN_TODO.md`](../HUMAN_TODO.md).
