# Per-change state notes

Use one Markdown handoff per pull request or independently progressing change. Keeping each
handoff at a unique path lets parallel changes retain their evidence without editing the same
`docs/STATE.md` lines.

## Naming

Once a pull request number exists, use
`docs/state/<date>-pr-<number>-<short-slug>.md`. Before then, use the issue number when available
and include a branch-specific slug, for example
`docs/state/2026-10-20-issue-693-state-fragments.md`. Make the path unique for any work that may
be open at the same time; keep it after merge so its evidence remains available.

## Content and lookup

Record the change's scope, outcome, validation evidence, evidence limits, and remaining gates.
Keep project-wide baselines, release status, and owner decisions in [the state overview](../STATE.md)
and [owner decisions](../../HUMAN_TODO.md). Link to a handoff from its pull request when useful.

This README describes the convention and is not a per-change index. Browse `docs/state/` or run
`rg --files docs/state` to find notes; do not update a shared index for every pull request. Do not
rely on `.gitattributes` `merge=union` to reconcile the history: a merge may retain competing
status lines together, and local merge-driver behavior is not a guarantee of hosted behavior.
