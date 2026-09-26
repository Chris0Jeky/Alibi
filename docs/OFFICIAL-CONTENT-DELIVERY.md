# Lossless official-content delivery

25 September 2026. Refs #345 / #354 and #161. This build-only representation
change is independent of the proposed Vault boards; no source puzzle, editorial
record, ID, revision, clue, solution, save format or import limit is changed.

## Architecture and compatibility

The build serializes the same five JSON globals: releases, catalogue, casebooks,
curation and theatre. A small synchronous decoder lives inside the existing hashed
official-content script, before application startup. It is counted in that script's
actual emitted gzip size. The existing core-shell cache includes the same content
asset role; the single-file edition includes the same decoder. There is no new
request, async loader, dependency, cache namespace, permission or runtime generator.

Containers have explicit tags, so no ordinary string, property name or input array
can collide with a compression marker. Consecutive records with identical ordered
keys are grouped by columns; small integer arrays use a bounded ASCII encoding.
An explicit record count preserves repeated empty objects. All other JSON values
retain their representation. Object.fromEntries reconstructs prototype-like keys
as own data properties. JSON normalization happens once, as in the preceding build;
cycles and BigInt fail at build time. This is release-owned output, not a new
untrusted-import format or a substitute for pack validation.

Every decoded value and object-key order must match the original JSON serialization.
Only wire bytes, generated content filenames and derived build identities change.
Application/data transfer, offline, Android and content limits remain unchanged.
Theatre's test now executes only the generated official-data script in an isolated
VM instead of parsing a literal assignment. Its startup order, exact byte counting,
media existence, offline exclusion and single-file assertions are preserved.

## Source verification

Nine new tests cover JSON values/order, empty and heterogeneous record runs, numeric
bounds, non-finite numbers and holes, prototype-like keys, quoted script-like text,
invalid global names, cyclic/BigInt rejection, 150 deterministic nested examples,
compression including the decoder, exact built-catalogue equality and deep lists.
The initial helper tests failed before the helper existed. A separate 32-level
nested-list regression exposed repeated traversal in the first implementation:
it timed out before correction and passes when already-encoded children are reused.
No timing limit or correctness assertion was relaxed to hide that failure.

All 19 focused serialization, budget, platform identity, Block Motion delivery and
theatre tests pass. A clean full local attempt passes formatting and web/Android
preview builds: 552 Node tests pass and two fail because the public tool subset
lacks @capacitor/core and uuid. Both Quiet Wing suites pass when run directly.
An earlier dirty-worktree Android refusal was corrected by excluding the local
node_modules symlink; no repository ignore or Android cleanliness rule was changed.

The broad workspace remains the older 382-puzzle ZIP plus verified runtime source,
not a complete current-main checkout. Its clean build is f632e611d558, with 54,196
content gzip bytes and 192,094 initial code/content gzip bytes. Do not present
those counts as a final 430- or 510-puzzle build. Existing builder/test inputs were
verified against main f1cd4cf2: build.cjs blob 8a29cc05 and theatre test 518f4e87.
All four published source/test blobs match the locally verified files exactly.

## Vault artifact replay, not integrated acceptance

Artifact 10872284099 belongs to #354 head ce46e858 / Verify 36153813556. Its
synthetic merge build has 510 puzzles and 211,207 initial gzip bytes, exceeding
the unchanged 204,800-byte limit by 6,407. Re-encoding its complete five globals
with this final emitter reduces its official script from 73,330 to 66,417 gzip
bytes, including the decoder: 6,913 saved. Executing the new script in an isolated
VM reproduces every original global and JSON key order exactly.

Holding the artifact's other components constant gives 204,294 initial bytes,
506 below the limit. This is a projection from an exact content replay, NOT a
fresh integrated Vault build. Current-main app/platform bytes, build identifiers,
and subsequent changes can affect the final total. Simple numeric packing and
string pooling were rejected because they did not clear the original overage.

## Continuation and merge gate

Keep the delivery PR draft pending complete exact-head Verify, Android and affected
browser/offline tests plus independent review. Recheck all emitted component sizes
without changing compression settings or caps. #354 remains independently draft:
merge/reconcile its authoring parent, recertify profiles after production hint
changes, and run every new Vault board through phone/desktop controls. A green
Night-only control run does not establish that 80-board matrix.

The current-source Night collection is 430 puzzles after #344. This optimization
adds no content and performs no deployment. #161 and HUMAN_TODO q-8 retain human
difficulty and explanation acceptance; physical Android and TalkBack stay separate.
