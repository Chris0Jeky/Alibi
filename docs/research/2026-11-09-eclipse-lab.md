# Eclipse Lab research and curation

This is an experimental group of finite, offline logic puzzles. It does not change the existing
Sun & Moon family, its published puzzle definitions, or its save identities. The eight levels per
mode are provisional: mechanical validation and a path through the implemented reasoning rules do
not establish that people find a puzzle fair, enjoyable, or appropriately ordered. Four 4×4
boards introduce each mode before four 6×6 boards; no precise difficulty ranking is claimed.

## Sources and rules

The [Binairo mathematical formulation](https://matmod.ch/lpl/PDF/binairo.pdf) describes balanced
binary lines, no triples, and distinct rows and columns. The existing Alibi binary family follows
those three rules. [LinkedIn's Tango instructions](https://www.linkedin.com/help/linkedin/answer/a6861672/)
describe balanced lines, no triples, and same/opposite links; they do not specify distinct lines.
Constellation and Eclipse explicitly keep Alibi's distinct-line rule and therefore are not presented
as a reproduction of Tango. These references describe established components, not proof of novelty
or independent invention of the following combinations.

- **Constellation:** balanced distinct lines, no triples, and adjacent same/opposite links.
- **Eclipse:** Constellation plus overlapping 2×2 windows showing the number of suns.
- **Harbour:** explicit row, column and 2×2 window sun counts; no implicit balance, no-triples or
  distinct-line rule. This explores crossing sums rather than classic binary line patterns.
- **Switchback:** balanced lines and the number of adjacent symbol changes in each line; no
  no-triples or distinct-line rule. This explores runs and transitions.

Mirror Ledger, two linked boards, is deferred because simultaneous board comparison and cell-level
accessibility need particular phone testing. Movable-mask experiments are deferred until placement,
undo, and equivalent-mask semantics can be tested independently; neither is represented as a
completed design here.

## Reproducibility and evidence

`tools/curation/eclipse-candidates.mjs` uses a deterministic seed to author candidate boards,
removes clues while retaining uniqueness, adds anchors when local deductions stall, and emits the
checked-in content. It rejects candidate solution grids equivalent under rotation, reflection or
symbol inversion within a mode and size. That is a content-diversity filter, not a change to what
counts as a distinct solution. Review generated diffs before replacing any previously shipped ID.

The runtime solver enumerates candidate row and column patterns, prunes contradictions, stops after
at most two boards and has a 50,000-node ceiling. Exhaustion is reported separately from the number
of solutions; it is never a uniqueness certificate. Its validator bounds board sizes and data shape.
An independent test oracle builds whole rows and checks constraints directly. It finds one board for
each of the 32 levels, checks the recorded answer, checks the first level of every mode becomes
nonunique when its defining new clues are removed, and tests the symmetry filter. A test also follows
the model's local hints to completion for every board without reading its recorded answer. This
establishes a path for the implemented rules, not a claim about human-solving difficulty or insight.

In one Node run, the 16 6×6 boards took 215 ms combined; the slowest took 49.3 ms and the maximum
was 832 nodes. These are environment-specific measurements, not phone or assistive-technology
performance results. The model has no UI, persistence, collection, or network interface; integration
must independently test touch and keyboard controls, screen-reader labels, storage failures, offline
behaviour, and explicit feedback consent. Existing Voices ratings accept official puzzle subjects;
experimental ratings require their own supported contract or clearly described local handling.
