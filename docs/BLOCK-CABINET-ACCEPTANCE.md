# Block Cabinet engine acceptance

Candidate evidence, 2026-09-11. This record distinguishes code tests, browser automation and physical-device acceptance.

## Engine and source prototype

- `node --test tests/block-motion.test.mjs`: 11 tests passed locally and again in GitHub Actions, including 100 seeded trajectories, replay equivalence, relic conservation, simultaneous crossings, gravity chains, rotations, illegal moves, bounds and idle-frame disposal.
- Standalone Chromium control smoke: piece selection and legal placement changed the score, Cascade opened with eight relics, no horizontal overflow at 390px, and no uncaught JavaScript errors in that smoke. This is not a full accessibility audit or successful physical-touch test.
- Formatted candidate `b6c57b6` built successfully as `79d9fb2c1fcf` and passed the repository's formatting gate. Its preparation job ran 189 Node tests: 188 passed; the one failure was an existing media test because that temporary job omitted the `ffprobe` executable. The normal repository workflow installs FFmpeg. Do not describe that preparation run as fully green.

## Production integration

The stacked integration layer adds actual-control tests for original Classic replay preservation, undo/redo, mouse drag, touch cancellation, keyboard focus, Cascade separation and persistence, stale-tab rejection, fallback controls, offline pack loading, route disposal and responsive layout. Its own workflow/check results take precedence over this architecture note. Merely adding those assertions does not establish that they have passed.

## Physical launch gates

Use a modest Android device and a high-refresh device. Check drag alignment under finger occlusion, OS back and navigation gestures, interrupted gestures, long sessions, TalkBack order and announcements, enlarged text, orientation changes, sound interruption and comfort, vibration support, file export/import, storage pressure and lifecycle resume. Record actual device/browser/build IDs and measurements.

The Canvas draw-time statistic is neither end-to-end input latency nor frame-time performance. Do not infer 60/120 fps or native performance from the desktop automation.

Cascade remains an experimental rule set: no blanket solvability or difficulty claim. Its replay export is separate from the Club/combined backup. The standalone Classic demonstration uses different deals and session-only state; the production adapter must keep the original Classic reducer and save queue.

No Android APK, Play Store publication, live-site deployment or physical-device approval is included in this candidate.
