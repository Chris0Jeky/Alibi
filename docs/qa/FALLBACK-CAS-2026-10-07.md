# Fallback run compare-and-swap

Refs #554. IndexedDB remains the preferred transactional save owner. Its
schema/version and all puzzle/run identities are unchanged.

A session write now reads its old revision and calls the synchronous memory
write without an intervening await. LocalStorage run writes hold one same-origin
exclusive Web Lock named for the existing storage key across both the revision
read and write. Only a writer observing its expected revision may commit.
Different run keys remain independent. Caller-owned key/payload changes while
waiting cannot change the captured save. Invalid, future or damaged old records
are preserved, including an empty string rather than treating it as absence.

The lock acquisition deadline is eight seconds and uses AbortSignal to remove
an ungranted request. A cancelled request must never later write. Once granted,
the critical section uses synchronous localStorage operations behind the
existing asynchronous facade. Quota/denial errors preserve their original
failure and release the lock. Browsers without Web Locks or AbortController
refuse local run writes, retaining reads/exports; session-only play is separate.

This protects cooperating current-version run writers. It does not turn
localStorage into an IndexedDB transaction, make arbitrary metadata writes
atomic, or coordinate older/noncooperating clients. The existing application
save-error surface remains responsible for warning about unsaved session edits.

## Verification

Seventeen source regression cases: thirteen failed on the old source; all
seventeen pass after the repair. Existing storage/revision/restore/recovery
contracts bring the focused run to 31 passing cases with no skips or failures.
The deterministic mock lock manager proves source interleavings, not browser
coordination. The original 58 storage contract assertions remain present.

A separate browser suite runs 49 native cases across 390px/1280px two-page
contexts, including forty contested writes, independent keys, queued caller
mutation, actual eight-second timeout, unavailable locking and memory fallback.
Reports bind both source SHA-256 values and contain synthetic fixtures only.
Local native navigation is administrator-blocked before any case executes;
there is no local-browser pass claim. The read-only exact-head workflow runs
that native proof and the complete build/unchanged-budget/test gates.

No hosted deployment, physical device, TalkBack or multi-database transfer
acceptance is claimed. HUMAN_TODO.md is unchanged. Keep the draft unmerged until
exact-head CI, independent review and the existing aging gate are satisfied.

## Startup composition

The initial inline candidate measured 135,181 application gzip bytes, over the
unchanged 134,944-byte strict per-application ceiling. Its total initial payload
was 204,141 bytes, still under the unchanged aggregate limit. Rather than raise
a ceiling or disguise eager code as deferred data, the existing storage owner
is composed into the already-required boot script. It defines the same public
facade before the app, with no storage/Core access until invoked. There are
still exactly six initial scripts, and the entire bootstrap is counted once in
both aggregate initial transfer and offline delivery. Standalone delivery also
contains the owner only once. Five emitted-artifact tests enforce those facts,
including a real-Core session save/export/conflict through the compiled owner.
