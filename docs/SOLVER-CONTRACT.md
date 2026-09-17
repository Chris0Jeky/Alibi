# Solver contract

Alibi exposes two deliberate solver entry points. New code should not infer one from the optional
second argument of the legacy `solve` function.

## Definition solving

`AlibiCore.solveDefinition(puzzle, limit?, maxNodes?)` searches the complete definition. It is the
API for catalogue validation, authoring, uniqueness checks and generation. It ignores no player
state because it accepts none. The result remains `{ solutions, nodes }`, with semantic
deduplication owned by the family solver.

## State-constrained solving

`AlibiCore.solveState(puzzle, state, limit?, maxNodes?)` validates both the definition and saved
state before searching. It may only be used when `AlibiCore.solverCapabilities(puzzle).stateConstraints`
is true. A rejected or malformed state fails before search; callers must not silently fall back to a
definition solve.

Bridges, Aquarium and Network are deliberately **definition-only**. Their current saved zero values
are valid player choices as well as the initial representation: no bridge, an empty tank level or an
unrotated tile. None has an “unknown/unconstrained” sentinel. Treating an initial save as a partial
constraint would therefore either force every zero or silently ignore committed zero choices.

Scene and Dossier are also definition-only for state solving. Their current search routines constrain
placements or matrix marks but do not constrain the decisive final accusation. Advertising full state
support would let a solved board with a wrong accusation appear satisfiable. `solveState` rejects all
five families until versioned constraint representations and complete search semantics are designed.

## Compatibility API

`AlibiCore.solve(puzzle, state?, limit?, maxNodes?)` remains available for the existing engine
implementation and compatibility tests. New catalogue/authoring code should call
`solveDefinition`; new hint or correctness code should call `solveState` after checking
capabilities. This keeps a future engine extension from accidentally depending on a family that
ignores state.

## Required tests for a new state-capable family

A family may advertise state constraints only after tests prove:

1. Initial/unknown values are distinguishable from committed player choices.
2. Correct partial state narrows solutions without mutating the input.
3. Contradictory state returns no solution rather than reverting to definition-only search.
4. Malformed and future-version state is rejected by the family validator.
5. Search budgets and semantic solution deduplication remain bounded.

This contract does not change puzzle rules, published definitions or saved-state schemas.
