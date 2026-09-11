# Block Cabinet integration receipt

Candidate verified in GitHub Actions; not deployed. Physical Android not tested.

Source commit: `b7c16a5afb0de1392dd6dcec0f4739b11348cba0`. Build: `ab4f8a4a27b7`. App version unchanged: `0.11.1`.

- Full `npm run verify` passed: formatting, build, all Node tests and supplementary suites.
- Enhanced actual-control matrix: **42 checks** passed at 390 and 1280 CSS pixels, including successful lifted touch drops, touch cancellation, legacy rules/save preservation, undo/redo, keyboard focus, Cascade isolation, stale-tab rejection, offline reload and route disposal.
- Retained legacy Block Cabinet browser suite passed at 390 and 1440 pixels.
- Existing real-origin storage/offline suite and in-progress release-update suite passed.
- Optional game JS/CSS/art: **42881 bytes**, outside initial precache. Initial loader: **808 bytes gzip**. Main JS: **127998 bytes gzip**. Existing main and offline budget caps remain unchanged; new pack has a separate 64 KiB cap.

Art provenance and checksum are committed under `assets-source/block-cabinet/`. The live tiles, previews, particles and locally synthesized sounds are code, not baked UI screenshots.

The native-feedback adapter is an extension point, not an implemented native Android host. No APK, Play submission, physical latency or battery result is claimed. Cascade remains an experimental rule set with a separate export and no blanket solvability promise. Follow-ups: #118, #119, #120.

The temporary `codex/block-cabinet-delivery` branch runs scoped preparation only and is not part of either product PR. Merge/review #115 then #117; recheck current main and CI before merging. See engine architecture and acceptance documentation.
