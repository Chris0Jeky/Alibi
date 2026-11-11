# Escape room progress in the Castle notebook (#467)

This candidate started at `e8a3430663c3d784f761024c7bcc0f44809c4009` on
`codex/escape-durable-progress-20261111`. It applies the existing #442 Castle host and save
design to the six mounted Escape rooms. It introduces an optional `escapeRooms` field on the
existing `chapter-one` record in `alibi-castle-v1`. Record and database versions remain 1.

## Save and recovery contract

- Each room entry binds its stable ID, revision and full authored JSON SHA-256. Build tooling
  checks these pins before delivery. The record keeps up to 64 undo states plus the current state,
  bounded answer drafts and the number of hints shown for each authored action. A room restart
  clears that room's progress on explicit confirmation.
- `CastleStore` owns each save transaction and its update guard. The Escape player uses the
  Castle host's save function, visit token and route disposal. Edits capture the current notebook
  and stale or failed writes retain the local session for export. Compare-and-swap checks the
  structured record read from IndexedDB, including unknown fields even at the same revision.
- The bounded Castle validator worker validates raw Escape records on open and checks import and
  restore. A compact projection generated from the pinned source checks every state against its
  reachable-state bitmap and every adjacent history pair against its legal transitions. The
  existing notebook review and atomic recovery transaction cover Escape too. Merge adds disjoint
  rooms or identical copies. A conflicting room requires explicit replacement with recovery.
- Castle continues to lazy-load the separate hashed Escape module. An explicit visit can cache it
  inside the existing Castle pack for subsequent offline visits. An interrupted optional fetch
  leaves the notebook intact and a later visit retries. The worker fits in the core shell by
  taking an exact projection of the existing Castle visit IDs in place of room presentation data.
  Compact Castle puzzle constructors preserve the complete decoded puzzle data.

The current pins describe the authored sources on the candidate base. If a pending hint-text
change lands first, regenerate its affected pins and re-prove the combined branch before release.
After release, an existing pinned room requires an explicit compatibility decision and fixtures.

## Local verification

Run from the worktree root:

```powershell
npm.cmd run build:web
node --test tests/castle-escape-save.test.mjs tests/castle-escape-host.test.mjs tests/castle-escape-room.test.mjs tests/castle-storage.test.mjs tests/castle-backup.test.mjs tests/escape-session.test.cjs tests/castle-assets.test.cjs tests/budget.test.cjs
$env:PORT = '8874'
node tools/serve.cjs
```

With the loopback server running in a separate terminal:

```powershell
$env:PYTHONUTF8 = '1'
$env:ALIBI_URL = 'http://127.0.0.1:8874/'
py -3.13 tests/browser_castle_escape.py
py -3.13 tests/browser_castle_recovery.py
```

The projected rules are compared with the authored reducer across 648 reachable states and 4,009
applied action edges. Tests cover unreachable states, forged transitions, bounded history, old and
unknown records, and failed writes. The browser fixture exercises actual controls and IndexedDB,
including a warm offline reload, drafts, hints, completion, pending restore, stale tabs and
recovery. These tests use a disposable profile.

On the edited current-base worktree, build `33f6f8cdc3f0` passed all 61 focused Node and budget
checks. Chromium passed 17 Escape checks at 320×740 and 844×390 and nine Castle recovery checks
at 390×900. Local receipts are under `test-results/castle-escape/` and
`test-results/castle-recovery/`.

| Web measure                                |     Bytes |      Ceiling |
| ------------------------------------------ | --------: | -----------: |
| Castle script                              |   100,966 |      101,120 |
| Escape module                              |    88,930 |       90,112 |
| Precached shell excluding official content | 1,443,561 | 1,444,280.32 |
| Startup JavaScript gzip                    |   135,652 |      135,680 |

## Review fixes

Restore now compares the fresh IndexedDB read against the tab's reviewed record before asking
the worker to prepare a replacement. The final transaction repeats the comparison against the
fresh read, so a write either before or during validation leaves the committed notebook and
recovery untouched. A terminal Escape state requires its preceding move in the retained trail.

Both regression assertions failed before the fixes and passed afterward. The focused post-fix run
passed 37 tests:

```powershell
node --test tests/castle-backup.test.mjs tests/castle-escape-save.test.mjs tests/castle-storage.test.mjs tests/castle-escape-host.test.mjs tests/escape-session.test.cjs
```

Direct post-fix bundles measured 100,992 bytes for Castle, 88,930 bytes for Escape and 18,432
bytes for the Castle validator component. The earlier full-build and browser results above
precede these fixes. The combined build and browser checks remain to run on the integrated source.

## Remaining gates

Exact integrated-head CI and Android artifact qualification remain open. Physical devices,
assistive technology and human clue/difficulty acceptance remain separate. See
[HUMAN_TODO.md](../../HUMAN_TODO.md).

## Combined pre-merge proof

After integrating the reviewed hint branch and refreshing its three source pins, clean source
`780a33f5ccf2ba0a7a33e1b32057ca667e9b0603` passed web and Android builds, 63 focused and
budget tests, and real-origin Castle Escape and recovery browser suites. Castle script measured
100,992 / 101,120 raw bytes, Escape module 89,114 / 90,112 raw bytes, and startup JavaScript
135,641 / 135,680 gzip bytes. The hint PR must merge before this change; recheck the exact final
head, CI and relevant browser paths after any integration changes.

## Exact-head verification and review follow-up

At `b7f05fc7a84f8a12921caee0b38cdad5c9442f9b`, the web build and `npm run verify`
passed: 2,707 tests passed and 21 were skipped. Hosted Castle jobs then exposed a stale
browser assertion for the restore warning: the UI says `replacement clears case progress`.
The assertion now checks that same warning, and the complete Castle case browser journey
passes at 320 and 1280 pixels. The updated head still requires hosted CI.
