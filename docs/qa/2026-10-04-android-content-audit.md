# Android content identity audit correction

Refs #459, #389 item 3, review discussions 4175460083 and 4175460086.
This supersedes the earlier recovery claim that adding the runtime aggregate
alone completed the identity integration. The old verifier still expected the
initial-only value in both places, so correctly emitted Android builds failed.

The verifier now computes two distinct expectations from actual emitted sources.
The legacy artifact receipt retains SHA-256 of the initial file bytes. Runtime
identity retains the versioned, role-framed full initial/deferred aggregate from
#459. Both roles must exist exactly once. The actual Android sources and their
relative filenames must match the current web build as well. Declared identities
and internally consistent inventory hashes are not substitutes for that binding.

Seven regressions use the actual Android derivation and artifact inspector, not
mocked receipts: both browser/native preview flavors; initial-only runtime
identity; aggregate substituted into the legacy receipt; changed deferred bytes
with recomputed hashes and aggregate; changed bytes with the old aggregate claim;
missing/duplicate deferred assets; and identical bytes renamed away from the
initial loader's URL. Scratch copies preserve the shared built output. These
checks prove output/audit contracts, not installation or physical Android behavior.

The original seven-case run produced six failures and one pass against verifier
blob 48e5dfae0a65de834a2676bd17f077e98e207800. All seven pass after correction;
the already-rejected foreign aggregate also gains an explicit source mismatch
assertion. With existing Android build, platform build, identity writer, dirty-path
and budget tests, 38 tests pass with zero skips/failures. The command-line Android
audit and formatting pass too. Published checker and regression blobs are
0c487332df49fc1f5979293d76eedd5800e8b39c and
549a6f1f82cc76c7ba21b8fca11e10560f0bc73b respectively.

Local evidence uses the supplied 43f573b archive with #459's exact identity helper
and build call reconstructed. The checker, Android derivation and existing test
sources are unchanged between that archive and #459's head. The complete current
Workshop source was not locally reconstructed, so these are targeted local
integration results, not a full current-head build or release qualification.

The exact-head hosted lane now explicitly invokes npm run check:android and both
existing android-build/platform-build suites, alongside the new regressions,
original content-manifest assertions, writer/dirty-path checks and unchanged
budgets. Source-head and emitted identities are saved before auditing so a failed
audit still leaves useful evidence. Contents permission stays read-only, actions
remain pinned, and the workflow neither modifies nor pushes repository sources.

Require renewed full current-head CI, emitted-output inspection and independent
review before merging. #570 has merged; #572 separately owns practice familiarity.
The source review and history handoff remain in #571. No new puzzle definitions,
startup code, save schema, numeric ceiling, origin, dependency or deployment is
changed by this correction. HUMAN_TODO.md physical/device acceptance remains open.
