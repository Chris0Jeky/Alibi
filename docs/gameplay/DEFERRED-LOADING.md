# Deferred puzzle loading

Refs #389 item 2. Stacked on the replay-cache slice #566; merge that parent first.

## Player behavior and ownership

After flushing the previous run and leaving its activity, the play route clears
the old board and renders an explicit Opening puzzle status with a native Back
to puzzles link. It creates no run until the actual definition is available.
Existing route serials reject late success and failure after navigation, including
A/B/A returns. A same-revision saved run carries its own definition even when the
route omits @revision; resuming it does not wait for a catalogue download. Explicit
older pinned revisions remain supported. The pre-existing idle loader still exists.

## Bounded loader

Concurrent consumers share a request. Each attempt has a ten-second deadline.
Success, network failure, invalid delivery, setup failure and timeout clear the
timer and handlers and release the attempt for retry. A captured old callback
cannot clear a newer pending attempt. Promise assignment precedes DOM insertion
so a synchronous insertion failure cannot permanently pin a rejected promise.
The existing deferred content validator still performs its complete atomic swap;
load events are not accepted unless that validator marked the definitions ready.
Removing a script is not a claim that its underlying network transfer is cancelled.

## Verification

Initial loader tests reproduced four failures and two passes; initial route tests
reproduced two failures and two passes. The expanded thirteen new cases cover
stall, success, retry, invalid delivery, synchronous setup, stale callbacks,
navigation, old-board removal and saved revisions. Eight existing emitted-content
cases remain, including invalid-chunk atomicity and no-run-from-listing checks.
Their timer fixture now distinguishes idle scheduling from the real deadline.

The dedicated browser lane holds the actual compiled definition response while
using real controls and IndexedDB at 390/1280 pixels. It requires eight complete
loading, navigation, retry and pinned-resume scenarios. Service workers are blocked
only there to avoid cached responses masking the controlled network. Existing
full-origin and Vault suites retain service-worker/offline acceptance ownership.
No physical-device or screen-reader acceptance follows from these fixtures.

## Delivery and remaining scope

A redundant play wrapper and repeated current-reset statements are removed; the
same route allowlist is encoded compactly. The combined cache/deferred source
build fits all unchanged numerical byte limits. Catalogue source receipts are
regenerated for the changed app bytes, without replacing other artwork records.
Final clean-head CI, actual-browser evidence and independent review remain gates.
No published puzzle, save schema, database version or worker-validation contract
changes. #389 item 1 practice counts and item 3 full content identity/#459 remain
separate. No deployment, new installer or physical Android/TalkBack claim.
