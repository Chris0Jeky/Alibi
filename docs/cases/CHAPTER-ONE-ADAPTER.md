# Chapter I authoring diagnostic (#445)

Run `node tools/case-chapter-one.cjs` from this checkout with Node 22+. It prints JSON
to stdout and writes no files. The envelope is explicitly `publishable: false`: the nested
`definition` is a diagnostic projection, not a new playable case, import or save format.
The receipt binds the chapter ID, published version, projection and exact input bytes to
SHA-256, without timestamps or machine paths. Repeated runs on identical bytes are identical.
Line-ending differences intentionally change source hashes.

## Source mapping

The receipt includes these file/ID references. Record text and titles are copied verbatim.
No canonical module, published ID, version, completion predicate or continuation text is edited.

| Diagnostic record / step | Published authority | Meaning and limit |
| --- | --- | --- |
| `maintenance` / `clock` | `src/castle/content.mjs#evidence.maintenance`; `puzzles.mjs#shelves`; `engine.mjs#check(shelves)` | Slip collected after shelves: station clock seventeen minutes fast. |
| `ticket` / `clock` | `content.mjs#evidence.ticket`; `puzzles.mjs#clock`; `engine.mjs#check(clock)` | Ticket 21:17, corrected departure 21:00; not arrival. Requires the maintenance premise as well as the ticket. |
| `path` / `route` | `content.mjs#evidence.path`; `puzzles.mjs#route`; `engine.mjs#routeTime,check(route)` | S-B-O-T takes 2+3+2 = 7 stipulated minutes. Possible 21:07 arrival is strictly before the calibrated 21:10 bell. |
| `presence-established` / `inference` | `puzzles.mjs#inference.rules,after`; `engine.mjs#check(inference)`; `investigation.mjs#labelQuestions.ur.transfer` | Not established: no witness establishes that Finch took the feasible route. The accepted runtime answer remains `possible-not-proven`. |

All short module names in this table are under `src/castle/`. The generated mapping uses
full paths. `journey-feasible` is a diagnostic claim ID, not a saved completion or the proposed
namespaced continuation entitlement. `margin` is collected by the real runtime replay but its
testimony is not used as a premise. No Chapter II attribution, proposed record or later timing
is emitted; `docs/castle/CONTINUATION.md` is hashed as a guardrail, never copied into records.

## Contract comparison

The tool calls the existing `validateCase` without changing it. Its ancestry/citation and
duplicate/cycle checks still apply. A separate, fixed Chapter I premise check requires the
clock claim to cite maintenance and ticket, and the journey and presence claims to cite all
three records. This detects omitted premises, including a weaker alternative evidence bundle;
it is not a general semantic entailment checker. Diagnostic claim labels are adapter copy,
not new published story. The clock and journey claims reuse the published text.

The receipt also calls `validateAuthoredCollection` on the existing nine inspectable objects.
These use schema 1, room-open visibility and inspect/note actions; none has a collected-record
ID. Passing that validator does not establish a ticket, solve a puzzle or grant evidence.
Conversely, the projected case records are not inspectable objects. Both validators remain
independent and authoritative for their original inputs.

The `mismatches` array documents every deliberate projection:

- The projection's revision copies castle version 1. Published records have no individual
  content revisions; no new revision or save contract is asserted.
- Each prose pair repeats the one published string. This does not supply authored story-off copy.
- A published evidence question followed by the puzzle's two hints fills the diagnostic ladder.
  It is not a claim that Chapter I already has an authored three-level hint ladder.
- The derived ticket is classified as a model, retaining its published kind in the mapping.
  It is not independent observation or new testimony.
- The diagnostic clock-to-route ancestry makes premises visible. Runtime route access can
  precede clock completion and accepts gate OR bridges OR magic. Evidence appears after its
  existing completion, rather than on entry to a generic step. The adapter replays all three
  actual access chains through `complete` and `validate`; it does not replace those rules.
- Numeric completion predicates remain in the existing engine, as decided below.

Malformed projections, missing/duplicate mapped source records, rejected published worked
answers, or a runtime inference accepting certain presence/lateness fail with a diagnostic.
Known representation mismatches are reported with source references, never hidden by a success
claim. The CLI's zero exit status means the diagnostic ran, not that the case is publishable.

## ADR: keep bounded clock and route predicates outside postern-case-1

Decision: retain the generic JSON contract unchanged. Its missing concept is a bounded numeric
model relating a calibrated timestamp to a no-revisit weighted route and a strict deadline.
It can express authored verdicts and sufficient citation sets, but cannot calculate or validate
those numeric answers. AND ancestry also cannot express the existing OR access keys faithfully.

Encoding Chapter I's `check`, `available` or `routeTime` as arbitrary expressions would introduce
a second execution authority. Reject that option. This adapter instead cites published records,
checks a fixed premise set, invokes the existing pure engine and reports the mismatch. Any future
declarative numeric model needs its own narrow contract and ADR; it is not added here.

#51 retains player evidence-board UX, #53 owns new story and #442 owns production integration.
There is no runtime route, save owner, generated production asset or deployment in this change.
Physical phone, TalkBack and editorial acceptance remain in `HUMAN_TODO.md` (including q-7).
