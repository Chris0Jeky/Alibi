# Block Cabinet exact-cap persistence qualification (#404)

A separate 500-placement fixture (`CAP500-0`) now reaches the unchanged
`blockCabinet.maxMoves` limit through 500 legal `E.move` transitions and remains
playable at turn 500. The regression compares the cold `E.replay` result with an
independent fold through the engine, verifies one execution per move, and confirms
a repeated replay read reuses the cache. The earlier 268-move terminal fixture is
unchanged.

The real Club lifecycle harness validates all 500 moves on cold restore and uses
the cached replay when opening the room. Undo saves the 499-move prefix plus the
last action in `redo`; a fresh Club session validates that active history and redo
continuation, then redo restores turn 500. Operation counts establish the replay
and persistence paths, not elapsed-time performance.

The test inspects the actual save bytes written by that redo and starts another
fresh session from them. All 500 actions and the empty redo list survive, cold
validation executes 500 transitions, and reopening the room reuses that result.

Source inspection shows the replay cache is one replaceable `blockReplay` entry:
one seed, at most 500 encoded moves, and one resulting game state. That state has
one 64-cell board, its tray, small last-clear row/column lists, and scalar metadata.
The implementation does not retain a state snapshot for every history prefix, and
replay returns a copy of the cached state. This is a structural bound only; it is
not a measured heap-byte count, device memory result, or phone latency result.

Focused exact-cap and prior long-replay tests pass. The 500-move cap, production
code, replay budgets, save format, and 268-move fixture are unchanged. #404 remains
open for constrained-device and physical-phone qualification before any cap
increase. This work does not establish arbitrary 1,000-move replay support or
physical-device acceptance; `HUMAN_TODO.md` remains authoritative for owner
acceptance.
