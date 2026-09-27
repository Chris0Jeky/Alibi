# Opportunity atlas: 30 original development hypotheses

These are proposals, not a claim that all should ship or that players have voted for them. Source references S1–S9 motivate broad patterns; each Alibi application is our own design. Reuse existing issue ownership in ROADMAP. M/L/R describe relative implementation uncertainty, not promised delivery time.

| # | Concept and player loop | Existing seam | Effort / fit | Failure mode / acceptance focus |
| --- | --- | --- | --- | --- |
| 01 | **Evidence verdicts.** Classify claims as supported, contradicted or not established and cite the smallest sufficient source set. | Existing notebook + case workbench | M / solo; co-op discussion | Avoid grading personality or accepting citation spam. |
| 02 | **Interval desk.** Place witness windows and travel bounds, then find possible overlaps rather than one invented timestamp. | Route model; #77 | M / solo/co-op | Separate feasible from observed; preserve open endpoints. |
| 03 | **Two editions of a map.** Align stable landmarks across historical drawings to discover what changed. | Estate map; #53 | M / solo | An omission proves a difference, not its motive. |
| 04 | **Small living lexicon.** Infer an original symbol grammar from signs, exchanges and object use. | New bounded data-only prototype | R / solo/co-op | Unseen composition tests learning; do not copy an existing fictional script. |
| 05 | **The impossible itinerary.** Find the minimal pair of statements that cannot both be true. | Scene family + source cards | M / solo | Accept all justified minimal explanations, not one arbitrary order. |
| 06 | **Instrument calibration.** Discover an instrument offset or bias before interpreting its measurements. | Observatory methods | S/M / solo | Do not silently change physical rules or reuse Chapter I as a reskin. |
| 07 | **Planned, installed, observed.** Compare a design, work log and observation of a warning network. | Network family; #76 | M / solo/co-op | Three evidence layers remain distinct. |
| 08 | **Object biography.** Reconstruct ownership, repair and reuse from labels, wear and accession records. | Museum; #50 | M / solo | Provenance gaps remain gaps; no invented historical certainty. |
| 09 | **Counterexample cabinet.** Test a proposed explanation by constructing a world compatible with the clues where it fails. | Bounded semantic model | M / solo | A model has explicit assumptions and finite bounds. |
| 10 | **Researcher and fieldworker.** Give two players complementary source packs and require a shared explanation. | Paper/offline first, rooms later | R / co-op; solo combined dossier | Do not add a server before the conversation is useful. |
| 11 | **Archivist relay.** Exchange a spoiler-safe checkpoint describing open questions rather than solutions. | Future case exchange contract | M / asynchronous co-op | No private notes or hidden answer in a share URL. |
| 12 | **Museum method trail.** Learn an invariant at an exhibit, then apply it in a differently represented room. | #50/#55 | M / solo | Genuine transfer, not a history quiz plus XP. |
| 13 | **Repairable mechanism.** Adjust gears, shutters or counterweights using explicit discrete constraints. | New small reducer, semantic control list | R / solo | Physics spectacle must not introduce unstable solutions. |
| 14 | **Sound with a transcript.** Compare rhythms or call patterns with a complete visual/text representation. | #48/#52 | M / solo/co-op | No hearing-only answer; human listening is required. |
| 15 | **The marginalia layer.** Compare annotations by date and source reliability without declaring an author from handwriting alone. | #53 / source comparison | S/M / solo | Separate attribution confidence from fact. |
| 16 | **A quiet daily dossier.** Offer one complete short investigation with an accessible archive. | Case registry and optional collection index | M / solo | No streak punishment, artificial scarcity or forced expiry. |
| 17 | **Case anthology meta.** Several solved local cases expose a larger question through shared objects. | Versioned case/dependency graph | L / solo/community | Each case has its own satisfying conclusion; no accidental spoiler previews. |
| 18 | **Optional restoration choices.** Let a deduction change a room decoration or exhibition treatment. | #29/#78 | M / solo | Cosmetics never grant truth or remove earned tools. |
| 19 | **A return letter.** Summarise collected records and the last unresolved question. | Read-only journal projection | M / solo | Do not invent notes or disclose unseen clues. |
| 20 | **Creator lint and preview.** Show broken dependencies, inaccessible citations and incompatible revisions before export. | Authoring workbench | M / creators | Diagnostics are not a semantic proof badge. |
| 21 | **Counterfactual author bench.** Perturb one clue and inspect whether the intended answer remains justified. | Offline authoring tests | M / creators | Retain changed assumptions and all counterexamples. |
| 22 | **Spoiler-aware case sharing.** Share title, revision and allowed public metadata without answer-bearing state. | Existing explicit export UX | M / social | Static source inspection remains possible; do not promise encryption secrecy. |
| 23 | **Draft a route, not a castle.** Choose the order of open investigative leads within fixed geography. | Current Wrenmere map | M / solo | Avoid random geography or a forced restart loop. |
| 24 | **A tactile paper table.** Sort, compare and annotate records with keyboard/menu equivalents. | #51/#47 | M / solo/co-op | No tiny desktop canvas on a phone. |
| 25 | **Evidence from ecology.** Infer a growing condition from a pattern of specimens and a weather log. | Gardens plus authored sources | M / solo | Fictional models labelled; no real-world expert claim. |
| 26 | **Planning as investigation.** Use a small town/route model to test whether a public account is possible. | Pocket Borough/challenge tools | M / solo | An attainable model is not a witness statement or proof of optimality. |
| 27 | **Companion as index.** An optional companion points to already collected related records. | #32 | M / solo | No hidden solutions, required breed or neglect penalty. |
| 28 | **Deliberate clue photography.** Compare two supplied images with accessible observations; camera mode is a separate experiment. | Object inspector | R / solo | No camera permission in the baseline; avoid inaccessible pixel hunts. |
| 29 | **Shared salon event.** A scheduled, hosted-in-person investigation with printed/QR dossiers and a solo archive afterwards. | Case workbench + static assets | R / groups | Permission, spoiler moderation and accessibility precede public live ops. |
| 30 | **Adaptive ambience, stable truth.** Subtle light/material changes follow known discoveries, with static fallback. | #46/#48, optional rendering | R / all modes | No clue mutation, benchmark invention or required WebGPU. |

## Strong combinations

**Maps + testimony + intervals** supports grounded investigations without an accusation selector. **Museum method + new room representation** creates learning transfer. **Object biography + marginalia + edition comparison** produces an archive mystery with intimate stakes. **Complementary dossiers + explicit evidence verdicts** gives co-op a reason to talk. **Creator diagnostics + counterexample models + preview** improves quality without a runtime AI dependency.

## Scope guard

Start with concepts 01, 09 and 20 as one testable authoring loop, plus the build-only content-identity repair. Prototype one of 02–04 after the first case is observed with players. Concepts 10–11 and 28–30 are experiments, not immediate infrastructure requirements. Content quantity, networking, 3D rendering, procedural generation and AI are independent decisions; none follows automatically from the word platform.
