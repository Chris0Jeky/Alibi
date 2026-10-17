# House return navigation and verification recovery

Refs #573 and #459. A completed old desk render must not erase the captured
return destination after the URL changes but before play/salon routing commits.
The existing controller cleared returnTo whenever its rendered page was not a
game and the current URL no longer activated House. Those two observations can
belong to different moments during an asynchronous navigation.

## Bounded correction

Retain the destination only for the old home render while the URL requests a
play/salon route. Committed non-game routes still clear it, including Classic
desk, Settings, Library and the missing-puzzle fallback. Normal return consumes
the destination and restores the original keyboard opener. No new observer,
router, network operation or save owner is introduced. All puzzle rules and
persisted state remain unchanged.

The exact original controller blob is 9517ea30b6ab6bd14bd9181287faefba07b1d51a,
identical in the supplied 43f573b archive, live main f084aa6 and #459 head55180ff7.
The corrected blob is bd6c9dd911196be881f27478da2c42656ed598d0; its SHA-256 is
f6f7b0cddef2032b3ff4bdcd15e0594bedfc1906fab383e7a98ca150ed0bff50.
This comparison establishes the changed file, not a full current-tree local build.

## Reproduced evidence

Eight new Node tests execute the actual model/controller with a small DOM and
host-scheduling fixture. Before correction: three failures and five passes.
After correction: eight passes. With the existing House and focus tests, all
40 selected tests pass, with zero failures/skips. Tests preserve abandonment,
filtered-finder return, opener focus, normal rerender and disposal behavior.

The browser regression uses real House/puzzle controls and a one-shot scheduler
shim that calls the old home render immediately after the actual navigate command.
It does not inject definitions, runs, saves or completion state. All four local
source-mode cases fail at the missing return link before correction; all four
pass after correction at390/1440px for desk/finder launches. Return, opener focus,
state, undo history and move count are asserted. The phone screenshot was inspected.

The actual source-preview HTML hashes distinguish the executed bytes from the
checkout controller hash reported in a receipt:

- Original preview, 2,592,156 bytes: fb55d9dcd48a8985ecd900cc51580e804167d6fa222eed8d23ef1a385fbfd1b4.
- Corrected preview, 2,592,371 bytes: 6101da90007ead460bf2a93b96d4e183e12b862fba739a047886b21ea99c4993.

The existing preview builder labels its output as source/session-only. These
runs are not actual-origin IndexedDB, hosted release or physical-phone proof.
One local-origin probe failed with ERR_BLOCKED_BY_ADMINISTRATOR; no bypass was
attempted. The read-only exact-head CI lane must run four source and four actual
origin scenarios separately and retain their results, source tree, tested-file
hashes and a source archive. The unchanged broader suites remain acceptance gates.

The paired optional House build grows from47,912 to47,975 bytes and from11,179 to
11,203 script gzip bytes; CSS remains4,405 gzip bytes. Five existing budget/House
output cases pass on the local archive-based build. These are paired local
measurements, not a complete final-head release receipt. No ceiling is raised.

## Disputed full-suite log

The fetched payload for full run37165729669/job111328139875 names a helper
`tests/artifact_helpers.py` and a browser_origin.py line341 update-copy operation.
The exact PR source has no such helper (connector returned404), and line341 of
browser_origin.py is inside seed_database, not an update-copy call. The source
blob is e09bfbaddca2b02923ce28f305efa6e394ee97d9. The fetched job also describes a
multi-job layout that differs from checked-in check.yml blob
56100a768f879cbf12f66739cea088b3d88b262b, which has one verify job.

Do not patch a nonexistent helper or treat that payload as source-consistent
acceptance. This discrepancy is recorded as an evidence boundary, not an accusation
or a claim about its cause. Fresh source-bound CI is required. The independently
reproduced House return bug may explain a missing-return timeout, but is not
claimed to explain every reported Vault, Planning or full-suite failure.

## Continuation

#459 and #572 remain unmerged until renewed whole-workflow results and independent
review qualify their final sources. The original #571 handoff is incorporated in
#459; preserve its histories rather than merging an obsolete STATE over them.
Keep both unmerged #389 items, #433 direct installation, #404 cap/device work and
HUMAN_TODO.md open. No deployment, save migration or new puzzle content is claimed.
