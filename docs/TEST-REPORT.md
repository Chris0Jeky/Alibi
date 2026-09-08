# Verification report

Application 0.2.0, build 04628f8c5791. Reports were produced by the supplied test scripts. Assertions below are checks, not a claim that all failure modes have been covered.

## Completed

- 1741 engine/content assertions: all 102 definitions, exactly one solution each, published answers, reducer completion, locked clues, legacy forty-field compatibility, extra generated scenes, malformed inputs and required mystery accusations.
- 157 real Chromium DOM/control checks: complete one puzzle in every family, all twelve hands-on lessons, undo/redo, notes, pause, mobile evidence drawer, worker-backed workshop, pack rejection, backup export/revalidation and revision-pinned continuation.
- The browser suite checked 20 routes at widths 360, 390, 768 and 1440 pixels for whole-page horizontal overflow. A deliberately enlarged board may scroll locally.
- 27 fallback storage contract assertions in a Node VM: honest modes, sequential revision conflicts, export preferences, corrupt-record preservation, refusal of nontransactional restore and newer-database refusal.
- 24 simulated CacheStorage/service-worker and built-asset checks: coherent shell, explicit activation, failed installation cleanup, old-hash compatibility, cache boundaries, manifest identity and assets.
- The two example packs were accepted by executable validators; a structural JSON Schema check was run against the catalogue and examples.

## Not established by these reports

This environment blocked normal browser URL navigation, including localhost and a synthetic routed HTTPS origin, with ERR_BLOCKED_BY_ADMINISTRATOR. UI tests therefore used Chromium set_content in an isolated document. They exercised real rendered controls, Blob workers and downloads, but session-memory storage rather than a genuine hosted IndexedDB origin.

Actual IndexedDB transaction/reload durability, restore replacement/merge on real IndexedDB, installed Android behaviour, a real service-worker-controlled offline restart and a live two-release update remain pending. No Cloudflare account was changed or deployment performed. There is no physical-device, screen-reader, penetration-test or human difficulty-calibration certification. Follow RELEASE-CHECKLIST.md.

## Reproduce

`npm run build` then `npm test`. For browser checks, install the optional Python Playwright dependency and run `python tests/browser_ui.py`. Test scripts fail on assertions; do not substitute a stale report for a new execution.
