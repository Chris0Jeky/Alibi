# Wrenmere: production strategy

Updated 9 September 2026. Owner brief: make Alibi a countryside castle whose puzzles,
history, rooms and tragic mystery reinforce one another. This is the implementation plan,
not a claim that every proposed room or act is playable. Git, tests and release receipts
determine completion. The supplied package remains evidence to reconcile against the app.

## The experience we are building

**The puzzles teach methods. The museum gives those methods a history. The castle makes
them matter.** A familiar, persistent estate becomes more understandable as the visitor
notices things. Its geography does not reset each day. Curiosity, revising an explanation
and using a hint are legitimate ways forward.

The visitor is a cataloguer helping Wrenmere reopen. Mara Vale's life and work occupy the
house; her death in the 1911 flood is not its only subject. The public account blamed Rowan
Finch using a ticket read against the wrong clock. The initial investigation establishes
that he could have arrived before the bell, while refusing to turn possibility into proof.
An omitted stair then makes the house itself a source to investigate.

The practical design rules are:

- A room has a physical identity, a thinking method, a useful activity and a reason to return.
- Let players handle a museum question before requiring them to read its label. Distinguish
  a surviving object, a documented historical claim, a legend and our modern reconstruction.
- Progress opens discoveries; points cannot manufacture evidence. Hints never block the story.
- Records support deductions through their contents. A solved grid alone is not testimony.
- Keep an always-available directory, nearby exits and direct puzzle access. Atmospheric
  navigation must work with touch, keyboard, larger text and reduced motion.
- Quiet Wing is a place to practise, reflect, preserve and create. Personal gardens, towns
  and companions retain their own state; the story estate never overwrites them.
- Films are deliberate, captioned and optional. Every relevant sentence exists in text.

## Reconciliation of the supplied work

The standalone bundle supplies 32 locations, ten Chapter I activities, ten visitable
locations, three museum investigations, scene SVGs, an 18-second film, a five-act story,
production prompts, contracts and historical test evidence. It is a prototype with its own
document and storage, not a replacement app to deploy over Alibi.

Draft PRs #39–42 transplant the chapter into a native lazy activity with separate storage,
accessible boards, nine room observations and a notebook. They omitted the original art
and rendered film, left restore incomplete and did not connect room familiarity to the
existing catalogue. Main has since advanced to Alibi 0.8.2 / 328 puzzles. The integration
branch preserves every original draft commit and starts from main `8ffe98a`.

Use one production PR for the completed integration rather than landing a release with
known save-recovery gaps. Link and supersede the drafts only after their original work is
preserved and the replacement is reviewable. Preserve commits when merging.

## Delivery sequence and completion criteria

