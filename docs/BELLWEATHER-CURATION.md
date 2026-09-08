# Bellweather and the bridge charts

This release adds fourteen definitions without changing any of the 102 published definitions.
All new IDs begin at revision 1. Solver uniqueness proves the rules, not human enjoyment or
difficulty; the labels remain estimates until player testing.

## The Last Light at Bellweather

One non-graphic homicide, five named characters, six timed records. Three witness puzzles,
two logic grids and one floor plan. The earlier draft's conflicting murderers and logbook
carriers were rejected before publication. An earlier access scene was replaced with the fog
bell deduction because the scene engine's accusation would falsely call earlier access murder.

| Time | Record | Established answer (spoilers) |
| --- | --- | --- |
| 19:10 | Before the fog bell | Rosa took the clapper; exactly four accounts are true. |
| 19:20 | Accounts before the squall | Iris removed the black logbook; exactly two accounts are true. |
| 19:30 | The logbook trail | The two inventories place the black logbook with Iris. |
| 19:40 | The dark lantern | Theo is the only suspect sharing Maren's room at the fatal blackout. |
| 20:10 | The moved lens key | Theo removed the lens key; exactly two accounts are true. |
| 20:30 | The later inventory | Elias now carries the key. This question explicitly asks about later possession. |

After the blackout, the living four-person cast includes Rosa rather than Maren. The casebook
shows each established fact only after that chapter is solved; the ending requires all six.
Chapters are available in any order. Introductory prose does not reveal the answers.

## Tidal bridges

Eight original charts with distinct hand-selected geometry. The initial generated proposals
were revised to remove cramped adjacent islands and sparsely connected shapes. Published
layouts leave at least one grid interval between islands, so 44px targets remain separate at
phone width. The 5x5 opening teaches a forced double bridge; later 7x7 and 9x9 charts introduce
larger connected networks and potential crossing routes.

The search checks exact degree, crossing exclusion and whole-network connectivity. It has
a node budget and reports exhaustion explicitly. A separate brute-force test oracle checks
small unique, ambiguous, impossible, crossing and disconnected fixtures. Reasoning hints use
visible counts and available route capacities, never the stored answer. Explicit reveals are
a different, labelled action and count toward the saved reveal total.

The eight published solutions took 5, 11, 13, 14, 18, 47, 54 and 17 solver nodes at curation.
Node counts are evidence of bounded verification, not a difficulty metric.
