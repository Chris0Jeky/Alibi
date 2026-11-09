# Quiet Wing controls follow-up — 9 November 2026

## Player behavior

Realm feedback keeps the existing visible, polite live toast. When it would overlap the camera
toolbar, placement uses the actual toolbar and toast bounds to choose space above or below it.
Scroll and resize update that placement. Leaving the Realm or opening a dialog restores normal
positioning; closing the dialog recalculates placement. The listeners share the existing activity
abort lifetime. Messages, save behavior and the 4.2-second lifetime are unchanged.

An earlier candidate sent all Realm feedback to the status below the canvas. Review rejected that
approach because save/import errors could become invisible below the viewport; it is not included.
The revised browser regression was red on the earlier source and green after correction. Actual
Chromium checks cover pan feedback and a long recovery error at 320×568, 390×844 and 1440×900,
including viewport containment, camera control hit targets, scrolling, route changes and dialog
open/close. These measured messages fit the available viewport; an arbitrarily tall message is not
claimed to fit without overlap.

Folio Turn and zoom controls now follow the current view's 3D state after a status report, including
fallback to the illustration. Stale callbacks cannot change a new model, opening or tab. The
deterministic controller regression uses real Folio DOM with an explicit SceneView lifecycle stub;
it passed 12 assertions and is included in the full CI workflow. This is controller evidence, not a
real GPU context-loss test. See `2026-11-09-issue-895-folio-fallback-controls.md` for its boundaries.

## Validation and remaining work

Both changes passed independent source review. The toast change passed a clean web build and the
six Quiet Wing Node tests; its actual browser journey includes the existing keyboard route-focus
checks. The combined integration passed a fresh clean web build at `738ecb0`, all 27 focused
Node/budget/catalogue/wiring checks, the actual toast/focus journey at all three widths, and the
12-assertion Folio controller regression. Startup JavaScript remains 135,472 gzip bytes and the core
shell remains 1,444,271 raw bytes. Current-head hosted CI is the remaining merge gate. No budget
limit, stored schema, existing puzzle or release gate is changed.

The local Chromium could not create a WebGL context with the available hardware or software
renderers. Actual GPU context-loss, physical-device and screen-reader behavior remain unverified.
The generic wrong-answer feedback item in #895 also remains open. Production deployment is separate.
