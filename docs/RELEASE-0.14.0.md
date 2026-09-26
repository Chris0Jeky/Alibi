# 0.14.0: The Vault studies

## Source candidate: 26 September 2026

[PR #385](https://github.com/Chris0Jeky/Alibi/pull/385) (superseding #354) adds 80
original revision-1 Vault studies: 20 each in Sun & Moon (Binary), Sudoku, Lanterns and
Futoshiki, for 510 puzzles in 30 packs. Labels are provisional (47 Expert, 33 Master).
Each board carries exact-definition receipts with native plus independent uniqueness;
`vault-binary-03` was replaced before publication because its residual fell below the
bar. These are machine certificates, not human difficulty or enjoyment claims.

The Vault definitions ship as one precached deferred chunk
(`assets/official-deferred.<hash>.js`), keeping the unchanged 200 KiB initial
code-plus-content ceiling. Listing entries stay in the startup script; opening an
unstarted Vault study waits for the chunk (Retry notice, no save, on failure); saved
Vault runs resume from their own stored definitions. Follow-ups are tracked in
[issue #389](https://github.com/Chris0Jeky/Alibi/issues/389).

Version 0.14.0 is registered in `package.json` and `content/releases.json`; the release
label was registered with Pulseboard by `npm run release:prepare -- 0.14.0 --publish`.

## Publication receipt

Pending.

## Evidence limits

Browser suites (including 801 actual-control checks over all 80 boards in #385) do not
establish physical Android behaviour, TalkBack, human difficulty or enjoyment;
`HUMAN_TODO.md` q-2 through q-8 remain open.
