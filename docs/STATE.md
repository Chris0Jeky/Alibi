# Live development state


## 2026-10-11: configured release-checkout lookup

Release preparation now checks PULSEBOARD_REPO and the direct Pulseboard
sibling before deriving a linked-worktree sibling from Alibi Git. A valid
configured checkout works when Alibi is a source archive without .git. A
disposable real filesystem regression fails on the previous eager Git probe
(five existing cases pass, one new case fails); all six pass after the fix.
The same case checks direct-sibling lookup and refusal of an invalid explicit
path. Existing release-record and Windows symlink failure controls remain.
No collector checkout, release version, registration, publication or deployment
was changed. Broader qualification and independent review remain pending;
[HUMAN_TODO.md](../HUMAN_TODO.md) retains release/device owner gates.
