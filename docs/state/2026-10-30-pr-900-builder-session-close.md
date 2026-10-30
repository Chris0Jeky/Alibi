# 2026-10-30 builder session close (claude-alibi-builder-1030)

Merged to `main` through the estate gate (merge commits, CI green, one or two review lenses each).

## By value tier

- **Major:** #879 Workshop drafts no longer overwritten across tabs (closes #877, data loss); #888 Workshop
  room-name edit no longer swallows the next click or Tab (closes #885); #890 remove a locally added pack,
  keeping saved progress (closes #887); #892 phones show "Find my first puzzle" (closes #891); #867 Scene
  Maker draft file (closes #864); #874 composition incl. #870 Practise a technique.
- **Solid:** #886 run saves — restore waits for this tab, damaged rows say damaged, strokes stop when frozen
  (closes #882); #894 Field notes 3D textures load (CSP `connect-src blob:`), hints stop at the last, Turn
  waits for 3D (closes #893); #897 startup validation 3–8× faster for many saves (#896 item 1); #883 stalled
  shelf download stops after 10 s (#881 item 2); #869 Privacy Reload (closes #848); #868 print clues on
  Notes/Rules (closes #866); #876 release identity + origin probe (#595 item 1).
- **Minor:** #878 release receipts (closes #875); #872/#873 hint-test strengthening and print-sheet flake
  (close #865, #871); #814, #816 and compositions #853, #855, #863 earlier in the day.

How the later bugs were found: Muse bug-hunt lenses isolated on `origin/main`, four exploratory-tester passes
(phone 390×844 touch and desktop), and a 4×/6× CPU-throttled performance measurement.

## Parked (open PRs, not merged)

- **#898** Practise a technique walks the family in yielding slices (#896 item 2): reviewed, locally green on
  main after #897, CI `verify` was still running at wind-down. Land when green.
- **#899** Club controls refuse after a save conflict; Exit Zen still works (#884 item 1): reviewed, green on
  `9a05c8b4`. Needs `origin/main` merged (budget/catalogue conflict with #898), re-measured ceilings and the
  Node + `browser_origin.py` runs before landing.

## Tracked follow-ups (noticed / non-blocking)

#880 (draft CAS LOWs), #881 item 1 (restore skips the 3,000-puzzle bound — needs a product call), #882 LOW
comments, #884 items 2–3, #889 (pack removal LOWs), #895 (Castle/Quiet Wing polish), #896 item 3 (nonogram
taps render twice), claude-config#1206 (estate_gate check-runs 500).

## Owner decisions (agent-hq inbox, rendered in HUMAN_TODO.md)

- `alibi-release-20261030`: production still serves `030d5812` (13 October, v0.15.2); main is ~150 merges
  ahead. Recommended: an agent releases main with `npm run cloudflare:release -- --deploy` after the
  Pulseboard collector deploy (q-13).
- `alibi-sharing-features-20261030`: blocks #827 and #834.

## NOT verified

Physical phones and printers, Firefox/Safari, screen readers, hosted Cloudflare headers, the release script's
`--deploy` path.
