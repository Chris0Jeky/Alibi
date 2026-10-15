# Explicit level identity for numbered-game saves

27 September 2026, refs #408. Base main: `a3c6ad9bc3b27573d2f310a4313418c47a4b3f49`.

## Defect and boundary

Archive Heist and Lantern Gardens engines accept an omitted initial level as level zero.
That default is useful when beginning a new game, but unsafe as validation of a saved game:
a run with missing `level` can pass replay validation while retaining undefined metadata.
Later rendering or room naming then receives an invalid level. Treat a missing identity as
an invalid save, not permission to guess the player's room.

The shared UI/import-worker validator now requires both numbered families to own an integer
`level`. Existing engine validation still owns the published level range and legal replay.
Inherited levels are rejected because they disappear when a run is serialized. All published
explicit level IDs, including zero, retain exactly their existing definitions and histories.
Games without numbered levels do not acquire a new requirement.

No new schema, record, database, reward or puzzle identity. No repair writes, silent level-zero
migration, data clearing, limit relaxation or changed application defaults. Rejected local
saves remain protected and retain their original bytes. Imported invalid data is refused before
restore review; valid backups retain the existing explicit preview/cancel/restore flow.

## Regression evidence

The pre-fix run reproduced six failures across missing/inherited/undefined levels and protected
boot behavior. Nine new tests now pass alongside the existing backup and scalar-bound suites:
22 source tests, zero failures/skips. Tests cover malformed scalars, every published level,
independent returned copies, unchanged invalid input, original saved bytes retained on boot,
and unaffected unnumbered games. The new Python browser suite passes syntax compilation.

Local source comes from the uploaded archive; the edited validator was matched to main's
original Git blob before changing it. Other archive files are not represented as exact current
main. npm registry resolution is unavailable locally, so full build, budget and browser claims
must come from the exact-head GitHub workflow, not this source-only run.

## Exact-head acceptance

`Numbered game import controls` records the checked-out SHA and retains full verify diagnostics.
It requires all current source tests, build and unchanged size budgets, then runs actual combined
backup file import at 390px and 1280px. Missing Archive and Gardens levels must be refused by the
worker before restore controls appear; explicit zero must still reach review; cancel preserves
cabinet counts and the Club fallback. Existing worker timeout/no-write tests run separately.
The synthetic fixtures contain no private saves. Receipts/screenshots remain workflow artifacts.

Inspect final-head logs and screenshots before readiness or merge. Independent review and
physical Android/TalkBack acceptance are separate gates; no human test or deployment is implied.
The wider completion and challenge-navigation work is tracked separately in #416 and #421.
