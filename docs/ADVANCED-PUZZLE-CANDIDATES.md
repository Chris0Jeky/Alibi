# Advanced puzzle candidates — 2026-09-21

This document records source candidates that are present in open pull requests but are not deployed or human-calibrated releases.

## Crime Scene variations — PR #226

The candidate adds six additive revision-1 Crime Scene puzzles with provisional Master and Grandmaster labels. An independent 5! × 5! placement enumerator agrees with the native solver on one solution per case. Focused contracts also require every clue to be necessary, rooms to be connected, and every floor geometry to remain distinct from existing and sibling scenes under all eight square symmetries.

Review reconciliation corrected three named calibration targets and the first case's left-order description, then pinned those descriptions to the encoded clues. The records remain `humanPlaytested: false`. Physical-device use, TalkBack, perceived variety, and human difficulty calibration remain open in `HUMAN_TODO.md` q-8.

## Master and Grandmaster studies — PR #229

The stacked candidate adds nine additive revision-1 studies across Nonogram, Binary, Futoshiki, Light Up, Tents, Aquarium, Network, Trail, and Bridges. All Master and Grandmaster labels are provisional. Independent family oracles and native solvers agree on one solution per record, while catalogue tests preserve existing IDs and revisions.

A focused Chromium workflow loads representative 15×15, 9×9, and 7×7 boards at phone and desktop widths. It checks finite control geometry, center-point-to-cell mapping, horizontal overflow, and actual state mutation plus undo through visible Nonogram, Bridges, and Light Up controls. This is simulated-browser evidence, not physical touch, TalkBack, comfort, performance, or human difficulty calibration. Those gates remain open in `HUMAN_TODO.md` q-8.

Neither candidate changes an existing published puzzle definition. Neither section is evidence of deployment or store publication.
