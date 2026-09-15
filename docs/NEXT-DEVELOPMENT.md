# Development priorities

See ../ROADMAP.md for the active product roadmap and STATE.md for current measured status.
The first follow-up is a human-playtested, carefully curated casebook. Keep account sync,
monetization and native store packaging separate from the browser launch.

Solver API: use `C.solveDefinition(p, limit, maxNodes)` for catalogue, authoring and
uniqueness work. Use `C.solveState(p, state, limit, maxNodes)` only when
`C.solverCapabilities(p).stateConstraints` is true. Bridges, Aquarium and Network fail closed because
their zero-valued initial states do not encode an unknown constraint. Scene and Dossier fail closed
because their current solvers do not constrain the final accusation. See
[SOLVER-CONTRACT.md](SOLVER-CONTRACT.md).
