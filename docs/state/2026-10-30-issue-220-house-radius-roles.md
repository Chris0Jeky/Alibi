# House radii on the shared radius roles (#220)

Branch `claude/house-radius-roles-220`, based on `328d5dcd9909743f947a3b670a60d24fa6b75539`.
Implemented by GPT-6.1 Sol as a peer slice; committed, inspected and published by the Claude builder.

## Changed

`src/house/style.css` only. Seventeen raw `border-radius` values now use the shared roles from
`src/app.css` (`--radius-sm` 8px controls, `--radius-md` 12px cards, `--radius-lg` 16px panels and
sheets, `--radius-pill` chips): 7/8/10px controls -> sm, 12px cards -> md, 20/24px sheets -> lg
(the bottom sheet keeps square bottom corners), 24px chips -> pill. `--hx-radius` aliases
`--radius-lg` (same 16px). Kept raw by design: 50% circles (`.hx-seal`, `.hx-dots > span`) and the
2px/4px decorative details (`.hx-mini-board i`, `.hx-edition`). No selector or other property changed.

## Verified

- Built the branch and served it beside an unchanged-House build; at 390x844 on `#/home?ux=house`
  the computed radius of every House element matched except the intended moves
  (`.hx-button`/`.hx-link` 10->8px, `.hx-mini-board` 7->8px); variables resolve in the document.
  Screenshot inspected: no clipping or layout change.
- House CSS gzip 4,815 bytes (was 4,795; exclusive limit 6,144). Sol ran the 38 House/radius Node
  tests: pass. Prettier check and `git diff --check` clean; asset catalogue unchanged.

## NOT verified

Sheet/dialog and chip states were not opened in the browser (computed-style coverage is the home
desk only); desktop width and Quiet Wing are out of scope. Hosted browser suites on this head are
the full check. No physical device.

## Residual risk

Chips become full pills at their current height (24px -> 999px); visually equivalent at chip
height. #220 stays open for Quiet Wing and remaining decorative details.
