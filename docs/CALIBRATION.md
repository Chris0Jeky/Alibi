# Difficulty calibration from player data

Owner decision 2026-09-27 (walkthrough q-10): difficulty labels are calibrated **from in-app player
ratings and measured solve data first**. The owner playtests only the puzzles the data flags.
This replaces the manual per-puzzle sampling that `HUMAN_TODO.md` q-5, q-6 and q-8 asked for,
without removing the physical-device checks (those moved to [PHONE-SESSION.md](PHONE-SESSION.md)).

Machine checks (uniqueness, no-guess routes, minimum pushes) keep proving that a puzzle is sound.
They never set a human difficulty. Player data does.

## Signals (all device-local until the player acts or consents)

| Signal | Source | Consent |
|---|---|---|
| Rating: too easy / just right / too hard, and "More like this" | the rating row on each official puzzle's completion screen, sent as the `puzzle-rating` survey (Pulseboard Voices, one row per installation and puzzle, resubmission replaces the old answer) | the player's tap |
| Started, completed, failed checks, hints, seconds | Pulseboard journeys (`puzzle.started/completed/failed`, `hint.requested`, with `family` and `tier`) | the Beta "Journeys" category |
| Written feedback on a puzzle | "Report a problem with this puzzle", or the Feedback sheet with kind "A puzzle" | the player's Send |

## When a label counts as calibrated

A puzzle's label becomes **calibrated** (no longer "provisional") when, over its current revision:

- at least **8 distinct raters** and at least **10 completions**; and
- at least **55 %** of ratings are "just right", and neither "too easy" nor "too hard" exceeds 35 %; and
- its completion rate (completed ÷ started) and median solve time sit inside the range of already
  calibrated puzzles of the same family and tier (once a family has five calibrated puzzles; before
  that, the rating rule alone decides).

A puzzle is **flagged** for the owner (or an agent's closer look) when any of these hold after the
minimum sample: "too easy" above 50 % (label probably too high), "too hard" above 40 % or completion
rate below 50 % (label too low, or the puzzle may be guess-heavy or confusing), or written feedback
reports a wrong or ambiguous clue. Flagged puzzles are the only ones the owner is asked to play.

"More like this" counts, grouped by family and tier, feed the content plan: the families with the
most hearts per completion get the next collections.

## Who does what

1. The collector keeps the ratings and journeys (Pulseboard Voices and product events). The Desk's
   Voices and Content views show them per puzzle, family and tier.
2. Periodically (for example before each release), an agent session with Desk access reads those
   views, applies the rules above, and opens one PR that:
   - records puzzles that pass as calibrated from player data (N raters, M completions, date),
     without changing puzzle definitions, ids or revisions;
   - lists flagged puzzles in the PR and in `HUMAN_TODO.md` for the owner to play.
   Not yet possible as data alone: `tools/curation-editorial.cjs` rejects any editorial
   `difficultyStatus` without "provisional" or with `humanPlaytested` other than false ("Unverified
   calibration claim"). The other puzzles carry their status in their definitions
   (`content/extra/*.json`), where `src/core.js` caps it at 40 characters and an edit would change
   the definition. Only two of the seven challenge files have the field. The first calibration
   PR therefore needs a reviewed code change first: a separate calibration record that the build
   guard accepts.
3. Relabelling a puzzle to a different tier is a content decision: it goes in its own reviewed PR
   with the evidence, and it never rewrites a published definition silently.

## Limits

- Ratings are client-reported and can be spoofed; one installation counts once per puzzle.
- Few players means slow calibration; the thresholds are deliberately small but still need real play.
- Players who turned Journeys off contribute ratings but not solve times.
- Physical-device comfort, TalkBack and touch ergonomics are not measured by any of this.
