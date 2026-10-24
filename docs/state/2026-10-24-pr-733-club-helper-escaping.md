# Club HTML escaping helpers pinned by regression tests (PR #733)

Branch: `salvage/club-html-escaping-tests-20261012`. Test-only; no source change.

## Changed

`tests/club-esc.test.cjs` extracts `esc`, `B` and `go` from `src/club.js` and checks that `esc`
neutralises `<`, `>`, `&`, `"` and `'`, and that `B`/`go` keep caller-escaped hostile text inert.

## Verified

Hosted `verify` and the related workflows on the PR head. Codex review raised one finding: these
helper tests would still pass if a renderer dropped `esc` around a dynamic label. That render-level
coverage landed separately in #748 (#745).

## NOT verified

Browser rendering.

## Residual risk

None for product code. HUMAN_TODO.md is unchanged.
