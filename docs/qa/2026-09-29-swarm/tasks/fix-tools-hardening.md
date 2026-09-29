# fix-tools-hardening: three small build/guide tool defects

All three are build-time/dev-only (low severity) but each is a real,
orchestrator-verified defect with a failing shape. One worker, one test file.

## 1. Catalogue detail merge assumes shape (`tools/assets/catalogue.cjs:31`)
`detail.assets[0].derivatives.push(...detail.master.derivatives)` throws a raw
TypeError when a details catalogue is malformed (empty `assets`, missing
`derivatives`, missing `master`).
- Extract `mergeDetails(assets, detail, label)` (pure, exported for tests);
  validate `detail.assets` is a non-empty array, `assets[0].derivatives` and
  `detail.master.derivatives` are arrays; else throw
  `Error('Invalid details catalogue ' + label)`.
- `main()` calls it with the catalogue path as label. Behaviour for valid
  input identical.

## 2. Curation snapshotter writes at import (`tools/update-curation-bundle.cjs:7`)
Top-level code reads `build-info.json`, creates directories and copies trees
on `require` — no `require.main` guard.
- Move execution behind `if (require.main === module)` (export `main` for
  tests). CLI behaviour unchanged.
- Sweep: find every other `tools/*.cjs` whose top level performs filesystem
  writes (mkdir/cp/writeFile/copyFile) outside a function, and guard them the
  same way. Report the list in the summary even if it is empty beyond this
  file. Do NOT touch the two dev servers' listen behaviour beyond what their
  own tasks specify.

## 3. Guide renderer emits any URL scheme (`tools/render-guide.cjs:20`)
`[text](url)` becomes `<a href="url">` for any non-space scheme, including
`javascript:`.
- In `inline()`, only linkify when the URL has no scheme (relative, `#`, `/`)
  or uses `http:`/`https:`; otherwise emit the escaped text without a link.
- Export `inline` (add a `require.main` guard if the file executes on load)
  so the filter is unit-testable. Existing guide output for real docs must be
  byte-identical (relative links and https links keep working).

## Tests that must fail first (RED on unpatched code)
- New `tests/tools-hardening.test.cjs`:
  - `mergeDetails` throws `Invalid details catalogue` on empty-assets /
    missing-derivatives shapes; merges the valid shape (RED: helper missing).
  - `require('tools/update-curation-bundle.cjs')` creates no `integrated-*`
    directory and does not throw for a missing `build-info.json`
    (RED: old code writes/throws at load).
  - `inline('[x](javascript:alert(1))')` contains no `href`
    (RED: old code emits the link); `inline` still links https, `/`, `#`
    and relative URLs.

## Proving check
`node --test tests/tools-hardening.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Dev-only tools; no player-facing or budget impact.
