# Escape-room rehearsal specification

Program #460; foundation #461/#464/#465; first content #466. Baseline tree `073abac9117c3704953453f84d3e74372ccc5bf6`, upstream commit `a3c6ad9`.

## Intent and decision

The owner requested the same autonomous research-to-PR pass, now for many high-quality escape rooms. This first increment supports stateful room authorship and tests two original rooms before production integration. It does not reinterpret Archive Heist crate puzzles as an escape-room system.

Alternatives: expand Castle's inspect/note format in place; force stateful mechanisms into the evidence-case DAG; or rehearse a bounded state model outside the host. Choose the third. It protects published sources and reveals what a later #47/#442 adapter actually needs. The cost is a deliberately separate experimental preview, not a delivered in-app room. No new production save owner or framework.

## Data contract

`postern-escape-1` JSON contains exactly format, id, revision, title, provenance, intro, ending, solution, variables, objects, actions, goal. Revision is a positive safe integer. Prose is a pair of storyOn/storyOff strings. Every source string renders as text, never HTML.

Variables: id, values (distinct tokens), initial. Objects: id, title, when (conjunctive state equality), text (prose), observations (ordered condition/text pairs). Actions: id, object, label, when (availability), check (success conditions), set (assignments), input (boolean), answer (normalized string or null), hints (three prose pairs, orientation/constraint/method). The separate check prevents a UI from revealing the right mechanism setup merely by hiding the attempt button. Goal is a nonempty conjunction; initially completed rooms are rejected.

Bounds: 262144 UTF-8 source bytes; 8 variables; 2..6 values per variable; total Cartesian product <=4096; 16 objects; 48 actions; 8 conditional observations per object; 1800 UTF-16 code units per prose string; 120 per title/label; 64 per answer. Token IDs match `[a-z][a-z0-9-]{0,31}`. IDs are unique across variables, objects and actions. Conditions/assignments name only declared variables and values. Nonempty assignments are required. Unknown fields, sparse arrays, duplicates, malformed or future formats fail. No arbitrary predicates, scripts, URLs or plugin execution.

An input action accepts only strings of <=64 code units whose trimmed uppercase value equals the authored normalized answer. Other values are refused without mutation. No fuzzy answers or automatic numeric conversion. An input-free action takes null. Wrong setup returns a generic mechanism failure; wrong answer returns an incorrect result. A completed room is terminal. Returning to an earlier state is explicit undo, outside the state transition API.

## APIs and proof boundary

`tools/escape-state.cjs` exports validate(definition), initial(definition), transition(definition,state,actionId,input), project(definition,state,storyOn). Consumers validate definitions once; state inputs are checked on every public transition/projection. Project reads neither answer/check/set nor solution and returns only visible observations, action labels/input flags and hints. The raw offline file still contains answers; this is a player-surface boundary, not secrecy against inspection.

`tools/escape-authoring.cjs` exports parse(source), read(path), analyze(definition,options). File read is bounded, regular-file-only, nonblocking and strict UTF-8. Receipts bind the complete raw source bytes with SHA-256. Graph analysis exhaustively explores successful authored transitions, treating rejected attempts as no-ops. Reverse reachability from goals identifies every reachable state from which completion is impossible. Retain a shortest solution and a shortest softlock witness; report unreachable actions separately. A proof-cap interruption returns inconclusive and null softlock count, never a success. Default caps: 4096 states and 196608 action edges. No-op actions count toward the edge budget.

This proves the finite model only. It does not prove clue sufficiency, uniqueness of natural-language answers, minimal player effort, accessibility or enjoyment. #468 owns clue derivations; #443 remains the general semantic convention. Source-only hints cannot be semantically certified without editorial review.

## Preview and host boundary

A later separate PR adds two source rooms and a self-contained memory-only HTML preview. Native object cards/actions, visible changed observations, wrong-input retention, bounded undo, restart confirmation, story switching and explicit solution disclosure. No storage, analytics, network, runtime dependencies or production routes. Hash-only CSP and escaped embedded data. Refresh resets the room and says so.

Production promotion must name the existing save authority, revision migration/refusal, CAS, lifecycle disposal, imports/backups, optional delivery (#433) and actual byte impact. Current Castle objects/IDs, Wrenmere chronology and all Archive levels remain untouched. Independent review and exact-head CI remain merge gates; physical-device and human acceptance are not synthesized.
