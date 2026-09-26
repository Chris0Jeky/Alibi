# Alibi local-first review: spoken summary

Alibi keeps play and saves on the device, with player-owned JSON backups. Preserve that baseline.
A future sync service must return conflicting boards as separate alternatives, with explicit
resolution and consent. It must not silently overwrite a board or require an account for local
play. No sync server, outbox or replication runtime is being shipped in this docs-only proposal.

The [self-contained review](PLATFORM-LOCALFIRST-SCAVENGE-2026-09-23.md) includes the candidate
ADR-PLF-04, drill matrix, source paths and evidence limits. The earlier machine-local handoff is
not required to review it. Thirteen focused source tests passed; maintainer review and any new
browser/device acceptance remain outstanding. Related issue: #282.
