# Issue #219: Library type ramp

Branch: `design/219-type-ramp-library`, based on `faea64e6`. Two commits:
`9daa7a80` (Library adoption, which exceeded the precache budget) and `feed8bed`
(consolidation within budget, described below). PR #737.

## Changed

Removed both Library-only font-size override sections from `src/app.css` and
`src/cabinet.css`. Replaced numeric sizes in existing component rules, including
responsive rules, with ramp tokens; merged inherited-size mappings into existing
rules in `src/curation.css`. Split shared selector groups where their roles differ.
No budget, JavaScript, content, save, engine, radius or colour changes.

The authorized narrower scope retains **13 of the original 41 mappings**. These
components are rendered only by Library in the current source. Retained mappings
keep the previous adoption's visual sizes: body 16px and metadata 13px at both
widths. Shared components return to their pre-adoption rules in Library; their
rules and appearance in other rooms are preserved. No whole-room visual parity
with `9daa7a80` is claimed after this explicitly permitted scope reduction.

| Role | Retained selectors |
| --- | --- |
| body | `.family-intro p`, `.collection-intro`, `.curation-collections summary`, `.curation-gallery > summary` |
| meta | `.family-intro .btn`, `.search-field input`, `.filter-top select`, `.filter-meta`, `.family-count`, `.collection-scope`, `.disclosure-hint`, `.curation-gallery figcaption`, `.cover-note` |

The family count also has the existing `.family-card .family-count` rules;
curation has `.curation-collections > summary`, `.filters .filter-meta` and
`.filter-top input` rules. Their sizes use the same role tokens. No separate
font-size override section or new route marker is needed.

Dropped mappings (28), to avoid changing shared components in other rooms or
adding dedicated override rules for their Library instances:

- Headings: `.page-head h1`, `.news-heading h2`, `.empty h2`, `.family-card h3`,
  `.card-body h3`, `.collection-card-copy strong`.
- Body: `.page-head p`, `.family-card p`, `.collection-atmosphere p`,
  `.news-heading p`, `.empty p`, `.collection-card-copy > span`.
- Controls: `.page-head .btn`, `.filters .btn`, `.show-more .btn`, `.empty .btn`,
  `.curation-collections .btn`, `.chip`.
- Metadata: `.card-meta`, `.difficulty`, `.card-art .badge`, `.collection-stamp`,
  `.collection-caption`, `.collection-card-copy b`, `.collection-atmosphere small`,
  `.museum-atmosphere figcaption`.
- Uppercase labels: `.eyebrow`, `.card-family`.

`tests/type-scale.test.cjs` now checks the reduced adoption in the existing
selectors across all three CSS files, including every font-size declaration at
every breakpoint and no resetting font shorthand. Layout-only responsive rules
may inherit the token. It also rejects the removed duplicate override section.
The seven published ramp values, ordering and deliberate 58px wordmark exception
remain unchanged and tested. The test selector list is narrowed with the CSS;
it no longer asserts the dropped 28 mappings.

## Verified

Step 0 ran `npm run build` before any edits: exit 0, build `e5200cdc717e`.
The budget test calls `tools/content-budget-accounting.cjs`, which computes
`shellBytes = coreOfflineBytes - officialContentBytes`; deferred official content
is already included in officialContentBytes and is not subtracted again.

| Receipt | Before (`9daa7a80`) | After (working tree) |
| --- | ---: | ---: |
| Core offline bytes | 1,931,866 | 1,929,528 |
| Official content bytes | 517,619 | 517,619 |
| Shell bytes | 1,414,247 | 1,411,909 |
| Unchanged strict ceiling: `1.32 * 1024 * 1024 + 28672` | 1,412,792.32 | 1,412,792.32 |
| Excess / headroom | 1,454.68 excess | 883.32 headroom |

Shell reduction: **2,338 bytes**. Since the comparison is strict, the largest
passing integer shell size is 1,412,792 bytes (883 whole bytes above this result).

Exact final proving commands (Windows uses `npm.cmd`):

- `npm run format:check`: exit 0, all matched files use Prettier code style.
- `npm run build`: exit 0, build `0449b167a92e`, 570 puzzles, 13 families,
  5 casebooks, 307 files; initial code/content gzip 203,171 bytes.
- `node --test tests/type-scale.test.cjs tests/radius-scale.test.cjs tests/budget.test.cjs`:
  exit 0, **25 passed, 0 failed, 0 skipped**. Type scale: 6; radius scale: 4;
  budget parent plus subtests: 15. The precache shell subtest passes.
- `git diff --check`: exit 0.

## NOT verified

Full `npm run verify`, UI/browser suites, browser-computed styles, phone/desktop
visual inspection, physical-device acceptance, hosted responses and deployment
were not run in this bounded follow-up. No Git-writing commands, GitHub calls,
network services, commits or pushes were used. All file access stayed within the
worktree apart from toolchain/dependency reads. Generated build outputs were not
hand-edited. No environment variables or credentials were printed.

## Residual risk

Shared typography remains outside this reduced adoption, including Library titles
and puzzle/family/collection card headings. This is partial progress on #219.
The retained sizes are source-checked rather than browser-measured; wrapping and
physical accessibility still need the driver's existing visual/acceptance work.
The shell has 883.32 bytes of headroom; the budget itself remains untouched.

[HUMAN_TODO.md](../../HUMAN_TODO.md) remains authoritative, including physical
Android/TalkBack and publisher decisions. No owner item was inferred complete.
