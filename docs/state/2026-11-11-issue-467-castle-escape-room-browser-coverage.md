# Castle-origin Escape room completion coverage

Prepared from `be74108be2c1a2ea7e86bd0cf27db6335e7d37ef` on
`codex/escape-room-browser-coverage-20261111`. Refs #467 and #470.

`tests/browser_castle_escape.py` keeps the detailed Tidekeeper inspector and navigation
scenario. Separate browser contexts at 320×740 and 844×390 open each of the other five rooms
from the Castle list, play its bounded model path through visible labelled controls, and check
for that room's ending and the removal of gameplay actions. The room model supplies the input
sequence. The browser must find, use and complete the path through the built application.

The Python 3.13 syntax check and `git diff --check` passed. Calling `other_room_paths()` through
Python obtained verified authoring traces for Clockmaker (6 actions), Counterweight (8),
Herbarium (4), Moonseed (7) and Printmaker (8).

`npm.cmd run build:web` produced `3a906979e4f7` at the base above with `sourceDirty: true`.
With `PORT=8894`, `node tools/serve.cjs` served that build at `http://127.0.0.1:8894/`.
`ALIBI_URL=http://127.0.0.1:8894/` and `PYTHONUTF8=1` with
`py -3.13 -B tests/browser_castle_escape.py` passed 24 checks, including all 12 room and
viewport completion pairs, with no page errors. The receipt is
`test-results/castle-escape/acceptance.json`. The Castle workflow already runs this test and
retains its acceptance JSON.

This coverage is for Chromium on the built HTTP origin at emulated viewport sizes. Physical
devices, assistive technology and human puzzle calibration have separate acceptance.
Hosted CI and the combination with the separate Escape persistence changes remain unverified.
Owner decisions remain in [HUMAN_TODO.md](../../HUMAN_TODO.md).
