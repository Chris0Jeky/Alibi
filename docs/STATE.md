# Live development state

## 2026-10-11: offline navigation recovery candidate (#581)

This unmerged candidate preserves online host responses and uses the current
release's cached styled 404 only after a rejected navigation fetch. Actual HTTPS
candidate193660ee/webb29349567707 passed11 byte/status checks and55 shared-path
browser checks; sampled primary responses matched the pre-upload baseline.
Its unknown-path browser scenario found the host's canonical `/404` treated as
a shell route after `/404.html` redirects. Three source regressions reproduce
that defect; excluding only canonical404 from the shell matcher makes35 source
worker cases pass. Normal shell paths, aliases, assets, API exclusions and unknown
save protection remain intact. Fixed emitted/native/HTTPS and current-head hosted
qualification remain required. The first candidate version is not production.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.

## 2026-10-11: Lantern Duel credential host binding (#605)

Room seats and pending idempotent retries capture the full normalized API address.
Polls and moves refuse before fetch after API settings change, including a Club
restore or a failed create/join at another address. Room response fields cannot
replace the captured address or credential; saved session seats retain that binding.
Existing same-host polling, moves and lost-reply retries remain supported.
Four behavioral regressions reproduce the original credential exposure. Focused
Club source checks pass; emitted builds, real-origin restore controls and fresh
independent review are pending. Network tests use synthetic intercepted hosts.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.
## 2026-10-11: quarantined Cabinet revision guard (#599)

The IndexedDB save transaction now distinguishes an absent row from a present
unknown envelope before accepting revision CAS. Future schemas, missing/unsafe
revisions, mismatched envelope/value keys and rows rejected by the application's
full run validator refuse without replacing recovery bytes. Validation occurs on
the row read inside the CAS transaction. Known revision-zero backup runs remain writable, preserving the existing
nonnegative revision format. No puzzle IDs, database version or byte limits change.
The original guard failed six focused cases; the corrected storage/revision/
restore/recovery selection passes 44 cases plus 58 legacy storage assertions.
Three malformed-content regressions fail before the review fix and pass after it.
Actual-origin autosave/reload regressions cover future and malformed known-schema
rows; browser, emitted-build, hosted exact-head and fix review gates remain pending.
[HUMAN_TODO.md](../HUMAN_TODO.md) retains physical Android/TalkBack acceptance.

## 2026-10-07: older backlog wave

Eight Grok 4.7 high worker tasks and two GPT 6.1 Sol medium coordinators produced
fix PRs #587 (mobile QA readiness/diagnostics), #588 (Desk heading scale),
#589 (restore fixture abort errors), #590 (accessible touch keyboard help), and #591 (practice counts and complete content identity).
The #389 Android identity mismatch found in review was red-proved and corrected;
the final Android build, artifact check and budget pass. Muse refused both lane starts
because the registry assigns this repository to another host; no swarm ran.

PR #588 merged as ea47351a after seven exact-head CI passes and independent review. Other fixes retain their pending or parked gates.

Focused Node and Chromium proof is recorded in
[WAVE.md](qa/2026-10-07-backlog/WAVE.md). Local full UI failures remain recorded; #590 also exceeds
the unchanged CSS gzip ceiling by five bytes and has an unwired browser helper.
Its four CI failures were investigated; both defects remain explicit park conditions.
CI/review, combined budget and
merge gates remain explicit. #347's implementation is present with specific
coverage gaps; #401 requires its upstream SDK hook; #407 and #220 retain owner
decisions. No deployment or physical-device approval was inferred.
[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative.
## 2026-10-11: Club backup guard regressions

Four source tests cover a minimal accepted Club save, an Archive no-op replay,
an otherwise replayable 3001-move history, and 121 records below the byte cap.
They use the real validator and engines. Each archive/history/record guard removal
makes its corresponding test fail; the unchanged validator passes all four.
No production code or save format changes. Independent review and hosted exact-head
verification remain pending. [HUMAN_TODO.md](../HUMAN_TODO.md) retains device acceptance.

## 7 October 2026: cabinet fallback safety candidate

Base main: `cde5f56cb02dea6471972a1fe85b0724a01e75a5`.
This branch is an unmerged candidate, not a published release or deployment.
The prior state is preserved byte-for-byte in
[STATE-BEFORE-STORAGE-READONLY-2026-10-07.md](STATE-BEFORE-STORAGE-READONLY-2026-10-07.md)
using its existing Git blob `c52c61ed95817ef9f343530271515efdeeafb3e0`.
Its historical release evidence and older lane notes remain available there.

Refs #554. The candidate takes the issue's explicit fail-closed option:
localStorage cabinet run writes are read-only, even with Web Locks. Reads,
export, old/future records and the existing error surface remain. Session CAS
compares and writes without an intervening await; IndexedDB remains unchanged.
The application retains its existing first-save-error behavior, rather than
adding an implicit session overlay or a new durable save owner.

The new source suite reproduces 17 failures and one passing control on the old
storage, then passes all 18 after repair. The 35-case storage/revision/restore/
recovery/update selection passes, retaining 58 legacy assertions with explicit
local-write expectation changes. Browser wiring adds two passing cases.
Local dependencies and native navigation remain unavailable; no local full
build or browser pass is claimed. Exact-head CI, all unchanged byte ceilings,
52 native/emitted-app scenarios, independent review and aging are merge gates.
The first CI receipt and bootstrap-size repair are recorded in the QA note;
the storage owner remains eager and fully counted in the existing bootstrap.
Details: [storage policy and evidence](qa/STORAGE-READONLY-2026-10-07.md).

## Related work, not implicitly qualified

- #585 has a retained native two-success counterexample. A later diagnostic-only
  green run did not change the storage implementation and is not a repair.
  This candidate is based directly on main, not on #585 or its parent #581.
- #581's offline navigation has separate current-base, browser and review gates.
- #593's bounded attempted-domain rollback repair does not qualify #579's
  multi-domain save transfer. Same-domain concurrency, semantic validation and
  inherited parent budget increases remain separate blockers.
- Main already includes #587's mobile QA startup/diagnostics and #589's fixture
  AbortError ordering changes. Their merges are source landings, not a new
  deployment or physical-device acceptance claim.

## Preserved human and release boundaries

[HUMAN_TODO.md](../HUMAN_TODO.md) remains authoritative for physical Android,
TalkBack, publishing, origin and other owner gates. No database version,
published puzzle identity, numerical budget or production deployment is changed.
Use the exact current PR head and its artifacts rather than historic counts
when qualifying a merge. Do not discard the previous state or failed receipts.

### Block Cabinet phone action hierarchy candidate, 2026-09-17

The historical candidate and proving checks remain in the linked gameplay-base archive;
physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither newer source proofs nor browser screenshots turn that candidate into a device signoff.

## 2026-10-11: active Cabinet broadcast revision candidate (#601)

This checkout owns only `src/app.js`, `tests/app-broadcast-revision.test.cjs` and
this note. The BroadcastChannel `saved` handler now rechecks the returned run's
key against the active puzzle after the asynchronous read completes: the active
records entry and its expected revision are never replaced from the
notification, a newer stored revision surfaces the existing another-tab
conflict, and equal/older rows return without touching local state. The early
higher-notification short-circuit and non-active refresh behavior are intact.
Regression coverage executes the actual handler and enqueueSave code in a VM
fixture. Evidence pending: the caller owns the proving check
(`node --test --test-concurrency=2 tests/app-broadcast-revision.test.cjs`),
formatting, catalogue hashes, builds and native-origin proof after integration.
