# Issue #531: bounded CI dependency setup

## Change

The main `verify` workflow now caps the audio-package setup phase and the
Playwright Chromium/system-dependency phase at eight minutes each. GNU
`timeout` sends `SIGTERM` at the phase limit and sends `SIGKILL` after a
20-second grace period if the installer has not exited. A capped phase fails
with its timeout status; it does not skip or retry any later check.

`tools/ci-setup-phase.cjs` records the phase start and elapsed time. Its APT
diagnostics report only hostnames from the currently selected Ubuntu source
file, numeric values for the allowlisted download-limit/timeout/retry keys,
and proxy presence flags. Installer output is streamed with proxy environment
values and URL user-info redacted. Lines over 65,536 characters are suppressed so long
output cannot grow the redaction buffer without bound. The existing Ubuntu-only
source selection, APT signature verification, package commands, browser
command, browser waits, assertions and complete release checks remain in place.
The main job retains its 45-minute deadline. No package cache or mirror change
was introduced.

## Evidence

The current [issue body](https://github.com/Chris0Jeky/Alibi/issues/531)
records the earlier 25-minute cancellation and notes
that package installation consumed 18m37s before browser provisioning began.
The [#767 recurrence](https://github.com/Chris0Jeky/Alibi/actions/runs/40260264052/job/121370910610)
recorded two slow signed Ubuntu archive transfers totaling
about 23m52s at approximately 63 kB/s in a cancelled 45-minute full run; all
2,117 Node tests and the already-run browser assertions passed before the job
ran out of time. A same-head [one-job retry](https://github.com/Chris0Jeky/Alibi/actions/runs/40260264052/job/121382707950)
completed every gate in 25m24s with the same archive sizes downloading in 4s
and 1s. This supports bounded setup failure reporting, but does not establish
why throughput varies.

The additional [#772 receipt](https://github.com/Chris0Jeky/Alibi/actions/runs/40330494019/job/121598764213)
supplied for this task records a further 45-minute
cancellation: 59.3 MB of audio packages took 22m44s at 43.5 kB/s, and 25.9 MB
of Playwright system dependencies took 10m02s at 43.1 kB/s. It reports no
assertion failure. These measurements show that the existing 45-minute job
budget alone does not isolate slow provisioning from the full acceptance run.

## Verification and limits

- `node --check` passes for the helper and its command-stub tests.
- `git diff --check` passes, and the updated workflow parses as YAML.
- Prettier check passes for the helper and test after formatting.
- `tests/ci-setup-phase.test.cjs` contains deterministic stubs for a stalled
  installer that ignores `SIGTERM`, a failing installer whose exit status must
  be preserved, and successful setup. It also checks source-host, numeric APT,
  proxy-presence and redaction behavior. Local execution was blocked before
  assertions because this sandbox returns `EPERM` for Node child-process
  spawning. The escalation request to run only these local stubs was rejected
  because the protected Node runtime is under `/opt/codex`; the reviewer
  explicitly prohibited alternate-runtime or indirect-execution workarounds.
  Hosted CI must execute these tests before the change is treated as verified.
- No actual local APT mutation or package installation was run. This change
  bounds stalls; it does not fix archive throughput. Exact-head hosted CI and
  independent review remain outstanding.

[HUMAN_TODO.md](../../HUMAN_TODO.md) is unchanged and remains authoritative
for physical-device, publisher and owner acceptance. This CI-only change does
not close those gates.

## Hosted first-attempt correction

PR #775 head `1c0dbc06691964400e4667b5dd27082433c2abdc`, full run
[40356212115/job 121689264161](https://github.com/Chris0Jeky/Alibi/actions/runs/40356212115/job/121689264161),
ran the dedicated stub step before APT. Success and redaction cases passed. The
TERM-resistant installer was stopped after 1.1 seconds, but Node reported the
process-group kill as `code=null, signal=SIGKILL`; the wrapper returned 1 instead
of the intended timeout status 124. The follow-up handles that observed signal
when the phase deadline has elapsed. Every signal path remains nonzero.

The same review rejects zero or tiny user-supplied limits and ensures rounding
a positive remaining duration cannot produce GNU timeout’s zero-disables-limit
value. Unknown APT configuration reports proxy availability as unavailable.
The production eight-minute limits and twenty-second grace are unchanged.
Independent Sol review accepted these bounded corrections; their hosted stub
and full verification results are still required.
