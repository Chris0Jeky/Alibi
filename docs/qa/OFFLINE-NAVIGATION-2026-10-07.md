# Offline navigation recovery

Refs #420, items 1 and 2. Based on main 8b7f632e50b43c634540f09ad368380743b1b90b,
whose only change from the source archive a853990 is a historical report.

The current release precaches its existing styled 404 document. Non-shell
navigation still asks the host first and preserves every real host response,
including 404 and 503. Only a rejected navigation fetch may use the current
release's cached 404, with HTTP status 404. Missing assets never receive this
HTML fallback. A missing current fallback does not borrow another release's
page. Known privacy/about/login .html and /index.html forms use the existing
alias redirect, retaining query and fragment behavior.

Source-template regression: 32 cases, 18 failures before the repair and all
32 passing after it. With the browser-wiring contracts: 34 passing. Syntax
checks and Python compilation pass. These execute the real build template,
not an emitted application or a physical device.

The dedicated read-only workflow checks out the exact PR head, runs the pinned
formatter/build, unchanged byte budgets and emitted worker suites, then checks
32 real local-origin navigation cases across 390px and 1280px Chromium contexts.
Its receipt binds the emitted worker SHA-256 and platform identity. Failed runs
write passed:false; no saved player data enters artifacts.

Local npm installation failed before tools were installed, so the new emitted
browser suite and full build remain CI gates at submission. No numeric budget,
published puzzle, database version, release or deployed origin is changed.
HUMAN_TODO.md retains physical Android/TalkBack and hosted-response acceptance.
The hybrid-input keyboard-help question in #420 item 3 remains open.
