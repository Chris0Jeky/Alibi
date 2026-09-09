# Player feedback release 0.8.1

Published 2026-09-09 from PR #57, merged source `3a36ce255104ffff961a2fbdc4f5f3ea54632b5b`.
Build `653a01d17507`: 328 puzzles, 13 families, four casebooks, including 27 Sun & Moon boards.

## Changed

Family-first browsing and removable thematic filters; clearer disclosures, rules and note controls;
placed-digit feedback; saved scene candidate initials and independent board crosses; casebook story
pages; four new unique 8×8 Sun & Moon boards. Published definitions and save identities are preserved.
The two successful real playtests are recorded as qualitative success in PLAYER-QA.md.

## Verified

Both complete CI runs pass at `172b20ba010973d6053aff4acab4269d1a58f51a`:
[push](https://github.com/Chris0Jeky/Alibi/actions/runs/34387932889) and
[PR](https://github.com/Chris0Jeky/Alibi/actions/runs/34387936993).
Independent Terra review covered the feature; Luna reviewed the APT/test recovery. No blockers remained.
The recovery keeps signed Ubuntu package sources and all app assertions; it corrects stale catalogue
counts, family-first test navigation and a first-play lesson timing race.

- Primary: https://alibi-after-hours-preview.commit-atlas.workers.dev/ — Worker version
  `746799a9-247d-4317-b844-b338eb3aba74`.
- Fallback: https://alibi-puzzle-club.jeky-tck.chatgpt.site/ — Sites version 7, deployment
  `appgdep_6aa1a5fc10c08191b6c8bc4a4a88a811`, succeeded.
- Each live origin passes 92 storage/offline checks in disposable profiles.
- All 254 public primary files match validated bytes. All 250 non-HTML fallback files match.
  Its four HTML files preserve the exact source plus a 938-byte host challenge script.
- Local and CI player matrix uses actual controls at 390/1440; full UI, content, media, expedition,
  real-origin, update and optional-room suites pass. Local screenshots were visually inspected.

Evidence is retained in the coordinator's ignored player-QA CI recovery folder.

## NOT verified

The live 0.8.0-to-0.8.1 update probe seeded disposable games but exited without its final receipt.
That exact hosted transition is not certified; current-release persistence/offline checks and the
CI two-release update suite passed. Physical Android, TalkBack, large system text, sensory comfort
and sustained performance remain [HUMAN_TODO.md](../HUMAN_TODO.md).

## Residual risk

No finite QA session proves zero bugs. A subsequent accessibility audit found missing destination
focus after internal page navigation; `codex/route-focus` handles that separately. Three casebooks
are anthologies and need clearer standalone-record framing; Bellweather is the continuous mystery.
The known Sites response-header/MIME limitation remains #6; the development-tool advisory remains #58.
No accounts, new host identities or production player data were introduced.
