# Development priorities

See ../ROADMAP.md for the active product roadmap and STATE.md for current measured status.
The first follow-up is a human-playtested, carefully curated casebook. Keep account sync,
monetization and native store packaging separate from the browser launch.

API note: `C.solve(p, state)` is not a general state-constrained API across every family.
Aquarium/network currently solve the definition independently of the supplied state; all current
production callers use definition-only solving. Do not build a future hint or correctness feature
on state-constrained behavior without implementing and testing that contract first.
