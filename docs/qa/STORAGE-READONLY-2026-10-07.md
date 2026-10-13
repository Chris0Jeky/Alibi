# Cabinet fallback: explicit read-only policy

Refs #554. Based on main `cde5f56cb02dea6471972a1fe85b0724a01e75a5`,
not stacked on #581 or #585. This replaces #585's attempted Web-Lock/localStorage
coherence guarantee; it does not erase its native two-winner counterexample.

## Supported contract

IndexedDB remains the only durable cabinet run writer. In local mode both
`saveRun` and generic `put('runs', ...)` reject with an explicit read-only error.
Readable prior runs, future records, unknown bytes, settings, packs and existing
backup export remain available. No local run is created or overwritten, even
when Web Locks are present. Empty strings are damaged records, not absent ones.
The fallback probe and metadata/pack behavior are otherwise unchanged.

The existing session Store stays ephemeral. Its revision check and synchronous
memory write have no intervening await. Unknown, future, damaged and unsafe
session revisions are refused rather than overwritten. IndexedDB transaction,
version, upgrade/blocked handling, restore and all puzzle identities are unchanged.

The application keeps its existing save-error/export flow. A refused first
save leaves the edited in-memory board available for Export backup, shows
Not saved and the read-only message, and blocks subsequent board changes.
Reload reads the previous durable record. This slice does not add a session
overlay, a second save owner, or change the initial saved-status presentation
before an attempted write. That initial presentation remains a UX follow-up,
not a claim that local writes are accepted.

## Local evidence and boundaries

The supplied archive is `a853990`; GitHub's comparison to the main above shows
15 changed files, none of storage.js, core.js, app.js or the existing storage
contracts. Focused checks therefore exercise the exact relevant main source,
not a claim that the entire archive equals current main. The checkout's Git
anchor is explicitly synthetic.

New suite on old storage: 17 failures, one passing IndexedDB-precedence control.
After repair: 18 passes. The complete focused selection, including old revision,
restore, recovery and update contracts, passes 35 cases with zero skips/failures.
The legacy suite still reports 58 assertions; only formerly successful local-run
write expectations change to explicit refusal against directly seeded old data.
The equivalent successful-session, metadata, pack, raw-preservation, restore and
backup assertions remain. Browser wiring adds two passing checks.

Local npm dependency installation is unavailable; offline installation lacks
youch-core and online installation did not complete. npm test correctly refuses
missing fresh web/Android artifacts. No full local build or byte-budget pass is
claimed. Local Chromium 144 navigation returns ERR_BLOCKED_BY_ADMINISTRATOR
before any native scenario executes; it is not bypassed or counted as acceptance.

The dedicated read-only workflow binds commit/tree/source hashes, preserves the
source archive, requires pinned formatting, both builds and all Node/Quiet Wing
checks, and exercises 52 native scenarios. Those include forty two-page local
refusals, no-lock mode, unknown bytes/export, direct-put refusal, ephemeral session
CAS, twenty IndexedDB contested controls, and two actual emitted-app edit/error/
export/reload scenarios at 390px and 1280px. Source-only mode is labelled narrower
and is never substituted for the default emitted-app requirement. A source change
requires fresh results. No numerical budget is raised.

## Gates

Keep draft until exact-head native/browser, full CI, independent review and the
existing aging gate pass. #585 remains historical negative evidence; close or
supersede it only after the replacement is accepted. This change does not qualify
#579/#593's multi-domain transfer, read access when the existing probe itself is
denied, physical Android/TalkBack, or deployment. HUMAN_TODO.md remains authoritative.

## First exact-head receipt and bounded follow-up

Run 37690219555 at 69bad00 collected a source-bound archive, verified unchanged
inputs and built both targets. Its 35 focused contracts pass. The full Node
selection passed 1,329 of 1,331 cases; the two failures were the application
budget and the moved historical phone-action note, not a weakened save test.
Pinned formatting requested two line wraps; its exact proposals are adopted.

Application gzip measured 135,037 versus the strict unchanged 134,944 ceiling.
Net shell measured 1,411,931, also above its unchanged limit. Keep the save owner
in the existing bootstrap and compile that complete bootstrap with pinned
esbuild. Remove it from application composition, without adding a startup
request or pretending its eager bytes are deferred. The complete bootstrap
remains in aggregate initial and offline accounting. Six emitted assertions
check single ownership, no premature persistence/Core access, real-Core session
CAS/export, generic local refusal, full byte accounting and standalone delivery.
Routing and recovery controls retain the compiled-boot equivalence suite.
Two source-composition regressions fail before this adjustment and pass after.

The historical phone-action heading and explicit open human gates are restored
inline as well as retained in the byte-identical archive. No test expectation
is weakened. The native run completed all 25 source scenarios at 390px and
reached the emitted-app refusal/unsaved-state/raw-preservation checks. It then
failed because Undo matched both desktop and phone buttons. Scope that click
to the primary #main control; do not remove the blocked-edit assertion.
Native acceptance still requires the full 52 cases at both widths on the new
head. Local source/legacy/state/composition checks now pass 39/39. No new full
build, byte or native pass is claimed before the replacement CI receipt.

The first artifact ZIP digest is
9692574d8ac2b10c524a39d525ab5609a8488542ed6b5a90b455f1fdffa021dc.
All six captured input hashes match its archive and source-head identity.
