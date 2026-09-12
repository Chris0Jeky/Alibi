# Interaction audit and preserved boundaries

| Journey | Implemented contract | Remaining work |
| --- | --- | --- |
| First visit | Explicit preview; one gentle puzzle before artwork; no account wall | Observe comprehension and first-move time |
| Return | Latest unfinished canonical puzzle or supported Games Room run; definition/undo retained | Device recovery matrix |
| Find | Human family names, URL filters, draft commit/cancel, no-results recovery, bounded pagination | Sort/multiselect only after evidence |
| Game entry/exit | Existing engines/save owner; return URL/count/focus | Engine-level mobile toolbars, hints, completion |
| Explore | Room cards, equivalent optional plan, observed state and sheet | Canonical chapter integration through existing schema |
| Reason | Revisit notebook evidence, recoverable wrong answers, spoiler-labelled hint ladder | Content QA and authored cases |
| Comfort | Existing appearance/motion/text/timer/feedback handlers | Physical screen reader, IME and safe-area checks |
| Storage failure | Session-only warning and existing export/settings | Quota, eviction, restore and migration |
| Network/media failure | Readable text/actions, decode fallback, bounded load and retry/classic exit | Hosted/offline tests and low-memory device checks |

## Iterations

Removed duplicated play CTAs; converted finder cards to compact rows; moved refinements into a draft-based modal; replaced inconsistent navigation glyphs with SVGs; made three engraved room cards the primary exploration path; retained an equivalent plan; added initial/return sheet focus and same-URL apply; preserved actions after image failure; added dock focus visibility and short-landscape/keyboard handling.

A test initially raced asynchronous route rendering. It now waits for the committed chip state, not a weaker result. Production verification exposed duplicated script-loading code and inappropriate core precaching; delivery now reuses the existing bounded loader and caches an explicitly entered optional pack. The main/core production caps were not increased. A positional build-config test was corrected to parse its named static assignment. Test-side polling uses CDP evaluation rather than requiring page-side unsafe-eval; production CSP is unchanged.

## Ownership

No new localStorage/IndexedDB writer, puzzle schema, result authority, catalogue replacement or telemetry integration. Existing bridge methods execute play/preferences. Future/unreadable Games Room records are omitted from the continuation projection, never repaired or erased. Navigation restores view state, not a second game state.

The three-room study lives only in the controller lifetime and is labelled session-only. It never modifies or unlocks the canonical castle. Ordinary puzzles remain directly accessible.
