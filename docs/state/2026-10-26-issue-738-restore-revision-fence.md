# Restore revision reuse and recovery-file guidance

## Outcome

Addresses issue #738 item 2: replacing the Cabinet with an empty backup no longer forgets the
highest saved run revision. A device-local `run-revision-floor` metadata record survives later
restores, including repeated empty restores. Imported runs and new attempts of removed puzzles
start beyond that floor. Existing runs retain ordinary compare-and-save behavior. The floor and
restored data commit in the same transaction, and a stale tab cannot overwrite restored progress
by presenting a revision that has been reused.

The IndexedDB name and schema version remain `alibi-device`, version 1. Backups never import or
reset the device-local floor. Invalid or exhausted floor values refuse the operation before
mutation. This protects writers running the updated storage code; it does not claim that an old
application runtime enforces metadata it does not know about.

Also addresses issue #744 item 2: when a conflicting backup workshop draft is retained in Recovery
copy, the completion note tells the player to keep the original backup file because the next
restore replaces that recovery copy.

## Evidence

The source started at GitHub main `7a7640ddaf23d4f49f253cda5d9a47a2a2914b7a`, verified against the
provided ZIP and represented by local baseline commit `2ed30b65df7a21f427cdb85a1e595ef939a2c18d`.

Seven new Node regressions failed before the storage fix: stale revision reuse after removal and
reimport, revision reuse by a new attempt, and five damaged/exhausted floor cases. The focused
storage suites then passed 66 tests. The local web build and unchanged budget suite passed before
the recovery-file wording addition. Final combined-source build and CI qualification are recorded
in the maintenance PR.

`tests/browser_backup_import.py` now exercises real IndexedDB transactions in two pages after
actual UI-created Sudoku progress. It removes and reimports a run, checks stale-save refusal and
preserved restored content, then verifies a new attempt also advances beyond the prior revision.
The stale page has BroadcastChannel disabled so the database revision check is responsible for
the refusal. Python compilation passes; local Chromium installation was unavailable. Hosted CI
must qualify this new browser scenario before merge.

## Remaining scope

This change does not address issue #738's other remaining items, change Add missing revision
semantics, or implement broad cross-domain restore ownership. No physical Android, TalkBack, or
human acceptance is claimed. `HUMAN_TODO.md` remains authoritative for those gates.
