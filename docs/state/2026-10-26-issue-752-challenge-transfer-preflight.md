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

## Exact-tree local qualification and measured draft-parent allowances (2026-10-26)

The earlier partial-snapshot limitation is superseded for the source/build checks below.
The connected GitHub recursive trees were reconstructed locally without a shell GitHub
fetch: parent `9e99df4d51bb29de59233348e576273f82c8ae5f`, tree
`9899c9f4faac957be901ecf6f2e736aae648edf6` (1,665 tracked files), and child
`a7a7b77ec07b0015f6f84efc7913382fd3596218`, tree
`e79779dad5bbbae1599a88ce2977ef9be028e98f` (1,666 tracked files). Every tracked blob and
mode matched, both recursive trees were untruncated, and Git's assembled tree hashes matched
exactly. The five local follow-up files also matched the child's blobs before application.
The parent reconstruction removed the 427 uploaded-main files absent from that older branch;
this is the draft transfer parent's source, not a partial current-main overlay.

Local commits are synthetic: parent `149468d1c72bd91b717c62d87d03e2c2a0ab8a70`, child
`a067c39b0fe767ad877905ee3706ffbafd8361b7`. Their trees match the remote commits, but
build receipts necessarily name the synthetic source SHAs. This can move identity/hash gzip
measurements slightly; it does not establish the original remote commit's hosted receipt.

Pinned `npm ci --no-audit --no-fund` installed the parent/child lockfile exactly into a real,
ignored `node_modules` directory (including Sharp 0.35.4 and esbuild 0.28.2). On Node 24.22.1:

- Clean parent and child `node tools/build-android.cjs` each passed, producing the web build
  and Android **browser-preview payload**, with `sourceDirty: false`. This is no installed
  native APK or physical-device claim. One child attempt refused an existing generated
  identity; after verified removal of generated web/Android outputs the controlled build passed.
- Parent focused transfer/storage suite: 62 passed. Exact child suite:
  `node --test tests/origin-transfer*.test.cjs tests/challenge-storage*.test.cjs`:
  **70 passed**, zero failures/skips. Changed source/test Prettier and diff checks passed.
- Parent's inherited budget suite passed. Child's unchanged budget suite failed at the
  application-gzip assertion; evaluation of the other unchanged formulas also established
  the initial-payload and shell excesses below. These were new costs relative to the parent.

| Metric | Parent | Child before allowance | Delta | Previous strict ceiling | Excess | Explicit allowance | New strict ceiling |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Application gzip | 138,640 | 138,834 | +194 | 138,656 | 178 | +224 | 138,880 |
| Initial code/content gzip | 207,982 | 208,177 | +195 | 208,000 | 177 | +224 | 208,224 |
| Shell excluding official content | 1,423,242 | 1,423,700 | +458 | 1,423,272.32 | 427.68 | +512 | 1,423,784.32 |

The coordinator explicitly authorized these measured allowances, following the existing
branch convention. The budget follow-up changes only these three limits, adjacent measured
comments, and this handoff; it makes no runtime edits. The margins at the measured child
identity are 46 gzip, 47 gzip and 84.32 shell bytes. Boot, Quiet Wing and official-content
measurements were unchanged; the platform identity contributed a one-byte gzip difference.
Final clean follow-up build/budget results are retained in the coordinator's qualification.

This remains qualification of the **older draft transfer parent and its child**. It is not
current-main integration or permission to carry these limits into main. Fresh exact-head
hosted CI, full Node/browser acceptance, independent review, and the parent boundaries above
remain required. No real IndexedDB/browser destructive transfer, installed native test,
physical Android, TalkBack or human acceptance is claimed. `HUMAN_TODO.md` remains authoritative.
