# fix-combined-worker: return sanitized sections and cap backup text inputs

## Reproduction
1. Combined backup whose cabinet section carries unknown settings keys or
   unfiltered `preferences.seen` entries: the worker's `combined-backup`
   branch (`src/validator-worker.js:23-60`) calls each section validator for
   its throw behavior but discards the sanitized return values
   (`validateBackup` builds `{...data, runs, packs, settings, preferences}`
   at `src/backup-validation.js:94`; `validateSave` returns `clone(v)` at
   line 219) and posts the RAW parsed `data` (line 60). The caller stages it
   raw (`src/app.js:2180`, `stagedAll = data`), so section restores consume
   unsanitized settings/preferences/packs. Sibling single-section imports
   (`importBackup`, `src/app.js:2247`) DO use the sanitized return.
2. `cabinet-backup` and `club-backup` text paths (lines 61-68) parse `m.text`
   with no size cap, while every sibling branch caps input (512 KiB castle,
   3 MB challenge-run, 20 MB combined).

## Exact change (in `src/validator-worker.js` only)
1. `combined-backup`: post sanitized sections —
   `value = { ...data, sections: { cabinet: validators.validateBackup(...),
   club: validators.validateSave(...), quiet: <validated quiet state or
   passthrough when absent>, castle: <validated castle backup> } }`.
   Before writing, read the four section-restore handlers in `src/app.js`
   (`all-cabinet`, `all-club`, `all-quiet`, `all-castle` actions) and confirm
   each consumes standard backup shape; keep `manifest`/`warnings` passthrough
   byte-identical for valid inputs.
2. `cabinet-backup`: reject `m.text` longer than 16 MB with
   `Error('Backup exceeds the 16 MB safety limit.')`, mirroring the
   `importBackup` gate (`src/app.js:2246`).
3. `club-backup`: reject `m.text` longer than 1 MB with
   `Error('Club backup exceeds the import limit.')` (generous ceiling above
   the 400 KB semantic check, which still applies after parse).

## Tests that must fail first (RED on unpatched code)
Follow the vm harness in `tests/planning-vault-integration.test.cjs:124-151`
(loads `dist/assets/validator.<hash>.js` in a `vm` context, drives
`context.onmessage`, collects `results`): add
`tests/validator-worker.test.cjs` with the same loader driving the
`combined-backup`, `cabinet-backup` and `club-backup` message types. The
built worker is required — run `npm.cmd run build:web` first when
`validator.*.js` is absent (worker worktrees lack `dist/`; the orchestrator
re-proves with `dist/` present):
- combined backup with unknown settings keys returns sections with those keys
  stripped (RED: old code returns them);
- cabinet text over 16 MB and club text over 1 MB are rejected with the exact
  messages (RED: old code parses them);
- valid combined/cabinet/club inputs return unchanged values.

## Proving check
`node --test tests/validator-worker.test.cjs` (after `build:web` if needed).
Repo gates that must stay green: `npm.cmd run format:check`.
Validation-only change; no player-facing strings change except the two new
limit errors (keep them player-worded).
