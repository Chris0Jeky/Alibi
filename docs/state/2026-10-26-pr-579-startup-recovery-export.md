# Origin-transfer startup protection and recovery export (#579)

## Scope and behavior

This is a child change on the unreleased `grok/al1-save-transfer` branch, based on
`29a02968406cfac3d048f6a169f0f85924613809`. It does not qualify parent #579 for main.

The app now inspects `alibi-origin-recovery/copies/pending` before initializing
Cabinet storage, Club, routes, or their periodic save handlers. A retained copy
or an uncertain recovery read holds normal initialization and displays a recovery
screen. It can show the retained section counts, download JSON-compatible data,
or retry opening. It never restores a domain, deletes the copy, or clears storage.
The separate protected boot completion cancels the existing twelve-second
watchdog without installing the ordinary unknown-route renderer.

The read has a 2,200 ms deadline and uses an unversioned, noncreating open. An
initial database creation is aborted; an existing database must have the known
version/store. The pending key count and value are read in one readonly transaction,
so `null`, `false`, `0`, empty text and a present `undefined` value cannot masquerade
as an absent copy. Failed reads abort/close their handles; late open success closes
without starting a transaction. Unknown schemas and denied, blocked or stalled
storage are held for Retry. If IndexedDB is entirely absent, the established
local/session fallback is retained; this cannot inspect a latent IndexedDB copy.

The downloaded file is explicitly `alibi-origin-recovery-export`, version 1,
with the retained value under `pending`. It is not a normal transfer/backup file
and has no automatic import path. Unknown JSON fields are preserved. Nonfinite
numbers, negative zero, undefined values, sparse arrays, extra array properties,
cycles, nonplain objects and other values that JSON would
lose are refused rather than converted silently. The existing IndexedDB value
remains untouched whether download preparation succeeds or fails. This is JSON
data preservation, not a claim to reproduce arbitrary IndexedDB bytes/prototypes
or reference identity. Acyclic shared references are duplicated as equal JSON
values, including Castle's legitimate `state`/`record.state` alias.

The five-domain writer hold is a startup observation, not shared ownership with
another tab. A transfer can start elsewhere after this page observes no pending
copy. Later Pulseboard/Voices scripts may initialize their own consent/feedback
state while the application awaits inspection; no claim of zero writes anywhere
on the origin is made.

## Verification

- Twelve focused Node tests pass for absent/empty storage, present falsy/unknown
  values, definitely unavailable IndexedDB, denied/blocked/failed/future storage,
  timeout/late callbacks, aborted reads, JSON preservation/refusal, and the actual
  application startup ordering. All nine transfer Node suites pass (76 tests).
  They execute the shipped functions and extracted
  application entry, rather than a second implementation.
- The full-app browser fixture passes with Playwright 1.62.0 and cached local
  Chromium 141.0.7390.37 at 390 and 1280 pixels. It seeds phases 0–4 before/among
  synthetic domain writes and phase 5 after all writes but before cleanup. It
  proves zero normal-domain opens/writes during the hold and compares each stored
  domain before/after. These are synthetic interruption states, not a destructive
  player import or real process-kill test.
- Actual controls download the retained JSON, preserve unknown private fixture
  fields, retain the pending record, and survive hash changes, the independent
  boot watchdog and Retry. Additional cases cover present undefined/Map records,
  unreadable recovery storage and entirely unavailable IndexedDB fallback.
- A normally booted, service-worker-controlled origin subsequently reloads the
  recovery screen offline and downloads the retained copy offline. Fresh startup
  works and leaves no persistent recovery database behind. All fixture pages
  capture uncaught page errors; the final local receipt reports none.
- Phone/desktop screenshots were inspected for readable content, focus placement,
  visible controls and clipping. The browser test exposed a real `.btn` style
  overriding `hidden`; the unreadable-storage screen now removes the unavailable
  export control. The corrected fixture passes.
- Local browser receipt: dirty development build `30cb300126f7`, payload
  `f811b5f997f327ec12081b2862ad00dcfcf0689a262cdfcca07ef57d1867c0b3`.
  `test-results/origin-transfer-safety/startup-receipt.json` records source identity
  and evidence limits. Published-head hosted Chromium qualification is still required.
- Independent Sol review found no remaining source blocker in this bounded slice,
  conditional on the final browser run and hosted CI. Source formatting, Python
  compilation and whitespace checks pass. The dedicated safety workflow now pins
  the app/boot/probe and new fixture and runs the full-app recovery acceptance.

## Explicit feature-branch byte cost

### Castle alias follow-up

Independent follow-up review identified that `readCastle()` can return the same
state object in both public state positions. IndexedDB retains that alias. The
initial recovery export's global visited set refused it even though JSON can
preserve both values. The new regression fails that initial implementation; an
active recursion stack now rejects cycles while accepting repeated acyclic data.
The browser fixture reads Castle through its actual device port, retains the
aliased snapshot and downloads it after an offline protected startup. The earlier
browser and clean hosted receipts remain evidence for their own source identities;
the corrected published head requires fresh hosted qualification.

The prior clean synthetic feature receipt in the #752 handoff measured application
gzip 138,835, initial gzip 208,176 and net raw shell 1,423,700 bytes. The corrected dirty development
build measures 140,072 / 209,427 / 1,427,610: +1,237 / +1,251 / +3,910 bytes.
The screen stays in the offline release so it can work after an interrupted
transfer without a connection. The implementation reuses the normal button/panel
styles and download helper; it has no new dependency or second styling system.

This child explicitly adds 1,280 bytes to each existing feature application/initial
gzip ceiling and 3,968 bytes to its raw-shell ceiling. The resulting limits are
140,160 / 209,504 / 1,427,752.32; the measured output passes them. These are
unreleased feature-branch allowances, not an increase to main's budget or evidence
of current-main fit. Clean hosted identities may change the gzip figures slightly.

## Remaining release gates

The parent still needs ordinary-writer owner/CAS integration, a versioned private
interruption journal containing exact fallback bytes/backend existence and
operation/post-image metadata, conditional restoration/cleanup, broader domain
validation, and current-main reconciliation and byte qualification. Legacy pending
snapshots still omit the raw Quiet fallback Symbol; this export does not recover
data never retained there. #746 items 1 and 4 remain unresolved.

The screen deliberately has no "continue anyway" or destructive restore button.
An unresolved copy requires further recovery work; downloading it is not proof
that restoration is safe. A slow device can conservatively hit the inspection
deadline and require Retry. Physical Android, TalkBack, full native document-provider
acceptance and owner gates in [HUMAN_TODO.md](../../HUMAN_TODO.md) remain open.
