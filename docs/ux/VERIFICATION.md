# Verification receipt — 2026-09-12

Audited main: `495f28d6ff6a7058d9e4f09c159652c4e99baa9d`. Candidate is PR #138. Exact-SHA hosted checks take precedence over a local source receipt. No deployment or physical-device approval is claimed.

## Executed locally

- `node --test tests/house.test.cjs`: 28 passed, no skips/failures.
- Explicit source mode `tests/browser_house.py`: 79 assertions passed, no JavaScript page errors.
- Explicit source mode `tests/browser_house_mobile.py`: 250 assertions passed, no JavaScript page errors.
- Syntax checks and `node tools/preview-house.cjs /mnt/data/Alibi-mobile-preview.html`: passed.

These 329 browser assertions cover real first move, resume/undo, finder/return focus, observations/deductions/hints, preference handlers, six widths, dock targets, filter cancellation/reset/apply, failed decode, short landscape, large text/night/contrast and forced colours. They are not 329 independent users or physical devices. Both source suites were rerun after the optional-bootstrap refactor.

The source preview labels missing optional packs and session storage. It does not fabricate a validator, native storage, castle unlock or game completion. Screenshots inspected include 390 px desk/finder/rooms/notes/comfort/filter/observation sheets and 1440 px desk.

## Hosted checkpoint and fixes

At formatted commit `fab1df9eaded532d6147c6328d6274a319c263f1`, House run `34668711551` installed dependencies, built, passed 28 dedicated Node tests and all 329 source-browser assertions. Its served-origin test then encountered a test-side CSP eval restriction. Main verification also exposed an initial/core byte-budget excess and a positional configuration-header assumption. Those failed checkpoints are **not** passing release evidence.

The next revision reuses the existing bounded script loader; makes the two-file desk pack genuinely on-demand with a separate cache; retains all bytes in full distribution accounting; parses the named static Quiet Wing config; and uses bounded test-side CDP polling without changing the production CSP. It adds four built-delivery tests and an actual-origin optional-pack test (no download on classic install, cache on explicit entry, working offline reload, uncached-offline classic recovery). These added hosted checks remain pending until a final-SHA run proves them.

Existing production caps, branch protection and release checks are unchanged. Optional pack caps are <60 KiB compiled raw and <18 KiB combined gzip. `build-info.json` records actual sizes; source whitespace is not a transfer measurement. No new raster/font/video/audio was added.

## Environment and gates

Local dependency installation was blocked by unavailable registry/cache access; dependencies were not replaced with pretend implementations. Hosted Actions provides the real pinned toolchain. A temporary exact-review-branch-only helper formats and integrates known seams, commits them, and removes itself and its write workflow. The durable House workflow has read-only repository permissions and separates source, hosted and optional-offline artifacts. Confirm deletion in the final diff.

Outstanding even after green hosted checks: physical iOS/Android keyboards/browser chrome, TalkBack/VoiceOver, safe areas/reach, OS text size/200% zoom, low-end latency/memory/battery, moderated usability and full release-update/device recovery. HUMAN_TODO and Capacitor-specific gates stay open.

## Reproduce

```sh
npm ci
npm run verify
python -m pip install -r requirements-dev.txt
python -m playwright install chromium
node tools/preview-house.cjs house-preview.html
ALIBI_HOUSE_SOURCE="$PWD/house-preview.html" python tests/browser_house.py
ALIBI_HOUSE_SOURCE="$PWD/house-preview.html" python tests/browser_house_mobile.py
npm start
# In another terminal:
python tests/browser_house.py
python tests/browser_house_mobile.py
python tests/browser_house_offline.py
```

`ALIBI_URL` defaults to `http://127.0.0.1:8787`. `ALIBI_RESULTS` separates receipt directories. Source mode is explicit; the offline suite always requires a served build and real browser cache APIs. Final-SHA results and artifacts belong in the PR conversation.
