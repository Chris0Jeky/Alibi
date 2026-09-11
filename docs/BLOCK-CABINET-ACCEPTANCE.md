# Block Cabinet engine acceptance

Candidate evidence, 2026-09-11. This record distinguishes code tests, browser automation and physical-device acceptance.

## Engine and source prototype

- `node --test tests/block-motion.test.mjs`: 13 tests passed locally, including 100 seeded trajectories, replay equivalence, relic conservation, simultaneous crossings, gravity chains, rotations, illegal moves, bounds, worker-import size gating and idle-frame disposal. The hosted workflow remains authoritative for the branch head.
- The engine candidate now serializes Cascade adapter writes, retains the Classic demo across lab switches, preserves selected rotation during drag, keeps semantic controls available without Canvas, and validates replay imports in a dedicated module worker. Protected session fallback refuses destructive replay replacement; these UI and storage paths still need the integrated actual-control proof below.
- The corrected integration build at `e80c451236aaf3e4733bd4fe7dcbd8a6baf18680` is `a44cef46b8e5`, passes the formatting gate and keeps the optional pack below its 64 KiB cap. The production bundle uses a delivered replay-worker asset; the standalone bundle embeds the same worker source and the integration honors the app-level reduced-motion setting.

## Production integration

The stacked integration layer adds actual-control tests for original Classic replay preservation, undo/redo, mouse drag, touch cancellation, keyboard focus, Cascade separation and persistence, stale-tab rejection, fallback controls, offline pack loading, route disposal and responsive layout. Its own workflow/check results take precedence over this architecture note. Merely adding those assertions does not establish that they have passed.

## Physical launch gates

Use a modest Android device and a high-refresh device. Check drag alignment under finger occlusion, OS back and navigation gestures, interrupted gestures, long sessions, TalkBack order and announcements, enlarged text, orientation changes, sound interruption and comfort, vibration support, file export/import, storage pressure and lifecycle resume. Record actual device/browser/build IDs and measurements.

The Canvas draw-time statistic is neither end-to-end input latency nor frame-time performance. Do not infer 60/120 fps or native performance from the desktop automation.

Cascade remains an experimental rule set: no blanket solvability or difficulty claim. Its replay export is separate from the Club/combined backup. The standalone Classic demonstration uses different deals and session-only state; the production adapter must keep the original Classic reducer and save queue.

No Android APK, Play Store publication, live-site deployment or physical-device approval is included in this candidate.
