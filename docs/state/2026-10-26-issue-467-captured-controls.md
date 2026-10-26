# Issue #467 follow-up: capture adapter identity and route controls

## Scope

This follow-up addresses two review advisories on the memory-only Castle escape adapter. The
adapter now captures its room title and revision when constructed, alongside its room ID and
handle scope. Later caller mutation of the source object cannot make a view report another
revision while still issuing handles for the original one.

Host views now include their issued `routeToken`. `roomMarkup()` and `inspectorMarkup()` add that
token as an escaped `data-escape-route` attribute to rendered object buttons, action buttons,
answer inputs and note buttons. `createEscapeHost().act()` accepts the exact current token in the
numeric form returned by `enter()` or the string form exposed by a browser `dataset`. Standalone
adapter views contain no route token, so their list and inspector markup remain usable without a
host route binding.

No room data, published identity, authoring/public schema, persistence format, database, bundle
entry mount, Castle dispatch integration, focus handling or byte budget changed. This binding
gives a future dispatcher a captured token to submit; it does not claim that escape rooms are
mounted or wired into the shipped Castle entry. The previous #467 handoff remains at
[`2026-10-26-issue-467-castle-escape-adapter.md`](2026-10-26-issue-467-castle-escape-adapter.md).

## Evidence

- `node tests/castle-escape-room.test.mjs` passes all eight tests. The existing breadth-first
  assertion still visits and checks all 648 reachable room states, including equivalent action
  handles in list and inspector markup. New cases mutate source title/revision after adapter
  creation and prove the reported metadata/handles stay fixed.
- The A/B/A regression extracts tokens and action values from emitted A markup, returns through B
  to A, submits the old rendered control data to `host.act()` and observes `stale`; it then submits
  the current A control's rendered data and observes the action apply. It also verifies that object,
  answer-input, action and note controls carry the issued token.
- The standalone adapter test confirms its list and inspector markup omit `data-escape-route`.
- `node tests/escape-session.test.cjs`, Prettier checks and `git diff --check` pass.

## Not verified / remaining gates

The focused Node suites exercise emitted markup tokens and host dispatch, but not a live browser DOM,
actual Castle event delegation, focus return, screen readers or physical devices. Full `npm run
verify`, emitted-size inspection and hosted exact-head CI remain for the owning PR. `HUMAN_TODO.md`
remains authoritative; this change does not close any device, shipped-integration, persistence or
owner-acceptance gate.
