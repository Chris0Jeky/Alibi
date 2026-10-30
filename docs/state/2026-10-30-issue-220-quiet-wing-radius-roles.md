# Quiet Wing radii on the shared radius roles (#220)

Branch `claude/quiet-wing-radius-220`. GPT-6.1 Sol peer slice; inspected, committed and published by
the Claude builder. Follows the House slice (#843).

## Changed

`src/quiet-wing/style.css` and `src/quiet-wing/folio.css`: 33 raw `border-radius` values now use the
shared roles from `src/app.css` (`--radius-sm` 8px controls/inputs/small media, `--radius-md` 12px
toast, `--radius-lg` 16px panels/cards/dialogs/canvas, `--radius-pill` pegs and badges). Kept raw by
design: circles (`.dot`, `.swatch`, companion portraits), illustrated geometry (window/folio arches,
vessels, riverbank and water shapes) and 3-4px board/tile details. No selector or other property
changed. Source +494 raw bytes.

## Verified

- The Quiet Wing stylesheet mounts in a shadow tree under the app document; custom properties
  inherit through the host. On the built app (`#/quiet`) every mapped control computes a role value
  (8/12/16/999px) and circles stay 50%/100% — no unresolved `var()` (which would compute to 0).
- Local build; `tests/budget.test.cjs` 17/17 (including the Quiet Wing pack cap);
  `tests/quiet-wing/engines.cjs` and `contracts.cjs` pass; quiet Node tests 19/19; asset catalogue
  unchanged; Prettier and `git diff --check` clean.

## NOT verified

Pixel-level before/after comparison of every Quiet Wing panel and the 3D scene overlay at phone
width; hosted browser suites on this head are the full check. Physical device (HUMAN_TODO q-4).

## Residual risk

Small visual corner changes (e.g. 5px challenge tiles -> 8px, 13px toast -> 12px). #220 remains open
only for decorative one-offs, if any are found later.
