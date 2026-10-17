# Sources and what they actually support

Checked 27 September 2026. Selection is purposeful, not exhaustive. These are primary developer, standards or research sources. Game marketing establishes described mechanics, not representative popularity or causal proof of what players enjoy. All proposed applications below are our design inferences.

| ID | Source | Supported observation | Proposed application / limit |
| --- | --- | --- | --- |
| S1 | [Mobius Digital: Outer Wilds](https://www.mobiusdigitalgames.com/outer-wilds.html) | A handcrafted mystery with changing locations, exploration tools and a time-loop setting. | Let learning change what a player can notice. Do not copy its world, enforce repeated travel or infer that all players enjoy timers. |
| S2 | [Rundisc: Chants of Sennaar](https://www.rundisc.io/chants-of-sennaar/) | Environmental observation and deciphering languages connect the tower's peoples. | Design a small original symbol grammar whose meaning is inferred from use, not a substitution worksheet. Do not copy glyphs, cultures or puzzles. |
| S3 | [Dogubomb / Raw Fury: Blue Prince](https://www.blueprincegame.com/) | Players draft rooms; the floor plan resets while some progress persists. | Prototype choosing investigative routes, but retain Wrenmere's established coherent geography. Room resets are not a default for a calm returnable club. |
| S4 | [Steel Crate: Keep Talking and Nobody Explodes](https://keeptalkinggame.com/) and [remote-play guide](https://keeptalkinggame.com/how-to-play-remotely/) | Different participants have complementary information; spoken communication joins it. | First test two printable dossiers with no server. A useful conversation does not require a proprietary multiplayer stack. Timed stress is optional, not inherited. |
| S5 | [inkle: ink](https://www.inklestudios.com/ink/) and [web tutorial](https://www.inklestudios.com/ink/web-tutorial/) | Narrative authoring has a text source, interactive preview, warnings and export; knots/diverts express flow. | Give case authors a validate-preview-review loop. Do not import a narrative engine until the existing content model demonstrably cannot express a required case. |
| S6 | [Ink & Switch: Local-first software](https://www.inkandswitch.com/essay/local-first/) | Local-first research emphasizes ownership, offline work and collaboration. | Retain player-owned saves. Future collaboration needs explicit conflict semantics; CRDT text merging is not permission to merge contradictory puzzle boards. |
| S7 | [MDN: WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) | WebGPU provides graphics/compute and is marked limited availability, with secure-context constraints. | Optional, capability-tested visual/compute experiments only. No mandatory WebGPU route, broad browser-support claim or benchmark extrapolation. |
| S8 | [W3C: What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) and [G219](https://www.w3.org/WAI/WCAG22/Techniques/general/G219) | WCAG 2.2 addresses target spacing/sizing and alternatives to dragging. | Evidence links, timeline placement and object arrangement need click/keyboard equivalents. |
| S9 | [W3C: Target Size Enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced) | The 44 CSS-pixel enhanced target criterion is AAA, not the general AA minimum. | Retain the product's 44px policy without mislabelling the standard. Physical accessibility still needs device evidence. |

## Repository evidence

Use commit-pinned source when checking these statements. Relative paths refer to the baseline named in README.

- `README.md`, `content/official-packs.json`: 510 built-in puzzles, 13 families, five casebooks; upcoming PR #427's 60 studies are not part of that baseline.
- `src/castle/content.mjs`, `engine.mjs`, `investigation.mjs`, `evidence-view.mjs`: Chapter I, collected evidence, eight revisable hypotheses and bounded record comparison already exist. A new generic evidence-board issue would duplicate #51.
- `docs/castle/CONTINUATION.md`, issues #53/#54/#76–#78: continuation contracts and proof gaps are already specified. They are not playable chapters.
- `src/castle/authoring-validation-entry.mjs`: build-time authored-object validation exists. Case-level dependency/citation authoring is a different proposed boundary, not a replacement object validator.
- `tools/build.cjs`, issue #389: declared content identity covers the initial source, while deferred definitions have separate payload checks. Completing that identity is a bounded first delivery improvement.
- `docs/design/POSTERN-REDESIGN-BRIEF.md`, `HUMAN_TODO.md`: approved naming/setting, coherent navigation, quiet presentation and data-first difficulty calibration. Do not reopen resolved naming choices.
- `.agent-harness/tier.json`, `AGENTS.md`: preserve existing save domains, independent review and exact-head acceptance.

## Claims deliberately not made

No current market-share, revenue, retention, willingness-to-pay or universally loved-mechanic ranking is inferred. No player interviews were conducted in this pass. Publisher praise is not independent reception evidence. No current API price or model quality claim supports an AI dependency. The prior requested Deep Research report remains an input to reconcile when actually available.

## Further corroboration worth commissioning

A bounded reception study should sample positive, negative and mixed reviews across selected detective, daily-puzzle, escape-room and linguistic games; record platform, date, selection method and spoiler policy; code friction and delight separately; retain contrary examples. Compare new and returning Alibi players rather than assuming Steam reviewers represent them. Developer postmortems should test the specific hypotheses of hint timing, route repetition and authoring cost. None of this should delay a small, clearly labelled prototype.
