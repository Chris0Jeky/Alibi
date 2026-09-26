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

Published 26 September 2026 from [PR #390](https://github.com/Chris0Jeky/Alibi/pull/390)
merge commit `985515e0a9082533b24a052a9e1b8fdd53d6d038`; annotated
[`v0.14.0`](https://github.com/Chris0Jeky/Alibi/releases/tag/v0.14.0) points to it.
The clean merged-source build `e76940574f91` is version 0.14.0 with
`sourceDirty: false`, 510 puzzles, 293 emitted files (including
`assets/official-deferred.772f599b2a04.js`), 130,084 application JavaScript gzip bytes
and 200,476 initial code-plus-content gzip bytes (ceiling 204,800). Exact-head PR CI
passed; merged-source local `npm run verify` passed 668 tests (665 pass, 3 skipped).
`cloudflare:check` and `bundle` passed; `SHA256SUMS` was checked:

- `alibi-deluxe-cloudflare.zip`: `382007b069fae907526c0bb471c49da2aa3398fefd0fb6909d546fbe6e4621b2`
- `alibi-deluxe-play.html`: `6b7e54aafb66919ac87c50c23060a01cbc854ed6393470dfeb0ae61353175106`

The primary Cloudflare origin is Worker version
`e667fd5c-784b-4754-b6f0-90be31293e1a` (rollback: 0.13.0's
`65d60c13-1cb6-4567-8637-92e2fe249afc`). All 292 publicly served files returned HTTP
200 and matched the clean build byte for byte. The hosted real-origin suite passed
244 checks, including deferred Vault definitions loading offline from the precached
shell. The collector admitting 0.14.0 deployed first as Pulseboard Worker
`1fdd08f8-a81f-436c-ab41-90762ce79fbd` (rollback `6735ac3b-2187-4c91-a50f-ac2822ae35f9`);
its registration PR was opened unattended by `npm run release:prepare -- 0.14.0 --publish`.
No live 0.14.0 usage count was sent during QA. The Sites fallback was not updated (no
Sites tooling in this session) and still serves 0.12.0.

## Evidence limits

Browser suites (including 801 actual-control checks over all 80 boards in #385) do not
establish physical Android behaviour, TalkBack, human difficulty or enjoyment;
`HUMAN_TODO.md` q-2 through q-8 remain open.
