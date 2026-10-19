# Transfer database open lifetime

Bounded follow-up to review 5490308996 on #593, based on exact head
`a6e9795d54c2ea0c17b8932ec80401af452f4c6b` and source blob
`6e760c986cb5203883af0d68b5d44603f7d2370e`. This child targets the unmerged #579
feature branch. Integrating the focused repair there does not qualify the
whole-device transfer feature for main.

## Repair

`openDb()` rejects its promise when IndexedDB reports `blocked`, but that event
does not cancel the open request. It now marks the request abandoned first.
Any later success closes its database handle instead of passing it to write
work. A later upgrade aborts its transaction without calling the store-creation
callback. The request is initialized directly: the Promise executor already
converts a synchronous open exception into rejection. Ordinary open success,
synchronous failure and request errors retain their previous behavior. The
attempted-prefix rollback repair is unchanged.

## Executed evidence

The new Node regression invokes the actual module through
`createDevicePorts().retain()`. On the original source, two cases failed: late
success had zero closes and late upgrade had zero aborts. After the repair, all
24 transfer tests pass: four new open-lifetime groups and the prior 20 transfer
and attempted-prefix groups. The new tests require exactly one late close, no
transaction or write after rejection, no abandoned upgrade callback, healthy
upgrade/write/close behavior, and unchanged ordinary/synchronous errors.

`tests/browser_origin_transfer_open.py` runs the source module unchanged in two
tabs sharing a disposable loopback origin. Current production callers request
database version 1; an existing version-1 database cannot naturally block that
same-version open. A documented test-only IndexedDB facade therefore maps the
requested version 1 to actual version 2 to exercise a real blocked upgrade.
This seam changes only the request version, not the module's event handlers.

Chromium 140.0.7339.16 observed `blocked -> upgradeneeded -> error` after the
blocker closed. The promise had already rejected, the old version and sentinel
store remained intact, no recovery store was created, and a following database
deletion completed without an orphan connection blocking it. The exact-head
baseline instead reached `blocked -> upgradeneeded -> success`, failing the
fixture. The deterministic Node test separately covers late-success close-once;
the corrected real upgrade aborts before success.

## Limits and parent gates

No app build, whole-project verification, hosted transfer, player import,
crash/restart recovery or physical-device acceptance was run for this subset.
The standalone source gzip grows from 4,203 to 4,225 bytes; that is not an
application-bundle measurement. The old child receipt had little budget room,
so fresh full verification must assess delivery against unchanged thresholds.
No threshold is raised by this fix.

The parent still needs owner admission/CAS for attempted domains, full semantic
validation and protected recovery namespaces, durable pending-recovery admission
and startup recovery, truthful post-commit cleanup, and the reported export and
fallback consistency repairs. The checks here do not close those findings or
the physical-device gates in `HUMAN_TODO.md`.

## Net-shell budget continuation

At published `f4208df82dcda6c6d5490d0e10b8893432fe0c9c`, safety run 39273622459
passed the 24 transfer contracts and the standalone Chromium 151.0.7922.34
fixture, but full verification failed the unchanged net-shell budget. Both that
run and primary run 39273622643 measured 1,904,261 core-offline bytes minus
481,078 official-content bytes: 1,423,183 bytes. The strict ceiling is
1,423,144.32, so at least 39 emitted bytes must be removed. The primary run
built GitHub's merge commit `0f829a4b1afe0472473c0f16014eb948144d648b`; its shell
measurement is identical, while application gzip differs by one byte. Both
application-gzip and initial-transfer gates already passed.

The bounded continuation calls the private `openDb()` with its supplied version
directly; all four callers already supply version 1. It also lets the `txDone()`
Promise executor reject a synchronous transaction exception directly. Neither
change alters the abandoned-request guards or attempted-prefix rollback. A new
public-port characterization requires the original transaction error, one close
and no writes; it passes before and after the simplification. All 25 transfer
tests and the local Chromium 140 two-tab fixture pass after the change.

With the pinned esbuild 0.28.2 options (`minify: true`, `target: 'es2022'`), the
isolated transfer module decreases from 8,958 to 8,905 emitted bytes, saving 53.
Its emitted gzip decreases from 3,120 to 3,104 bytes. Applying that isolated raw
delta to the observed shell predicts 1,423,130 bytes, with 14.32 bytes below the
strict ceiling. This is not a complete application rebuild or a new budget pass;
fresh exact-head CI must confirm all dimensions. No threshold, other runtime
module or parent safety gate changes.
