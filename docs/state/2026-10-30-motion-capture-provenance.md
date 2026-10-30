# Motion capture provenance correction — 30 October 2026

## Changed

The motion library now separates the dated 8 September capture from today's local server
default. It no longer presents the later port change as a measured fact about those captures,
or calls the old 116-puzzle view current.

## Verified

- Compared `docs/ASSET-MOTION.md` on the pre-composition base `aeb6656e` with main:
  the historical paragraph's port changed from 8787 to 8797 while retaining the capture date.
- `package.json` runs `tools/serve.cjs` for `npm start`; its default is 8797 when `PORT` is unset.
- This is a documentation-only clarification. The capture date and other historical content
  remain as recorded; the assets and application are unchanged.

## Not verified and residual risk

The original capture logs were not independently inspected, so neither historical port is
asserted as proven. No tests, browser capture, deployment or physical-device check ran. Hosted
checks and independent review remain separate. Owner decisions remain in `HUMAN_TODO.md` and
are unchanged.
