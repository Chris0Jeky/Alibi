# Wrenmere Desk: mobile-first review edition

Candidate dated 2026-09-12, based on main `495f28d6ff6a7058d9e4f09c159652c4e99baa9d`. Includes the earlier unsubmitted desk foundation and a second component/UI iteration. Not a deployment, replacement game engine, or Capacitor build.

## Try it

After `npm ci && npm run build && npm start`, open `http://localhost:8787/#/home?ux=house`. Classic offers an explicit invitation; the new edition is not forced on existing players. `Classic desk` returns immediately.

For a dependency-free portable source preview: `node tools/preview-house.cjs house-preview.html`. Open the HTML in a browser. Cabinet engines are real; optional castle/media packs, import workers and origin-based persistence require the production build. The source preview labels that boundary, including session-only storage. The desk study is session-only in **both** builds.

## What changes

Phone layout is the baseline: one start/resume card before artwork; a five-destination bottom dock with text labels; compact puzzle rows; an explicit Apply/Cancel filter sheet; illustrated observation sheets; and room cards with observed/read-again states. Wider layouts expand these components rather than shrinking a desktop dashboard onto a phone.

The optional deduction loop is complete: read the envelope, inspect three rooms, compare notebook observations, recover from a wrong answer, then solve. It never gates ordinary puzzles. This is a bounded interaction study, **not a canonical Wrenmere chapter or a persistent castle unlock**.

Search, family, level and progress live in whitelisted URL parameters. Returning from a game preserves the finder route, expanded result count and launch-control focus. Continuation reads existing revision-pinned puzzle records and replays supported Games Room runs; this navigation layer never repairs or overwrites saves.

## Ownership

- `src/house-loader.js`: small opt-in facade capturing the existing app bridge. Uses the existing timeout-bounded `AlibiActivities.loadSource`, rather than a second script-loading owner.
- `src/house/model.js`: pure route, catalogue, continuation and study read models.
- `src/house/components.js`: original decorative SVG vocabulary and three room engravings.
- `src/house/view.js` / `style.css`: escaped templates and scoped mobile-first presentation.
- `src/house/controller.js`: one abortable listener lifetime; delegates games, preferences and dialogs to existing owners.
- `src/house/bootstrap.js`: optional CSS initialization and separately versioned preview cache, retaining one previous pack; no puzzle data or shell-cache eviction.
- `tools/build-house.cjs`: hashed optional JS/CSS plus standalone embedding. House files are **not downloaded during core service-worker installation**. First explicit entry attempts to cache them; the footer reports readiness. Uncached offline entry has a classic fallback.
- `tests/house*.test.cjs`, `tests/browser_house*.py`: model, delivery, interaction and actual-origin optional-cache contracts. Source and hosted receipts are kept distinct.

## Review

[Component contracts](MOBILE-COMPONENTS.md) · [Interaction audit](INTERACTIONS.md) · [Asset ledger](ASSETS.md) · [Roadmap](ROADMAP.md) · [Verification](VERIFICATION.md).

Keep opt-in until hosted checks, independent review and physical accessibility/touch acceptance pass. Existing `HUMAN_TODO.md` and Capacitor gates remain in force. Screenshots and automated checks do not establish improved retention, conversion, frame rate or Core Web Vitals.
