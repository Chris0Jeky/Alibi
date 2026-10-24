# Challenge replay in the transfer export (PR 579)

Branch: `fix/579-challenge-export`, stacked on `grok/al1-save-transfer`.

## Changed

**Challenges (P2, `readChallenges` in `src/origin-transfer.js`).** The reader enumerated the committed
`alibi-challenges-v1` database directly. In the Challenge UI `onSave` calls `challengeStore.write(run).catch(toast)`.
A quota, transaction or revision-guard failure leaves the newest replay only in the mounted handle. Opening
Settings runs `AlibiActivities.leave()`, whose `disposeActive()` swallows the failed `flush()` and disposes the
handle. `origin-export` then read the older committed run (or none), built a valid checksum and reported
"Save transfer downloaded" as if all five domains were captured.

Fix: `AlibiChallengeStore` now remembers which replays have not committed. `write` adds the id as its queued step
starts and deletes it once the record commits, so any rejection (including protected mode) leaves it set; an
explicit `restore` is not tracked, because a refused restore keeps the committed run mounted. `readChallenges`
flushes the store reachable through `G.QWApp.challengeStore` (the same route `activities.js` uses; `G.QWApp`
outlives dispose) and throws "A challenge replay did not save. If it is still open, export it; otherwise reload (its newest moves are lost)."
while any id is unsaved. Import goes through the same reader to take its recovery snapshot, so it also refuses
rather than overwrite an unsaved replay.

Chosen over embedding a retained snapshot: the store keeps no replay copy, and a snapshot needs a revision for
its row plus a rule for a second tab's newer commit. `read()` still returns the committed run so a conflict
(another tab wrote) does not trap the player on a stale replay. No save format changed.

Known limit: after the handle is disposed the failed replay is gone, so the Export challenge button can no longer
supply it. Reopening the challenge shows the committed run; any successful move writes and clears the flag,
and a reload clears it. The refusal still prevents the silent claim. Session mode (IndexedDB unavailable) keeps
runs in memory only and is not covered here; `activities.js` `flush()` already refuses updates in that mode.

## Evidence

- `tests/origin-transfer-challenge-unsaved.test.cjs`: real `AlibiChallengeStore` over a fake IndexedDB whose
  readwrite transactions abort. A refused restore leaves the export working; a rejected `write` followed by the
  swallowed flush makes the export reject; a later read does not clear it; a committed write restores a normal
  export with the newest run. Red before the fix (export succeeded with the older run), green after.
- Not a real mount: the dispose step is simulated by swallowing `flush()`; the Python browser suites were not run.

## Budgets (2026-10-24)

Clean committed build: 138,620 application gzip (+51 over 138,569), 207,960 initial code plus data gzip (+49) and
1,423,210 shell bytes (+83). Ceilings raised +32, +32 and +96 respectively (about 3, 5 and 30 left). Not feature
room.
