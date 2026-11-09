# Folio controls after 3D fallback (#895)

## Changed

Folio now synchronizes Turn and zoom controls with the stage's current `folio-3d` state whenever the active SceneView reports a status. A context-loss fallback removes that class before reporting, so the controls return to disabled while the illustrated view remains available. Model selection, reopening, tab navigation, and folio disposal invalidate old callbacks so they cannot change the current status or controls.

## Verified

- `tests/browser_folio_fallback_stub.py` passed in Chromium using the actual Folio controller and DOM with an explicit deterministic SceneView lifecycle stub. It covers successful readiness, fallback after removing `folio-3d`, visible fallback status, reopen, model change, tab navigation, and disposal. The stub deliberately supplies the lifecycle and does not claim WebGL or hardware coverage.
- `node --check src/quiet-wing/folio.js`, Python byte-compilation of the browser test, and `git diff --check` passed.

## Not verified / remaining risk

- A real WebGL context-loss smoke test remains unverified. Local Chromium's real WebGL initialization was unavailable in this environment; this controller regression does not substitute for the manual GPU-path check.
- Physical-device behavior and screen-reader output remain unverified.
