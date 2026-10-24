# Club escaping exercised through real renderers (#745, PR #748)

Branch: `test/745-club-render-escaping`. Test-only; no source change.

## Changed

`tests/club-render-escaping.test.cjs` loads the real Club, engines and save validator through the
existing VM harness (`tests/helpers/club-session.cjs`) and injects `<img src=x onerror=alert(1)>&"'`
as runtime state: saved record labels rendered by `profile()` (local leaderboard and completed
games) and the current Lantern Gardens title rendered by `roomPage('regiongardens')` (heading and
selector). It asserts the escaped form and no raw `<img`. This complements the helper-level
`tests/club-esc.test.cjs` (#733), which would pass even if a renderer dropped `esc`.

## Verified

- `node --test tests/club-render-escaping.test.cjs`: 1/1 pass.
- Mutation checks, source restored afterwards: removing `esc` from the gardens `${esc(p.title)}`
  heading fails the test; removing it from the journal `<strong>${esc(r.label)}</strong>` fails it.
- `node --test tests/club-*.test.cjs`: 113 pass, 0 fail; `tests/package.test.cjs` 4/4; Prettier clean.

## NOT verified

Browser rendering. Other Club interpolations (seeds, private-room code) are not covered by this test.

## Residual risk

None for product code. HUMAN_TODO.md is unchanged.
