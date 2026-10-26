# Issue #712: failed Scene tap diagnostics

## Scope and baseline

This diagnostic-only follow-up starts from local commit
`5dab16b047cb016b82b5962bbbe8349a939316e6`, tree
`bbf965020add291de7bd3b859c455f405d05c38f`. It changes only
`tests/browser_september_feedback.py` and this handoff. It does not change product
code, interaction timeouts, assertions, retries, dependency pins, workflow steps,
or budgets.

The prior Linux failure showed the expected mode, person and string hit target,
with pointer down/up but no recorded click or move. Matching `button#cell-0`
strings do not establish that both events reached the same DOM node. The cause
remains unknown; this change does not claim to fix or reproduce it.

## Evidence added

- A context trace records screenshots, DOM snapshots and sources. A failed
  `tap_mark` saves its ZIP beside the existing PNG under
  `test-results/september-feedback/`; successful contexts stop tracing without a
  path, discarding their trace data. Trace start/save/discard errors are logged
  as diagnostics. Saving the trace is attempted even if the existing failure
  snapshot or screenshot throws, and the original tap failure is re-raised.
- WeakMap identities distinguish target and cell DOM nodes without adding DOM
  attributes. The failure snapshot includes the current target identity for
  comparison. The identities are scoped to the document, not globally persistent.
- Input entries retain pointer cancellation and add pointer ID, cancelability,
  capture-phase default prevention, and later-task default prevention with the
  actual event phase recorded. The existing capture-listener microtask is not
  described as the final cancellation state. No interaction wait is added.
- The failure target snapshot includes computed `touch-action`.

## Verification

The workflow installs `playwright==1.62.0` from `requirements-dev.txt` and runs
this fixture in the full IndexedDB/offline group. Its existing `if: always()`
full-scope artifact upload already includes `test-results/september-feedback/`
with 14-day retention; no artifact policy change is needed. The exact installed
1.62.0 sync API accepts `context.tracing.start(screenshots=True,
snapshots=True, sources=True)` and `stop(path=Path(...))`; its implementation
uses discard mode for a pathless `stop()`.

Focused scratch probes use the actual fixture helper/init-script source, the
pinned Python API 1.62.0, and cached Chromium 141.0.7390.37:

- Before the change, a deliberate no-move tap failure retained the original
  timeout but failed the probe assertion requiring a trace ZIP.
- After the change, four failure/lifecycle cases pass: a real failed-tap trace
  ZIP, a screenshot failure with the ZIP still saved, snapshot plus trace-save
  failures preserving the original exception object, and a successful tap with
  pathless trace discard and no failure ZIP. The real archive contains trace
  and network entries.
- A real DOM probe passes same-node and replaced-same-ID identity checks,
  pointer ID and pointer-cancel checks, capture-phase `defaultPrevented=false`
  versus post-dispatch `true` at phase 0 after a target listener cancels the
  event, and target `touch-action`. It also verifies a trace-start exception
  remains diagnostic-only.
- `python -m py_compile tests/browser_september_feedback.py` and
  `git diff --check` pass.

The one-time local probe runs used `/tmp/alibi-712-failure-probe.py` and
`/tmp/alibi-712-event-probe.py`, with packages in `/tmp/alibi-712-pydeps`. Those
temporary review scripts are not repository entry points. The source-controlled
fixture and hosted workflow provide the ongoing verification path.

## Limits and remaining gates

These are synthetic diagnostic-path probes, not reproduction of the original
Linux failure. Chromium 141 is not the workflow's Chromium 151. The full app
fixture, pinned hosted browser, full verify, and original platform remain CI
gates; none is claimed by these probes. A failure elsewhere in the fixture does
not acquire a new trace-retention promise: this scope retains `tap_mark`
failures. Passing hosted fixtures demonstrate non-reproduction, not a root-cause
fix. Issue #712 remains open. Physical/native acceptance and owner decisions in
`HUMAN_TODO.md` remain open and unchanged.
