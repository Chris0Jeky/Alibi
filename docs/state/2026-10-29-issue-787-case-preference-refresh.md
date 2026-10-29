# Case wording follows the header preference (#787)

The mounted experimental case now exposes separate refresh and disposal operations.
Changing a Castle header preference refreshes the existing player immediately. Its
selected stage, draft verdicts and citations, hint/reveal history, accepted answers,
download lifetime and CastleStore authority stay in the same mounted visit. Closing
the preference dialog still returns focus to its header button.

## Regression evidence

The actual-control regression was published before the runtime change at
`8eaac8f07d830a4e06c114d8e0e63dd7cd89310a`. The hosted Wrenmere
[run 40801304826](https://github.com/Chris0Jeky/Alibi/actions/runs/40801304826)
passed its build, Node, existing Castle and recovery checks, then failed at the new
assertion: the header checkbox was off but the mounted case still read **Turn story
off**, while the test required **Turn story on**. No runtime code was changed in that
reproduction commit.

The same fixture now checks both directions at 320 and 1280 CSS pixels, immediately
while the preference dialog remains open and after reload. It compares the complete
saved case record, verifies draft controls and dialog focus, and changes the header
preference while revisiting an earlier completed stage to detect remount/reset bugs.
Existing navigation, abandoned-install, stale-control, backup, CAS, unknown-record and
offline assertions remain in the fixture.

Local build, Python compilation, pinned formatting, patch whitespace checks and
106 Castle/storage/asset/budget tests pass. Application JavaScript is 135,775 gzip
bytes and the core shell excluding official puzzle content is 1,410,173 bytes;
the existing ceilings remain unchanged. Independent source review found no blocker.
New-head hosted results are recorded on the PR.
The pinned local Chromium download returned a truncated archive, so the red/green
actual-origin evidence comes from the hosted Wrenmere workflow. No public deployment,
physical phone, TalkBack or editorial acceptance is claimed. Existing owner work
remains in `HUMAN_TODO.md`; no numeric budget or save format changes.
