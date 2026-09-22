# Live development state

## Source checkpoint, 2026-09-22

This checkpoint includes the mobile QA, typography, Castle comparison and platform-test
integration stack below. These are source changes, not a new hosted release. The official source
catalogue contains 376 puzzles across thirteen families; no part of this integration changes
published puzzle IDs, revisions, save schemas or the app version.

| PR | Reconciled source head | Included scope |
| --- | --- | --- |
| [#227](https://github.com/Chris0Jeky/Alibi/pull/227) | `6c29b46eb163e9ba2f9f90de3d47755f9fec5221` | Board-first phone play, optional context disclosure, Bridges zoom, modal focus ownership, real touch targets and readable navigation. Merged as `61fffe5`. |
| [#228](https://github.com/Chris0Jeky/Alibi/pull/228) | `ad10a614573963907f4496442d84ebea4037d885` | Desk heading hierarchy and direct phone save-status/metadata sizing. The nine-scenario browser suite retains the parent's map-and-island restoration wait. |
| [#237](https://github.com/Chris0Jeky/Alibi/pull/237) | `d806aeb4735c7bb5226748a88fae6063c2d2e380` | Distinct escaped comparison names, linked selection guidance and removal of obsolete direct-SVG scene rules. The original Castle budget is retained. |
| [#238](https://github.com/Chris0Jeky/Alibi/pull/238) | `0c89d9678647afa46e121a5b67b2705388d449be` | Test-only provider phase synchronization, preserving cancellation, exactly-one-abort, no-write and no-close assertions. |

The stack includes main `61fffe5568ad62d07ecb270add8b4b67b150667f`, including merged
Castle comparison #207, unknown-route recovery #233, Android-aware startup recovery #236 and
phone QA #227. Inherited object names cannot enter the hash alias table, and the bundled Android
target does not offer browser service-worker/cache repair. No extra router or save owner is added.

The #227 merge also includes concurrent commit `c88b77d`, whose only change is a 20-line live-state
entry. That entry is preserved in the history snapshot below, not dropped during reconciliation.
Every child incorporates it without changing its implementation bytes, and gets new exact-head
checks. The old entry's 97 KiB Castle relaxation is historical; current source retains 96 KiB.

### Evidence and integration order

#227 is merged. Merge #228 before #237, then #238 and the live-state handoff #239. A child may be
retargeted only after checking the merged parent tree against its validated base; a changed
integration tree needs fresh checks. Linked PR conversations hold the exact-head verification
receipts and latest merge status. A previous green run is not approval of a later head, and a
source merge is not deployment.

At #237 implementation checkpoint `27b3502`, Android artifact `10671289183` records the emitted
Castle script at **98,235 bytes against the unchanged 98,304-byte (96 KiB) cap**. The temporary
97 KiB relaxation is not retained. Removing three obsolete `.scene>svg` rules saves 191 bytes;
map and room art continue to use their existing `.map-stage` and `.room-stage` sizing. Wrenmere
run `35672958856` passes chapter, recovery, investigation, exploration, update and practice checks
at simulated 390/1280px widths. Artifact `10671262724` was downloaded and its SHA-256 verified as
`21a4cb0ba41f1f9c9723f0bcefc83134f2a1817e8ea0a3ed9c1e3cf91ecfd353`; phone room/notebook
screenshots were inspected. Full verification remains a separate required gate for each head.

Full run `35671504767` exposed a pre-existing cancellation-test synchronization error: 100
scheduler turns can finish before WebCrypto returns. #238 waits for explicit stream-request
and cleanup signals instead. Its fixture still performs the real SHA-256 digest after 150
turns, deliberately exercising the old failure ordering. It does not increase the 1000 ms
operation deadline or change production behavior. Local phase reproduction is not a full-build
receipt; use the PR's exact-head Actions results for repository acceptance.

## Remaining gates and continuation

[#183](https://github.com/Chris0Jeky/Alibi/pull/183) remains separate from this integration.
Pulseboard's Alibi event registration still omits `puzzle.failed` at the 22 September review;
[Pulseboard #63](https://github.com/Chris0Jeky/Pulseboard/pull/63) remains draft. Register and deploy
the collector contract, prove hosted admission including a mixed failure batch, then reconcile
and revalidate the host PR. Host-only green tests cannot satisfy collector admission. Do not
activate telemetry, deploy a collector, or fabricate hosted acceptance to clear this gate.

The larger type/radius/button work (#219-#221), richer persistent evidence layout (#51),
physical Android portrait/landscape and installed-PWA safe areas, TalkBack, system-font scaling,
native save transfer and human puzzle calibration remain separate. See
[HUMAN_TODO.md](../HUMAN_TODO.md), [PROJECT-MAP.md](PROJECT-MAP.md),
[mobile QA](ux/MOBILE-QA-2026-09-21.md) and [typography](ux/TYPOGRAPHY-2026-09-21.md).

## Published 0.11.4, 2026-09-17

The last recorded publication is source `a79b7eb13e4bd8ba4e61dfd8126c05511e0bad57`, build
`159f34ae5948`. Its hosted evidence, archives and rollback references remain in
[RELEASE-0.11.4.md](RELEASE-0.11.4.md). This source checkpoint does not claim that newer
integration code has reached either public origin, Android devices or a store.

The previous state document, including concurrent `c88b77d`, is preserved byte-for-byte in
[STATE-HISTORY-2026-09-22.md](STATE-HISTORY-2026-09-22.md), Git blob
`66604fea62153624911e43ed57f2dab5b35a837b`. Its historical candidate labels and receipts are
retained as history, not presented as current PR status. Its location in the same directory
preserves relative release-document links.
