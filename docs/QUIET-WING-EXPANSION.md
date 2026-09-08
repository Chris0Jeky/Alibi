# Quiet Wing expansion

Owner request, 2026-09-08: carry the expanded game through to the existing website. The source
integration is the starting point, not the definition of completion. Keep incremental commits.

## Intended experience and evidence

- A full creative city builder: modular castles, homes and roads, reproducible landscape/town
  generation, larger maps, move/copy and area tools, reversible edits, useful town feedback,
  polished lighting and animated life. Prove generated layouts and edits with reducer tests,
  actual controls, save/reload, mobile visual inspection and measured rendering performance.
- Better companions: expressive, quality animal assets and animation for every existing action;
  preserve names, bonds and walks. Record redistribution rights and animation provenance.
- More relaxing games and deeper garden/idle interactions with bounded, clock-safe progression,
  accessible controls, explanations and meaningful completion tests. Preserve all earlier games.
- A coherent visual refresh across Quiet Wing, Club and the puzzle/casebook surfaces. Use curated
  assets or specifically art-directed imagery; inspect phone and desktop renders, not just files.
- A release on the existing public website: all local and CI checks, independent review, saved
  recovery artifacts, exact hosted responses, persistence, offline and update checks. Public
  origins and all existing database identities remain unchanged.

Physical-device checks, accessibility certification, subjective difficulty and the Android freeze
remain honestly separate in HUMAN_TODO.md. The owner has authorized website deployment; do not
turn those unperformed checks into claims of certification or abandon the authorized hosted work.

## Current checkpoint

- Existing source PR #14 passes both GitHub verify runs at 0672754. Independent review is recorded.
- Automated feedback: the harbour starting-place option is malformed (confirmed medium); the
  unversioned credits page can remain stale after an update (confirmed medium). Both overlap the
  requested city controls/asset-pipeline expansion and will be addressed in those slices.
- First implementation slice: seeded larger worlds and reversible city planning tools. Follow
  with imported modular models and accelerated presentation, companions, additional games,
  cross-app art direction, then complete release verification. This list remains open until the
  corresponding user-visible work and evidence exist.

Recovery: export all saves before release testing. Never clear site data. Roll back application
files while preserving the cabinet, Club and Quiet Wing databases and raw recovery exports.
