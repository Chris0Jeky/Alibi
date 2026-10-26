# Issue 752: refuse incomplete Challenge transfer snapshots

Child maintenance slice for draft #579 (`grok/al1-save-transfer`), against parent
`9e99df4d51bb29de59233348e576273f82c8ae5f`. This is not a main-branch import qualification.

## Change

After flushing the retained Challenge owner, `readChallenges()` refuses a session-only or
protected store before enumerating committed IndexedDB records. A successful session write
clears the owner's unsaved counter but does not create a durable row; it must still refuse the
whole-device success claim. The existing failed-write check remains. Healthy empty IndexedDB
stores and an unmounted, absent Challenge database still return the empty section normally.
The same preflight protects import's recovery read, before retention or domain writes.

The bounded #746 item 2 test follow-up makes Castle fail only on the forward write, allowing
rollback verification to run. It uses a cabinet fixture with a valid `runs` array and requires
the clean rollback result plus exact restoration of the divergent Quiet fallback bytes. It
does not change the Quiet runtime or close the other #746 items.

No dependency, save schema, published ID, application version or numerical budget changed.

## Additional ambiguity refusals

Source characterization found that the parent accepted duplicate Challenge IDs (the writer
would collapse them onto one database key) and Castle notebook/envelope content that differed
despite equal state revisions (the writer would prefer the envelope). Both are now refused by
the shared export/import shape preflight before any port read, retention or write.

Challenge IDs must be unique under the existing exact string comparison. Castle notebook
state must match the envelope's state recursively: object key order is ignored, array order
and types and lengths matter, and missing keys are not dropped. The envelope's CAS revision remains a
separate counter. Existing null/absent records, empty sections and state-only sections remain
supported; this does not introduce full Castle/Challenge semantic validation.

## Evidence

- Exact parent source was obtained with the GitHub connector and checked against blob hashes.
  The local test directory is a current-main copy with 14 exact parent files overlaid: app,
  Club, Challenge storage, Quiet app, origin transfer, all eight transfer test files and the
  existing Challenge export state note. It is not a full branch snapshot or build candidate.
- Red: both new session/protected regressions fail against the unchanged parent runtime with
  `Missing expected rejection`; existing failed-save and healthy-empty cases pass. The session
  case successfully writes a real Challenge store replay and confirms its unsaved counter is
  zero before requesting the transfer. This red result was repeated after completing the tests.
- Additional red: duplicate IDs and equal-revision Castle divergence each fail with `Missing
  expected rejection` before their correction. All four regressions were repeated against the
  exact parent adapter: seven controls pass and four intended regressions fail.
- Green: `node --test tests/origin-transfer*.test.cjs tests/challenge-storage*.test.cjs` passes
  70 tests, zero failures, on Node 24.22.1. The session case also checks a confirmed import
  performs no recovery retention or domain mutation when its preflight fails.
- The first wider source run had two fixture failures because the partial snapshot still had
  main's app.js: the transfer settings markup and real confirmation handler were absent.
  Supplying the exact parent app.js made all 66 tests pass; no runtime fix was made for those.
- Ambiguity coverage checks identical and divergent duplicate replays, equal-revision note
  changes, reversed arrays, array/object mismatch and missing keys. Checksum-valid incoming
  files are refused with zero port calls and unchanged payload/file bytes. Reordered nested
  object keys, null/absent records and state-only sections round-trip unchanged.
- Pinned Prettier checks pass for the four changed source/test files.
- Independent review found an additional export-side sparse-array gap: `[]` and `Array(1)`
  both have zero enumerable keys, but serialize differently. A public exporter regression
  failed with `Missing expected rejection` before the fix. `sameJson` now checks array lengths
  explicitly; that regression and the previous 69 contracts pass. The rejected input retains
  its sparse array and original serialized bytes. This is still partial-snapshot source evidence,
  not full branch build/CI qualification.
- `npm test` was attempted and stopped in `pretest`: this partial snapshot has no Git identity
  and no fresh web/Android build receipts. No full-suite, build or budget pass is claimed.

## Independent review checklist

- Confirm session writes can succeed with zero `unsaved()` while no durable row exists, and
  that the new guard runs after flush and before database enumeration.
- Confirm protected mode remains refused even when its mode label is still `indexeddb`.
- Confirm valid empty IndexedDB and absent/unmounted stores are not rejected unconditionally.
- Confirm import preflight refuses before recovery retention and all domain writes.
- Confirm duplicate IDs cannot overwrite an earlier row and that checksummed malformed input
  reaches no port operation while its original bytes remain unchanged.
- Confirm Castle comparison includes all nested state fields, ignores object insertion order,
  preserves array order/type/length (including sparse export inputs), and does not equate the
  envelope counter with state revision.
- Review the #746 fixture: Castle succeeds during rollback; the verified failure message must
  not accept the retained-recovery or mismatch paths; divergent fallback bytes are exact.
- Require fresh exact child-head CI, browser storage fixtures, full verification and unchanged
  inherited numerical ceilings before merging this child into the draft parent.

## Not verified and parent boundaries

No actual browser, real IndexedDB, physical Android, TalkBack, hosted deployment, destructive
five-domain player import or real system transfer was exercised here. IndexedDB fault fixtures
and domain counters remain synthetic evidence. `HUMAN_TODO.md` device/owner gates stay open.

Parent #579 remains draft: durable startup/crash recovery and inspect/export/restore UI,
shared normal-writer ownership during apply/rollback, semantic domain validation and malformed
record preservation, complete actual-origin destructive acceptance, and current-main
reconciliation/budget fit remain required. Its existing direct Quiet/Castle/Challenge writers
still bypass normal owner/CAS admission. Broader replay/state semantic validation remains;
this slice only removes duplicate-ID and Castle state/envelope ambiguity. #746's other
fallback race, durable retention/no-leak coverage and fallback-only rollback behavior are not
resolved by this slice. A session replay disposed before separate export is not recovered here.
