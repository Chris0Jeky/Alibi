# Platform Local-First scavenge — delta 2026-09-30

**Scout:** Geek Scouts Platform Local-First (docs/ADR/acceptance only)  
**Box pack:** `/workspace/handoffs/platform-localfirst-scavenge-2026-09-30/`  
**Baseline:** `/workspace/handoffs/platform-localfirst-scavenge-2026-09-23/` (merged PRs Taskdeck #3396 · Alibi #281 · action-stack #18)  
**Fences:** No second Action Stack · no product rewrites · no UX QA · no design-system · never auto-merge

## Spoken TLDR

Seven days after the inaugural pack: the sync category converged on **server-authoritative writes + read-path sync** (Electric / Zero / TanStack). Steal that ethics language — not the runtimes. Add a **field-strategy registry** (LWW / Field-Union / manual_review; never LWW-overwrite CRDT-shaped fields) and **offline spectrum honesty** (warm reads ≠ durable offline writes). Prior steals still stand: LWW/revision-guarded single-writer, outbox ethics, capture→review→mutation, sync-ethics checklist, weekly offline dogfood. Action Stack #10 remains the live Notion gate.

## What's NEW vs 2026-09-23

1. **ADR-PLF-06** — server-authoritative write path as estate default; skip bidirectional CRDT write stacks.
2. **ADR-PLF-07** — field-strategy registry; Alibi boards + AS completion conflicts stay two-alternatives / Keep-remote.
3. **ADR-PLF-08** — name the offline phase each product actually promises.
4. Operator-queue mirrors (rapid-issue-triage, Linear delta sync) **reaffirm** AS Later + local-only deferral — do not fork Priority Stack.

## Reaffirm (unchanged)

- ADR-PLF-01..05 from the 09-23 pack
- No browser cloud tokens · no auto-admit · no silent overwrite · no multi-device CRDT default

## Acceptance

See box `ACCEPTANCE.md`. Research does **not** close action-stack #10. Alibi #282 stays open until human architecture skim.

## Sources (primary, delta)

- https://blogs.abhipanseriya.dev/blog/electricsql-deleted-bidirectional-sync-the-whole-category-followed
- https://zero.rocicorp.dev/docs/mutators
- https://zero.rocicorp.dev/docs/release-notes/1.0
- https://www.replication-conflict-resolution.org/conflict-detection-automated-resolution-strategies/algorithm-selection-for-merge/choosing-between-lww-field-union-and-crdt/
- https://linear.app/now/rebuilding-delta-sync-read-path
- https://pkg.go.dev/github.com/polds/rapid-issue-triage
- In-repo: action-stack `ARCHITECTURE.md` · Alibi `docs/ARCHITECTURE.md` · Taskdeck GP-06 / RESEARCH_BRIEF

## Non-goals

No code changes in this PR. No competing queue product. No CRDT/Electric/Zero/PowerSync/Jazz rollout. No merges from scout automation.
