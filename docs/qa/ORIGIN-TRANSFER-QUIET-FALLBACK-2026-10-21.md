# Quiet Wing fallback synchronization during origin import

Bounded follow-up to #579 on feature head
`ac6c4dfd08c9cf2071c4f5ec1f17583bbd2b982a`. This change only makes failures while
updating an existing Quiet Wing localStorage fallback visible to the transfer
coordinator. It does not qualify the draft feature for main.

## Behavior

`src/quiet-wing/storage.js` uses
`localStorage['alibi-quiet-wing-v1:fallback']` as the live single-tab Quiet Wing
save when IndexedDB cannot be opened with `SecurityError` or
`NotSupportedError`. Before this change, the origin-transfer writer committed
the Quiet record to IndexedDB, then swallowed failures while reading, updating
or removing an existing localStorage fallback. The coordinator therefore treated
the complete five-section import as committed, removed its recovery copy and
reloaded even though the old Quiet save could later reappear.

The writer now preserves its absent-key behavior: if no fallback key exists, it
does nothing and does not create one. Native localStorage getter, `getItem`, `setItem`, and `removeItem` errors
propagate unchanged. If storage is accessible and `getItem` reports no key, the
writer does nothing and creates no fallback. Since the
Quiet domain is marked attempted before its write, the existing coordinator
rollback path can restore the pre-import Quiet state. A rollback that cannot
complete still rejects with the recovery copy retained.

No retry, new fallback key, schema, storage order, timeout, product messaging
policy, budget ceiling, or other domain writer changed.

## Evidence

The focused production-port regression was red before the source change: both
existing-key `setItem` and `removeItem` failures resolved instead of rejecting;
the absent-key control passed. Getter and `getItem` coverage was added afterward;
the final five-case Node suite passes. These cases call the actual
`createDevicePorts` Quiet writer with a small transaction double to check that
failures occur after the IDB mutation and that an absent key remains a no-op.

`tests/browser_origin_transfer_quiet_fallback.py` adds a real two-tab browser
regression against the production module. It seeds actual Quiet IndexedDB and
localStorage, then checks from a second tab that the complete original Quiet
IndexedDB and fallback values and the pending recovery copy remain. The browser
fixture rejects `setItem` for the imported revision and every `removeItem` call;
rollback can use `setItem` for the original revision. Its no-key control confirms
the import can succeed without creating a fallback. Quiet and recovery use real
IndexedDB; other domain ports are in-memory fixtures. The receipt states
`playerImportAccepted:false`: this is not destructive five-domain player-import
acceptance.

The Python file passes syntax compilation. Playwright is unavailable in this
local environment, so the browser fixture has not been executed locally.
`.github/workflows/origin-transfer-safety.yml` now runs it; exact-head hosted
browser, full Verify and unchanged bundle-budget results remain required.
The prior feature receipt had one gzip byte of application margin; this change
makes no claim about final bundle budget.

## Remaining blockers

The detached Quiet reader issue remains separate: `readQuiet()` can prefer
`G.QWApp.state` after its view is disposed instead of checking the committed
record. The currently unresolved review thread is
`PRRT_kwDOURuAf86qkkn2`. Startup/crash recovery and inspect/export/restore UI,
coordination with normal writers during apply/rollback, per-domain semantic
validation, fresh Castle/Challenge exports, current-main reconciliation, and
complete destructive browser acceptance remain parent #579 gates.

`HUMAN_TODO.md` remains unchanged. Physical Android checks q-2 and Quiet Wing
checks q-4, including TalkBack and affected-device retest, remain open. No phone,
TalkBack, hosted-product, or player-import acceptance is claimed.
