# Live development state

## Maintenance checkpoint: 25 September 2026

This checkpoint follows main `f1cd4cf2fabc28dae957b802153e51d4f943c556`.
The previous STATE is preserved byte-for-byte in
[the Night-merges archive](STATE-ARCHIVE-2026-09-25-NIGHT-MERGES.md).
Live GitHub takes precedence for newer heads, checks and merges. Older pending
statements in the archive are historical, not fresh verification results.

### Verified source merges

PR #360 merged as `4e7f4981`, binding backup writes and receipts to validated
call-time primitive values. Final-head Verify 36164570533, Android and Night
controls passed; review 5836305225 found no major issue. Cancellation, commit
boundaries, readback, byte limits and caller-owned state remain unchanged.

PR #329 merged as `7ec0d549`: Sun & Moon hints check bounded local alternatives,
reject contradictory moves and explain all applicable rejection rules. All six
final-head workflows passed, including Verify 36164757382; independent review
5836348251 found no major issue. Coordinate formatter reuse preserved text and
kept the measured app under its unchanged limit. This is not global solvability
proof after arbitrary guesses and does not consult the stored answer.

PR #344 merged as `f1cd4cf2` after all six corrected-head workflows passed,
including Verify 36165627607 and review 5836470132. Its opening guidance names
the printed A8/B8 moons correctly. All 48 Night studies are now source-merged:
430 puzzles in 26 packs. Difficulty labels remain provisional. Child #350 was
retargeted before the Symbols branch could be removed.

Earlier radius mapping #355 and its regression guard #356 are merged, as is
registry-derived Night browser discovery #358. Their exact source, mutation and
browser receipts remain in the PRs and archive; the remaining cross-room design
choices and physical-device acceptance are not marked complete.

### Lantern conflict candidate, #362 / #363

Head `9cce9777` validates proposed bulbs, crosses and entire forced wall groups
on copied cells. Six regressions fail before correction and pass afterward.
The local focused suite passes 31 tests, including 1,924 independently checked
legal partial states. Its actual lightup-02 Hint/Undo witness passed in reasoning
run 36169045987 at phone and desktop widths; Android, Picture Logic and Night
checks also pass. Independent review 5836885296 found no major issue. Full Verify
36169045801 was still running at this checkpoint, so the PR remains draft.
See PR #363 and its `docs/LANTERN-CONFLICTS.md` for the branch-local evidence.
It adds no native validator changes, answer lookup, puzzle revisions or save fields.

### Delivery optimization candidate, #365

[Lossless official-content delivery](OFFICIAL-CONTENT-DELIVERY.md) groups record
fields and bounded integer arrays while restoring all five existing JSON globals
synchronously before the app. Decoder bytes remain in the same counted, cached
content script. Nineteen focused identity/delivery tests pass. Replaying the exact
#354 artifact preserves every value and JSON key order while saving 6,913 gzip
bytes. Holding its other bytes constant projects 204,294 initial bytes below the
unchanged 204,800 limit; this is not a fresh integrated 510-puzzle build.

The local clean attempt passes formatting, web/Android preview builds and 552
Node tests. Two fail because the downloaded tool subset lacks @capacitor/core
and uuid; neither failure is waived. Both Quiet Wing suites pass directly. The
broad local workspace is the older ZIP with touched-runtime reconciliation,
not complete current main. Keep #365 draft for exact-head CI and independent
review, including actual browser/offline checks and measured emitted bytes.

### Vault and other active work

Authoring #350 now targets main. Its first refresh used an older unformatted
test blob and failed Prettier before build/tests. Corrected head `f6dc2d25`
restores the exact formatted test from a8280dc5 and corrects that provenance
claim. Fresh integration Verify and review are required; no green old receipt
is relabeled as testing the new head. Retarget child #354 before branch removal.

The 80-board Vault collection #354 remains draft. Integrate reviewed delivery
and authoring changes, recertify production-hint-dependent profiles without
altering definitions, remeasure the full startup payload and exercise all 80
boards through phone/desktop controls. Night-only checks do not cover that matrix.
Planning challenges #357 and Duel/Cabinet #347 belong to separate active work;
this checkpoint does not claim their completion. #281 / #282 still require the
maintainer architecture acceptance.

## Published release and human boundaries

[Release 0.11.6](RELEASE-0.11.6.md) retains the deployed 382-puzzle build record,
origin checks, digests and rollback instructions. No new origin probe, release,
deployment, store submission or physical-device test was performed here. Preserve
Cloudflare and Sites and their separate device-local saves. Android is a preview.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The candidate and earlier proving checks remain in the state archives. Physical
Android touch, TalkBack, comfort review and human acceptance remain open; source
and simulated-browser checks do not turn that candidate into device signoff.

[HUMAN_TODO.md](../HUMAN_TODO.md) q-1 through q-8 remain open, including source
licensing, human difficulty and explanation quality, physical Android and TalkBack.
No save-format, published puzzle identity or resource-budget increase is included.
