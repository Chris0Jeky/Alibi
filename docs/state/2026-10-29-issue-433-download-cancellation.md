# Cancel a pending curated-collection download

This follows the collection-adder CI wiring in #790 and advances #433's interrupted
download acceptance. Closing the dialog previously left its fetch alive: a late
response could still reach the Workshop importer after the player had cancelled or
navigated away.

The dialog now owns an AbortController. Close, Escape, hash navigation and page exit
abort the fetch and reader. A response that arrives despite cancellation is discarded
and its body cancelled. Completed bytes can reach the existing importer only while
the original dialog and file input are still current. Pending duplicate clicks are
refused; an ordinary network or validation failure remains retryable. Closing returns
focus to the opener when it is still in the document. The progress message explains
that closing cancels the download.

Three regressions failed against the previous implementation with "Missing expected
rejection": cancellation before a request, a late response after cancellation, and
cancellation during streaming. All ten adder tests and both workflow-wiring tests
pass after the fix. The browser fixture adds Escape, Close and navigation cases at
320 and 1280 pixels, deliberately resolves an abort-ignoring response late, requires
its body to be cancelled, and checks counts and saved IndexedDB rows are unchanged.
Its existing successful install, retry, duplicate, play/undo/redo and offline-resume
checks remain. Exact-head hosted browser and full CI evidence is required before merge.

The adder remains an explicit, optional module outside startup and precache. It uses
the same bounded validator, duplicate refusal and save owner; no storage schema,
published content identity, dependency or numerical budget changes. This does not
complete #433's durable installed index, cross-tab ownership, all old/future-definition
fixtures or physical memory measurements. `HUMAN_TODO.md` physical Android, TalkBack
and player acceptance remain open.
