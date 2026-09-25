# Binary integration checkpoint, 25 September 2026

PR #329 / issue #327. The preceding head `3d3f7c55` completed all six applicable
workflows, including full Verify `36161546358`, reasoning `36161546235`, Night
controls `36161546388`, Picture Logic `36161546319`, Android `36161546418` and
Wrenmere integration `36161546475`. Codex review comment `5835930110` covers that
same head and reports no major issues. Its code, source tests and asset fingerprints
are unchanged by this refresh.

Main then added Night Routes and merged the radius regression guard #356. The
refresh integrates main `3e3a8c7bb341fc6373bc8d6ea84cf7db2d6862f8`, preserving all
418 registered definitions and the radius test. A conflict was confined to STATE:
retain main's entire state log verbatim rather than replace another lane's newer
history. Earlier binary evidence remains in BINARY-REASONING.md and its historical
archive; this checkpoint supersedes the old pending-CI note for the named old head.

This is a new integration head and needs its own exact-head full Verify and affected
controls before merging. The preceding green results do not certify later bytes.
No runtime source, puzzle ID/revision, save format, budget, workflow permission or
deployment change is made by the refresh. Keep #161 and HUMAN_TODO open; recertify
Vault profile receipts when the production hint implementation is integrated there.
