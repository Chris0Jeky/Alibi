# Architecture decisions and implementation seams

Status: proposed delivery architecture under #436, constrained by the inspected baseline. This is an incremental extension, not a rewrite or an approved production release.

## Layering

```
reviewed case source + provenance + explicit revision
             |
     bounded authoring validator
     /           |             \
structural    semantic model    editorial / playtest review
receipt       or solver tests   (not automated away)
     \           |             /
      isolated playable authoring preview
                    |
       reviewed adapter to existing activity
                    |
 existing route / validation worker / save owner / backup
                    |
 optional collection delivery through #433 and native #129
```

The first workbench consumes data-only authored cases. It produces diagnostics and a self-contained, offline preview for review. It is not an arbitrary plugin host, a live authoring service, a new player save domain or an official-pack importer. Its tests must be invoked by the existing root Node test glob.

## ADR 1: evidence and access are different graphs

A step's `requires` edges express AND prerequisites. Authored records belong to a step and become available there. A claim references acceptable evidence bundles, separately from its authored classification. Acyclic prerequisites and valid references establish structural playability, **not logical entailment**. A false conclusion with well-formed citations still requires an independent semantic test/editorial review.

References used by a question, hint or worked explanation must be in the current step or its prerequisite ancestors. Sibling or later records cannot be required accidentally. The UI exposes only the active step and already available records; shipping offline answers is not an anti-cheat or secrecy guarantee against source inspection.

## ADR 2: bounded data before a public SDK

Version the experimental envelope as `postern-case-1`, with stable case ID and positive revision. Initial bounds: 256 KiB UTF-8 input, 64 records, 16 steps, 64 claims overall, 8 alternative evidence bundles per claim, 8 records per bundle, 1,800 characters per prose field and 120 per title. These are proposed authoring limits, not changes to production imports or payload ceilings.

Reject unknown fields, duplicate identifiers, malformed types, invalid references, cycles and hidden-premise requirements. Require story-on and story-off text. Keep hints explicitly separate from worked answers. Do not evaluate JavaScript, interpolate HTML or accept arbitrary asset/network URLs from a pack. The authoritative contract is the implemented validator and its negative tests; document any divergence before publishing.

## ADR 3: preview without player-state authority

A local CLI validates a selected JSON file and creates an HTML preview. It uses semantic controls, visible source labels, source-linked answer choices, staged hints and an explicit worked-answer action. It must work without a server or external requests after generation. Use text nodes for authored content and a restrictive CSP. No analytics, localStorage, IndexedDB, account or host globals.

Refreshing resets the preview; the page must say so. Production continuity is not implemented by pretending this is a durable save. A future host adapter must reuse an existing domain and prove revision pinning, stale-tab ownership, backup and update lifecycle before release.

## ADR 4: determinism before generative presentation

Keep authored records, solution rules and rewards deterministic. AI may propose drafts or editorial alternatives in a review-only authoring lane; accepted text becomes static, versioned content. A speculative conversational character can paraphrase only already disclosed records, with deterministic fallback and no authority over truth, unlocks or saves. No network/model dependency in the first slice.

## ADR 5: content identity covers every shipped official definition

Complete #389's manifest-identity boundary across initial and deferred sources, in declared deterministic order and with unambiguous framing. Keep separate per-file payload hashes. A changed source must change the aggregate identity; concatenation ambiguity, ignored deferred changes and reordered partitions need tests. The aggregate is an identity signal, not proof of trust or a reason to migrate saves. No numeric budget increase and no change to puzzle ID/revision rules.

## ADR 6: social structure before network infrastructure

Two complementary paper or offline dossiers are the first co-op prototype (source S4). Measure whether participants exchange useful information before implementing rooms, WebRTC or shared state. Existing optional rooms may later supply transport. Text notes and game actions need different conflict policies; never merge two inconsistent board histories blindly. No public UGC or chat service without moderation, abuse and retention work.

## Production-ready versus experimental

| Near-term fit | Conditional experiment | Defer until evidence |
| --- | --- | --- |
| Pure reducers, bounded validators, authoring CLI, static JSON, worker validation | Small canvas/object manipulation with full semantic controls | Required WebGPU, WebXR or camera permissions |
| Existing PWA/offline/CAS infrastructure | Optional shader/lighting layer with static fallback | Runtime procedural mysteries without proof and curation |
| Captioned authored audio and text | Complementary co-op dossiers, later existing-room transport | Autonomous AI witness inventing clues |
| Existing source/revision/build receipts | Read-only local playtest receipt export | Global competitive scoring over shipped answers |

WebGPU is still limited-availability in the checked MDN source (S7). No source establishes that it improves this app's frame time. Profile actual scenes and target devices before adoption. Native packaging remains #120 rather than a parallel game-engine migration.

## Integration review checklist

An adapter PR must name its route owner, data source, activity disposer, save authority, import validator, offline installation boundary, pending/error states, migration policy and measured byte impact. It must retain answer-free hints, story-off equivalence, reduced motion, non-colour state cues and non-drag controls. The preview itself cannot certify those host integrations.