| Milestone | Concrete deliverable | Evidence required |
| --- | --- | --- |
| Foundation | Integrate the original chapter and current app without losing recent player improvements | Full format/build/Node gate; original chapter controls; unchanged published definitions |
| Recoverable notebook (#44) | Bounded import, reviewable merge/replace, atomic pre-restore copy, accurate combined-backup scope, explicit acknowledgement of exported session state | Unknown/future preservation, stale-tab refusal, quota/timeout tests, real IndexedDB restore and offline update checks |
| A place to explore (#45–47) | Original castle and room illustrations, consistent today/survey layers, named navigation and nearby exits, objects visible in scenes with equivalent text controls | Asset provenance/hash/size manifest, phone and desktop visual inspection, control and offline tests |
| Invitation and atmosphere (#48/#52) | Optional original prologue with captions/transcript and bounded lifecycle; fitting room feedback that respects comfort settings | Decode and actual playback checks; mute/background/dispose; no automatic film download |
| Investigation desk (#51) | Inspectable records and revisable hypotheses that distinguish observation, inference and uncertainty | Persistence and restore of bounded notes; no deductions awarded by arbitrary text; keyboard/touch controls |
| Museum and practice (#50/#55) | Hands-on historical investigations connected to the castle's methods; curated existing puzzles and honest familiarity | Source verification, actual exhibit controls, stable-ID mapping, duplicate-safe completion counts, no fabricated story evidence |
| Next chapters (#53/#54) | Detailed proof graphs, room routes, authored records and buildable slices for Acts II–V | Canon/chronology reconciliation; explicit implemented/planned labels; acceptance criteria for each slice |
| Production closeout (#43/#56) | Reviewable PR, exact-head CI, deployed release within existing origin authority, durable restart instructions | One independent adversarial review, bounded fix round, head aging, emitted/hosted file checks, real origin and update receipts |

Milestones are incremental commits. A failing check gets at most three distinct diagnostic
attempts; review follows the repository's one-review/one-fix ceiling. A specific external
gate can park that release step with its exact restart condition while other useful work
continues. Do not weaken budgets, restore safeguards or human acceptance to call it finished.

## Progression contracts

Keep these four concepts separate:

| Concept | Authority | Examples |
| --- | --- | --- |
| Room familiarity | Validated first completions of mapped official puzzle ID/revisions; castle questions | Practising route models in the Map Room |
| Evidence | An authored record or a supported chapter deduction | Clock maintenance slip; qualified ticket correction |
| Access | Explicit readable requirements over familiarity and/or evidence | Library drawer; corrected-record study; concealed passage |
| Ownership | Future versioned entitlements under #30 | Seed, building kit, palette, companion accessory |

Existing official completions may contribute to practice familiarity. They never imply a
museum visit, a read letter, a hypothesis or a story solution. Custom packs do not grant
official rewards. Replays and retries do not farm rewards. Guided completions count.
Main-story access always has an accessible authored route and an explicit hint/reveal path.

## Deferred companion, garden and village programme

The owner explicitly put this part into issues/plans first. Keep epic #29 and its existing
children; avoid a second reward wallet or silently changing mature creative-space saves.

1. **#30 — receipts and entitlements.** Define stable event ID, source ID/revision, event
   version and entitlement version. Replaying a receipt is a no-op. Validate imports before
   delivery. Cross-store propagation needs a recoverable outbox and retry semantics; no
   claim of atomic transactions across separate databases. Reconcile existing ownership.
2. **#31 — editable companion pipeline.** Reproducible Blender masters, named parts, bounded
   textures/geometry, rig/animation export conventions, thumbnails and 2D fallbacks. Prove
   a real exported asset opens in Blender and renders on the target phone before scaling.
3. **#32 — companion roles.** Meaningful acts such as completing an exhibit or revising an
   evidence-board claim grant experience once. Roles offer optional observations and cosmetic
   expression, not exclusive story truth. No hunger/neglect punishment or compulsory timers.
4. **#33 — seeds and garden restoration.** Establish a small reviewed species table with
   visual stages and deterministic offline behaviour. A story garden is authored scenery;
   the user's garden is an independently owned arrangement. Never replace it as a quest reward.
5. **#34 — village kits and palettes.** A discovery can unlock a coherent kit: observatory
   telescope, brass/indigo materials, matching planting and companion accessory. Existing
   pieces stay owned. Preview and undo placement; colour must not be the only identifier.
6. **#35 — bounded expansion.** Extend within a declared maximum, preserve occupied cells
   and stable building IDs, preview the boundary, and provide reversible expansion before
   any camera/performance scaling. Never regenerate the player's town.
7. **#37 — end-to-end acceptance.** Duplicate delivery, old and future backups, interrupted
   restore, offline receipt retry, two-tab races, reduced motion and equivalent keyboard
   controls must pass before cross-game rewards ship.

## Story continuation

Act II compares surveys and household terminology to establish what the omitted stair
connected and whose observation the unsigned margin records. Act III reconstructs the
warning network and deferred maintenance. Act IV corroborates movements and evacuation.
Act V corrects the public account without inventing Mara's final thoughts or claiming a
different decision would certainly have saved her.

Each act needs a record → observation → permitted inference → remaining uncertainty graph.
Wrong answers should identify the missing support. A changed mind is saved as progress in
understanding, not penalised. Give the ending room for unresolved questions and a considered
memorial choice; do not score grief or forgiveness.

## Human and release boundaries

Simulated phone views are not physical Android acceptance. TalkBack, affected-device freeze
retests, sensory comfort, sustained battery/performance, enjoyment and difficulty calibration
remain in [HUMAN_TODO.md](../../HUMAN_TODO.md), with #2/#11/#13/#56 as appropriate.
The existing Cloudflare primary and Sites fallback retain their separate device saves.
No new account, domain, store package, external player data or licensing decision is implied.

## 0.10.0 delivery checkpoint

PR #73 preserves the eighteen original draft-stack commits and publishes Chapter I on both
existing origins. [RELEASE-0.10.0.md](../RELEASE-0.10.0.md) records the exact source, CI,
independent review, hosted controls, file fingerprints and actual saved-game upgrades.

| Original intention | Implemented now | Durable continuation |
| --- | --- | --- |
| A castle that teaches ways of thinking | Ten questions across ten locations, two-era map, room methods, guided explanations and revisable hypotheses | Full 32-location world bible; geographic/floor/wing refinement remains #45 |
| A puzzle museum with history and philosophy | Three source-backed objects, hands-on label revisions, proof/legend/model distinctions and an exhibition drawer | Broader research/curation #50 and the complete museum editorial bible |
| Visual exploration, media, objects and secrets | Twelve supplied SVG exports, nearby doors, nine observations, optional captioned prologue and concealed stair | Bespoke layered art #46, richer objects #47, material cues #48, portraits/voices #49 and two further films #52 |
| Progression tied to puzzle categories | Ten-point first completions, clue prerequisites, thirteen official-family familiarity tracks and 39 starters; three first solves reveal room details | Receipt delivery and wider rewards remain #30/#55; familiarity does not manufacture evidence |
| A tragic mystery larger than individual boards | The Seventeenth Minute establishes a feasible route and carefully qualified testimony | Proposed Chapter II records/proof gaps in CONTINUATION.md; later warning, crossing and exhibition slices #76–78 under #54 |
| A Quiet Wing worth returning to | Museum activities, revisable curation, room discoveries and links to existing creative spaces | Human first-visit/comfort review #56; richer museum and companion roles remain planned |
| Customisable, developing Blender pets | Existing companions remain available | Reproducible masters, bounded GLB/2D fallbacks, optional roles and meaningful experience in DEFERRED-REWARDS.md and #31/#32 |
| Seeds, kits, colours and growing towns | Existing creations and ownership remain intact | Proposed receipt/outbox contract, Under the Dome kit, species/placement/expansion and recovery acceptance in #29–35/#37 |
| Reuse the supplied work and finish the drafts | Complete 69-file inventory, all 68 supplied checksums matched, eight complete bibles retained, all original stack commits merged | RESOURCES.md maps each input and disposition; source-package plans are distinguished from runtime authority |

Recovery gate #44 is implemented and verified. Other production issues remain open for their
full acceptance criteria: this release does not represent every proposed scene, chapter or
reward system as finished. #79/#80 track the two reproduced P2 review improvements. Human
Android, TalkBack, story comfort and difficulty remain in HUMAN_TODO.md q-7 and the earlier items.
