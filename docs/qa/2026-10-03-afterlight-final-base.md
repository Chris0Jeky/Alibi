# Afterlight current-base receipt

Refs #565 and #563. The original ten-picture pack is published as optional
Workshop data, not part of the official startup registry. The fixed JSON remains
12,634 bytes with SHA-256
`b8c69faa5e2b43b1daee5c2d318b912f87b4262678b2582895952d0d8ef7bceb`.

Review found that incomplete study membership could overwrite that pack during
regeneration. Source `fee1aa2ed777f1666ac41938af8b605ab2cf5b44` requires exactly
one of each ID 01 through 10 before reading any pixel rows. Eight regressions
reproduced seven failures before correction and all pass afterwards. The real
CLI test proves a rejected incomplete compile leaves the previous file bytes
intact; complete-set reordering still preserves each puzzle definition.
All thirty-six Afterlight source/readiness/membership cases pass.

Integration `618fd3d5b5b01c1b80a24a782f38859e665e818a` adds only the release/state
notes from main `299f10efd7ec2aa33f007a8ee2ed68ee96293d32`. Every parent note is
retained; the corrected compiler, all tests, exact pack and runtime are unchanged.
The thirty-six cases pass again in run `37089582918`, artifact `11261647299`,
whose downloaded ZIP matches
`6798210712e747ce5bd1cc4ffec9ed01217096a721e0a42ff9bf563ca3c0becd`.

This receipt is the only post-integration addition. Full final-head CI, all
twenty real Workshop/control/offline board-and-viewport scenarios, independent
re-review and review aging remain required. Earlier cancelled or partial runs
are not substituted. No temporary publisher remains and no main write occurred.
Difficulty labels remain provisional; physical Android/TalkBack is unverified.
