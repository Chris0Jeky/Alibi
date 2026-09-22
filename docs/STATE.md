# Live development state

## Source checkpoint, 2026-09-22

This checkpoint includes the phone QA, typography, Castle comparison and test-reliability
integration below. Source inclusion does not establish hosted publication. The official source
catalogue contains 376 puzzles across thirteen families; these changes do not alter published
puzzle IDs, revisions, save schemas or the app version.

| PR | Reviewed source checkpoint | Included scope |
| --- | --- | --- |
| [#227](https://github.com/Chris0Jeky/Alibi/pull/227) | `6c29b46`, merged as `61fffe5` | Board-first phone play, optional context disclosure, Bridges zoom, modal focus ownership, touch targets and readable navigation. |
| [#228](https://github.com/Chris0Jeky/Alibi/pull/228) | `ad10a614`, merged as `b891982` | Desk heading hierarchy and direct phone save-status/metadata sizing. |
| [#237](https://github.com/Chris0Jeky/Alibi/pull/237) | `99aea9b`; later `efa30c9` has the same tree | Escaped record-specific comparison names, linked selection guidance, obsolete direct-SVG rule removal and baseline visibility waits. Original Castle budget retained. |
| [#238](https://github.com/Chris0Jeky/Alibi/pull/238) | `2d148d1240f8fdb6f7df41adf2a25abadc160c7c` | Test-only provider-phase synchronization with cancellation, exactly-one-abort, no-write and no-close assertions. |
| [#243](https://github.com/Chris0Jeky/Alibi/pull/243) | `2adeb03e8da9cd44ab0cd5fd396b24e2d8876e57` | Coherent Bridges geometry samples across rerenders; all four targets, three stable frames, restored sizing, zero moves and no page overflow. |

Merged main `b891982be67bdbc70e4476c67fa372ae202baf58` is included. Earlier merged changes
include Castle comparison #207, unknown-route recovery #233 and Android-aware startup recovery
#236. Inherited object names cannot enter the hash alias table; the Android target does not offer
browser service-worker/cache repair. No new router, save owner or runtime dependency is added.

Concurrent status entry `c88b77d` is preserved in the complete history snapshot below. Its 97 KiB
Castle relaxation is historical: this source retains the original 96 KiB guard. The source heads
above are explicit checkpoints; consult each PR for subsequent commits, checks and merge status.

### Verification and integration

#227 and #228 are merged. Integrate #237, then #238, then #243, followed by the live-state handoff
#239. Before retargeting a child, compare the merged parent tree with its validated base and review
any concurrent changes. Require exact-head CI and independent review; existing head-aging gates
still apply. Never force-push a concurrent worker's changes or infer publication from a source merge.

At Castle checkpoint `27b3502`, Android artifact `10671289183` records the emitted script at
**98,235 bytes against the unchanged 98,304-byte (96 KiB) cap**. Three obsolete `.scene>svg`
rules were removed; existing `.map-stage` and `.room-stage` sizing is unchanged. Wrenmere run
`35672958856` passed chapter, recovery, investigation, exploration, update and practice checks
at simulated 390/1280px. Artifact `10671262724` was hash-verified and phone room/notebook
screenshots inspected. Later `99aea9b` passed full `35674929744`, Android `35674929786` and
Wrenmere `35674929768`. These receipts qualify their named source/integration checkpoints.

Provider test #238 addresses the distinct failure in full run `35671504767`: 100 scheduler turns
can finish before WebCrypto requests the provider stream. Explicit request and late-abort signals
replace that poll. The fixture still performs a real digest after 150 turns, keeps the 1000 ms
operation deadline and preserves cancellation/cleanup assertions. Prior head `0c89d967` passed
full `35673956473`; refreshed head `2d148d1` needs its own complete verification.

Mobile test #243 addresses the post-enlargement read in full run `35673937260`, not merely the
baseline read. Readiness and asserted numeric geometry now come from the same in-page sample.
The nine mobile scenarios and twelve additional sampler boundary checks passed locally against
an isolated built-page/DOM fixture. The original test reproduces its detached-node `NoneType`
failure under deliberate injection. Captured 390px geometry is 340/425/340px for the map and
44/56/44px for all four islands. Three samples are required per phase; the seven-second deadline
and one-pixel restoration tolerance are unchanged. `zoom-metrics.json` is retained by existing CI.

Local HTTP navigation was blocked by `ERR_BLOCKED_BY_ADMINISTRATOR`. The local fixture inlines
hash-verified `843e490` build assets and removes CSP metadata for isolated script execution only;
its catalogue expectation comes from the 376-puzzle build receipt. No production CSP is changed.
Those results do not establish a fresh source build, real IndexedDB, service-worker behavior,
hosted responses or physical-device acceptance. Required Actions still run the real built origin.

## Remaining gates and continuation

[Routing #240](https://github.com/Chris0Jeky/Alibi/pull/240) owns the exact `/privacy`, `/about`
and `/login` leaf-path repair. [#244](https://github.com/Chris0Jeky/Alibi/issues/244) separately
tracks directory forms such as `/privacy/`: relative boot assets resolve below that directory
before hash normalization can run. Static URL analysis is established; cold, controlled, offline
and explicit-fragment browser acceptance remains required. Do not treat a VM hash test or 200
shell response as proof of successful asset loading. Coordinate with the active routing branch.

[Release preparation #241](https://github.com/Chris0Jeky/Alibi/pull/241) is separate from this
checkpoint. Preserve any later release entry when integrating this documentation; do not replace
concurrent publication evidence with the historical snapshot below.

[Telemetry #183](https://github.com/Chris0Jeky/Alibi/pull/183) remains gated on external collector
admission. The earlier 22 September review found `puzzle.failed` absent from Pulseboard's Alibi
registration and [Pulseboard #63](https://github.com/Chris0Jeky/Pulseboard/pull/63) still draft.
Recheck the live collector, register/deploy the contract and prove hosted mixed-batch admission
before reconciling the host. Host-only green checks cannot satisfy that gate. This checkpoint
performs no collector deployment or telemetry POST and does not authorize fabricated acceptance.

Broader type/radius/button work (#219-#221), persistent evidence layout (#51), physical Android
portrait/landscape and installed-PWA safe areas, TalkBack, system-font scaling, native save transfer
and human puzzle calibration remain separate. See [HUMAN_TODO.md](../HUMAN_TODO.md),
[PROJECT-MAP.md](PROJECT-MAP.md), [mobile QA](ux/MOBILE-QA-2026-09-21.md) and
[typography](ux/TYPOGRAPHY-2026-09-21.md).

### Block Cabinet phone action hierarchy candidate, 2026-09-17

This named source checkpoint and its automated receipts remain in the history document below.
Its acceptance boundary remains live: physical Android touch, TalkBack, comfort review and human acceptance stay open.
Neither newer mobile QA integration nor simulated browser viewports replaces those checks.
Preserve this boundary in the live summary, not only in archived history.

## Published 0.11.4, 2026-09-17

The previous recorded publication used source `a79b7eb13e4bd8ba4e61dfd8126c05511e0bad57`, build
`159f34ae5948`. Its hosted evidence, archives and rollback references remain in
[RELEASE-0.11.4.md](RELEASE-0.11.4.md). This source checkpoint does not attest a newer hosted,
Android-device or store publication.

The complete prior state document, including concurrent `c88b77d`, is preserved byte-for-byte in
[STATE-HISTORY-2026-09-22.md](STATE-HISTORY-2026-09-22.md), Git blob
`66604fea62153624911e43ed57f2dab5b35a837b`. Historical candidate labels remain history rather
than current PR status. Keeping the archive in this directory preserves relative release links.
