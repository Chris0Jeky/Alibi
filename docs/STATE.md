# Live development state

## Maintenance checkpoint: 25 September 2026

This source checkpoint integrates main `93cc5fa99c15814c4cbfccac5b5515b5c2ab2660`.
Live GitHub takes precedence for later PR status. The preceding STATE is preserved
byte-for-byte in [the maintenance-base archive](STATE-ARCHIVE-2026-09-25-MAINTENANCE-BASE.md),
including release, rollback, hosted-origin, source, browser and Android evidence.
Historical pending-merge statements in that archive are not current blockers.

### Sun & Moon reasoning candidate, #327 / #329

The helper rejects contradictory moves and compares at most two unknown squares
without consulting the answer. Its explanations now include every distinct rule
rejecting the alternative assignments. Sharing the existing A1 coordinate formatter
across core, Assist, Bridges, Insights and three player labels preserves visible text
and brings the measured application from 130,336 to 130,294 gzip bytes, below the
unchanged 130,304-byte ceiling. The asset catalogue refresh changes only the affected
app-file fingerprints. See [the reasoning record](BINARY-REASONING.md).

On the byte-identical pre-integration tree `33473c07`, 38 focused tests passed,
including 749 coordinate cases. The fresh full local attempt passed formatting,
web/Android preview builds and 553 Node tests; two tests failed because the downloaded
public tool subset lacks `@capacitor/core` and `uuid`. These failures are not waived.
The complete dependency installation, integrated Night catalogue and actual controls
require exact-head CI. Local Chromium could launch but local-origin navigation was
blocked administratively. No new local browser or physical-device pass is claimed.

The temporary fixed-input blob publication job is absent from the final source diff;
normal read-only verification is restored. Keep #329 draft pending exact-head Verify,
reasoning controls, Picture Logic, Android and a new independent review. Its ten-byte
local margin is narrow: the integrated emitted bundle must satisfy the same gate.

### Radius mapping merged, #220 / #355

PR #355 merged as `93cc5fa9` after exact-head Verify, Android and Night controls
passed, independent review and the head-age gate. The 56 approved scalar mappings
consume existing 8px, 12px and 16px tokens. Remaining large panels, board geometry,
circles and decorative exceptions are not silently collapsed into those tokens.
The previously measured phone/desktop sizing and browser receipts remain in the archive.

Separate tests-only follow-up #356 targets main and preserves six board/decorative
exclusions and three asymmetric shapes. Review found that commented-out asymmetric
CSS could satisfy the first guard. Head `5cd182cb` fixes shared comment stripping;
three reproduced mutation witnesses now fail correctly and six focused radius/type
checks pass. Final CI and independent re-review remain required. The earlier ten
mutation probes and exact source/blob receipts are retained in the PR.

### Other integrated and open work

Merged #342 adds 18 Night Gardens boards, bringing this source checkpoint to 400
puzzles across 24 packs. Exact-head Verify and five dedicated workflows passed at
`a6e4eecb` before its merge as `da4fd3ad`. The later radius integration also passes
Night controls. Expert/Master labels remain provisional. Night Routes #343 and Night
Symbols #344 remain a moving stack; inspect their current heads and CI before merging.

Shared typography #353, Desk action sizing #351, backup QA #349 and Block Cabinet
visual stability #352 are merged. Their exact-head checks and measured source/browser
results remain in the archive; these do not certify the affected physical phone.
The remaining cross-room typography, button and radius choices stay open.

Vault authoring #350 has green exact-head source/authoring CI and an independent
implementation review, and is ready for integration review. Its Night parent must
still be reconciled. Vault content #354 retains its startup-budget and real-control
blockers. New production hint procedures require recertifying profile receipts;
an unchanged method label does not prove an unchanged algorithm. Archive #346,
Duel/Cabinet #347 and Borough #348 are separate work, not completed by this pass.

## Published release record and unchanged boundaries

[Release 0.11.6](RELEASE-0.11.6.md) records the deployed 382-puzzle build `db7e68c1bfa6`
and tag `v0.11.6`, following the Cabinet restore race fix #335 / #333. The exact
Cloudflare/Sites publication, digest, browser and rollback receipts are retained in
that record and the maintenance-base archive. No new hosted-origin probe, deployment,
release, store submission or rollback is claimed by this maintenance checkpoint.
Preserve both existing origins and their separate device-local saves. Android remains
a preview; source, simulated browser, hosted-origin and physical evidence are distinct.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The historical candidate and proving checks remain in the linked state archives;
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither source proofs nor browser screenshots turn that candidate into a device signoff.

[HUMAN_TODO.md](../HUMAN_TODO.md) q-1 through q-8 remain open, including source
licensing, physical Android, TalkBack, provisional difficulty, recognizability and
explanation quality. #281 / #282 still require the maintainer architecture skim;
source tests do not approve that ADR. Review live PRs before overlapping another lane.
