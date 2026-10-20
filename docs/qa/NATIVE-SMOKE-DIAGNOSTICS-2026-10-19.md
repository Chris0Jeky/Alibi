# Native smoke callback diagnostics

Base: main `c89622b718a68590501e6f80d36e6d6c9df7542e`; original instrumentation
blob `d66d7c5b2cf05432f98d027741b448637fee75b0`. This is an instrumentation-only
diagnostic follow-up for recurring callback timeouts, not a fix or acceptance
claim for their unresolved cause. Production code and the runner are unchanged.

## Recorded signals

Every condition and evaluation has a sequence and stage label. `AlibiNativeSmoke`
logcat messages record monotonic submit, UI-dispatch, Java method-return and
callback times. A main-Handler heartbeat updates one timestamp at most once per
second while an evaluation is active; it performs no WebView or DOM work. On a
callback timeout, the instrumentation thread logs heartbeat age, main-thread
state and at most 24 stack frames before ActivityScenario teardown. Each log
message is capped at 1,200 characters.

Heartbeat scheduling and cancellation share a monitor. Every success, exception
and interruption stops it in `finally`, clears its active flag and removes its
queued callback. A late queued callback cannot restart the heartbeat. Diagnostic
logging/scheduling failures are best effort and do not replace tested exceptions
or assertions; the JavaScript result is stored and its latch released before
callback logging.

All existing acceptance JavaScript expressions remain unchanged. No wrapper,
marker, extra evaluation, layout/text read or persistent helper global is added.
The existing service-worker setup still returns immediately and its Promise
result is checked separately as before.

## Preserved gate and interpretation

The callback wait remains 10 seconds, each condition remains bounded by its
existing 60-second deadline, and polling remains 100 milliseconds. All five
equality assertions, both truth assertions, all four condition expressions and
both installed-APK identity checks are preserved. No retry, recovery, alternate
success path, timeout increase or workflow change is added.

The condition-timeout path now fails directly after native diagnostics instead
of requesting another JavaScript snapshot with `innerText`. This prevents a
failed diagnostic callback from replacing the original condition failure. A
callback timeout retains its existing assertion and failure outcome.

A stale heartbeat plus a blocked draw/native stack supports a UI-thread stall;
a recent heartbeat with a missing callback narrows the WebView/renderer/request
pipeline. It cannot determine whether JavaScript completed without callback
delivery. An unobserved heartbeat (-1), missing log or single stack snapshot is
not proof of a particular cause. Logging and heartbeat messages modestly perturb
scheduling, so this is diagnostic evidence, not a performance benchmark. A later
passing run cannot erase the retained failures or establish that the cause is fixed.

## Local checks and remaining qualification

Focused source comparison confirms the preserved assertions, conditions, every
acceptance JavaScript expression, bounds, poll interval and installed-byte checks.
`git diff --check` passes. These checks do not compile Java, execute Android or
validate native scheduling.

No local `javac`, SDK compilation, lint or emulator execution is claimed. Fresh
exact-head hosted compile/lint and actual instrumentation remain required. The
existing native artifact already captures logcat and test XML; no transport or
success-receipt rule changes are needed.
