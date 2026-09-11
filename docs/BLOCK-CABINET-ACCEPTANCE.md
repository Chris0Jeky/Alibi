# Block Cabinet engine acceptance

Candidate evidence, 2026-09-11. This record distinguishes code tests, browser automation and physical-device acceptance.

## Engine and source prototype

- `node --test tests/block-motion.test.mjs`: 13 tests passed locally, including 100 seeded trajectories, replay equivalence, relic conservation, simultaneous crossings, gravity chains, rotations, illegal moves, bounds, worker-import size gating and idle-frame disposal. The hosted workflow remains authoritative for the branch head.
- The engine candidate now serializes Cascade adapter writes, retains the Classic demo across lab switches, preserves selected rotation during drag, keeps semantic controls available without Canvas, and validates replay imports in a dedicated module worker. Protected session fallback refuses destructive replay replacement; these UI and storage paths still need the integrated actual-control proof below.
- The final integration fix at `4821714` (exact PR head `d7f2ec4`, including the settled-surface browser check) builds as `1d7f6914afe0`, passes the formatting gate and keeps the optional pack below its 64 KiB cap. It includes the protected-import race fix from parent commit `9e69a0a`; the production bundle uses a delivered replay-worker asset, the standalone bundle embeds the same worker source, Classic and Cascade honor live app-level reduced-motion changes, Zen hides the enhanced aside, the Cascade dialog has an accessible name, and Undo/Redo retain usable keyboard focus.

## Production integration

The stacked integration layer adds actual-control tests for original Classic replay preservation, undo/redo, mouse drag, touch cancellation, keyboard focus, Cascade separation and persistence, stale-tab rejection, fallback controls, offline pack loading, route disposal, Zen presentation and responsive layout. The reviewed local matrix passes 63 checks at 390 and 1280 CSS pixels; its own workflow/check results still take precedence over this architecture note.

## Physical launch gates

Use a modest Android device and a high-refresh device. Check drag alignment under finger occlusion, OS back and navigation gestures, interrupted gestures, long sessions, TalkBack order and announcements, enlarged text, orientation changes, sound interruption and comfort, vibration support, file export/import, storage pressure and lifecycle resume. Record actual device/browser/build IDs and measurements.

The Canvas draw-time statistic is neither end-to-end input latency nor frame-time performance. Do not infer 60/120 fps or native performance from the desktop automation.

Cascade remains an experimental rule set: no blanket solvability or difficulty claim. Its replay export is separate from the Club/combined backup. The standalone Classic demonstration uses different deals and session-only state; the production adapter must keep the original Classic reducer and save queue.

No Android APK, Play Store publication, live-site deployment or physical-device approval is included in this candidate.
