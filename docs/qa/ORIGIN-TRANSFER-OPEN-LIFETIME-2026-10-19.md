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
