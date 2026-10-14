# fix-tools-validate: fail closed on bad curation derivatives and bad --pulseboard

Two orchestrator-confirmed build/release tool defects. One worker, one test file.

## 1. build-curation emits `data:undefined` URLs for malformed derivatives
`tools/build-curation.cjs:21` builds non-museum entries from
`a.derivative.file/sha256/format` with no shape check; a registry entry whose
derivative omits `format` passes the path/hash checks and line 30 emits
`data:undefined;base64,...` into the standalone bundle instead of throwing.
- Exact change: after computing `r` (line 18-21), require
  `r.mime` (and, for the non-museum path, `a.derivative.file/sha256/format`)
  to be present non-empty strings, else
  `throw Error('Invalid curation derivative for ' + a.id)`.
  Behaviour for valid registries identical.
- RED test: fixture tmp root (registry + runtime JSON, one real
  `src/curation-assets/x.webp`) with a `venue-cover` entry whose derivative
  lacks `format`: `assert.throws(() => build(root, dist), /Invalid curation
  derivative/)` (RED: old code emits the corrupt URL).

## 2. release-prepare silently ignores a bad --pulseboard value
`tools/release-prepare.cjs:106-109` takes `argv[i+1]` unchecked:
`--pulseboard` as the last arg yields `undefined`, and
`--pulseboard --publish` yields the string `'--publish'`; both fall through
`findPulseboard` (line 82+) to ambient default checkouts with no warning, and
with `--publish` the tool then pushes/PRs from the unintended checkout.
- Exact change: when `--pulseboard` is present, its value must exist and must
  not start with `'--'`, else throw the usage error; when an explicit value
  is given but has no `.git`, throw instead of falling back. Keep the ambient
  fallback chain (PULSEBOARD_REPO, sibling dirs) ONLY when the flag is absent.
  If the file lacks testable exports, add a `require.main` guard + exports
  following the session-1 `fix-tools-harden` pattern (CLI unchanged).
- RED tests (fixture tmp dirs): `--pulseboard` last throws usage (RED: old
  code falls back silently); `--pulseboard --publish` throws usage (RED:
  old treats the flag as a path then falls back); `--pulseboard <no-git-dir>`
  throws (RED: old falls back).

## Proving check
`node --test tests/tools-validate.test.cjs`
Repo gates that must stay green: `npm.cmd run format:check`.
Dev-only tools; no player-facing or budget impact.
