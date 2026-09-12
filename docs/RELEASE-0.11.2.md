# 0.11.2 — Faster hints, steadier controls

Release candidate for the existing Cloudflare primary and Sites fallback. Publication is
pending the combined PR gate and hosted verification; this document does not claim a deployment.

The candidate includes the merged mobile Wrenmere Desk and Nonogram hint/touch improvements
from #138/#140, plus Castle notebook merge provenance, expiring practice-return focus, and
Games Room keyboard/pan corrections. The desk remains opt-in at `#/home?ux=house`.

Published puzzle IDs, revisions, legacy definitions and save schemas are unchanged. Notebook
merges retain pre-restore recovery and reject excessive text rather than truncating it. The
existing update flow waits for the player's Save & update action.

The component evidence is recorded in [STATE.md](STATE.md); the final source/build, hosted
deployment IDs, artifact checks and real-origin results will be added after publication.
Physical-phone, TalkBack, narrative, difficulty and audio-comfort acceptance remain open in
[HUMAN_TODO.md](../HUMAN_TODO.md).
