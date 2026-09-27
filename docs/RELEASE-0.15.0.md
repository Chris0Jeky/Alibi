# 0.15.0: Tell us what you think, and the vaults open

## Source candidate: 27 September 2026

This release gathers the 2026-09-27 QA wave and the owner's feedback decisions:

- **Voices** ([#413](https://github.com/Chris0Jeky/Alibi/pull/413)): the Feedback button,
  "Report a problem with this puzzle", the puzzle rating row, the `alibi-taste-1` survey and the
  Settings/Privacy panels. Messages and answers go to the Pulseboard collector
  ([Pulseboard#149](https://github.com/Chris0Jeky/Pulseboard/pull/149)), queue offline for up to
  30 days, and are sent only after the player presses Send, submits or taps. Official puzzle
  journeys now carry `family` and `tier`. The collector was already live before this release:
  schema 5, voices admitted `["alibi"]` (Pulseboard `HUMAN_TODO.md` q-30).
- **Archive Heist vaults** ([#405](https://github.com/Chris0Jeky/Alibi/pull/405)): rooms 10–33,
  solved markers and end cards. Old room 01–09 saves are unchanged; a build older than 0.15.0
  refuses a Club save that has opened a vault (read-only session, nothing lost).
- **Challenge library** ([#409](https://github.com/Chris0Jeky/Alibi/pull/409)): grouped list,
  real boards, completion cards, automatic Ink replies in Lantern Duel endgames.
- **Castle** ([#406](https://github.com/Chris0Jeky/Alibi/pull/406)): Chapter I completion, the
  thread and locked-door guidance, clock input formats.
- **Games Room** ([#410](https://github.com/Chris0Jeky/Alibi/pull/410)) and **core cabinet**
  ([#412](https://github.com/Chris0Jeky/Alibi/pull/412)) fixes from the audits in
  `docs/qa/2026-09-27/`; **Block Cabinet** move cap
  ([#403](https://github.com/Chris0Jeky/Alibi/pull/403)).
- **Sites retirement notice** ([#398](https://github.com/Chris0Jeky/Alibi/pull/398)): shown only
  on the retired Sites origin, after the single retirement deployment (`HUMAN_TODO.md` q-9).
- **License** ([#396](https://github.com/Chris0Jeky/Alibi/pull/396)): PolyForm Strict 1.0.0.

No puzzle id, revision or published definition changed, and `alibi-device` stays at version 1.
Budget ceilings raised by measured amounts (each commented in `tests/budget.test.cjs`):
application JS 133,670 gzip (+3,648 over 127 KiB), initial code plus official data 204,905
(+128 over 200 KiB, to be trimmed), main CSS 34,079 (+320), Quiet Wing pack 2,312,559 (+8,576),
precached shell +22,528 for the Voices chunk.

Version 0.15.0 is registered in `package.json` and `content/releases.json`; the release label and
the pinned Pulseboard SDK copy come from `npm run release:prepare -- 0.15.0 --publish`.

Merge note: on the owner's instruction ("merge everything in order ignoring CI"), #409, #410,
#411, #412, #413 and #423 were merged with an admin override after conflict resolution, before
their final CI runs finished. The merged `main` was then built and its full Node suite run
locally (all pass except `asset-audio`, which needs `ffprobe`), and this release waits for CI on
the release pull request before deploying.

## Publication receipt

Pending.

## Evidence limits

Browser suites ran in desktop Chromium with emulated phone viewports. They do not establish
physical Android behaviour, TalkBack, large system text, human difficulty or enjoyment. The
owner's one phone session ([PHONE-SESSION.md](PHONE-SESSION.md)) and player-data calibration
([CALIBRATION.md](CALIBRATION.md)) cover those; `HUMAN_TODO.md` q-2 through q-9 remain open.
