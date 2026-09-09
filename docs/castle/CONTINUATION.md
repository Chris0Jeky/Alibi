# Wrenmere continuation: proposed Chapters II–V

Status: production proposal. Chapter I (`seventeenth-minute`) is the only shipped castle chapter. Every ID in this document is a proposed content ID at
`revision: 1`; none should be treated as an existing save, unlock, or published fact. This separation matters because the current castle save is schema 1 and
refuses unknown state shapes (`src/castle/engine.mjs`, `src/castle/storage.mjs`).

The proposal reconciles the supplied story and world bibles in `.castle-input/production-docs/design/STORY-BIBLE-SPOILERS.md` and
`.castle-input/production-docs/design/WORLD-BIBLE.md` with the current room registry in `src/castle/rooms.mjs`, the current Chapter I content in
`src/castle/content.mjs`, and the quest/access rules in `.castle-input/production-docs/design/PROGRESSION-AND-QUESTS.md`. Those copied files are planning
sources; the source tree remains the runtime authority.

## Canon guardrails

Mara Vale was a practical curator who noticed patterns in objects and people, labelled things with pencilled alternatives, kept repaired pieces beside perfect
ones, and asked makers how an object was used. Her ordinary work, correspondence, impatience, and care must be visible before her death is discussed. Do not
reduce her to a dead woman whose purpose is to motivate a player.

The 1911 flood, the wrongful account that blamed Rowan Finch, and the house's deferred repairs are the story's tragic centre. The game reconstructs shared
failures and institutional omission; it does not reveal a ghost, murder confession, villain monologue, final thought, or omniscient minute-by-minute certainty.
A conclusion can be emotionally meaningful while leaving motive, counterfactual rescue, and some timing uncertain.

Every authored claim follows this chain:

```
record or observation -> permitted inference -> remaining uncertainty
```

The player can change a hypothesis as new records arrive. A changed mind is progress, and no grief, forgiveness, or moral score is awarded. Points and ordinary
room familiarity remain separate from evidence and access as specified in `.castle-input/production-docs/design/PROGRESSION-AND-QUESTS.md`.

## Geography and stable IDs

The existing map has ten playable rooms and twenty-two planned entries. The planned entries below use the IDs already present in `src/castle/rooms.mjs`; their
`implemented:false` state is a source fact. Their names, coordinates, family fields, and status must remain stable while Chapter II is authored. The room list
is a geography contract, not a promise that all rooms ship in one release.

| Planned ID | Source name | Proposed chapter job | Proposed family/mechanic |
| --- | --- | --- | --- |
| `portrait` | The Portrait Gallery | social memory and changed labels | picture: place labels under spatial and witness constraints |
| `dining` | The Long Dining Room | guest/service circulation | scene: seat and carry records under exclusions |
| `court` | The Court of Testimony | compare witness vocabulary | witness: supported, contradicted, unknown claims |
| `music` | The Music Salon | maintenance interval | sequence: recover a missing bar from repeated intervals |
| `kitchen` | The Old Kitchens | measures and conversion assumptions | aquarium: conserve quantities across dented jugs |
| `scullery` | The Scullery | pipe destination | pouring: reach a bounded volume state |
| `post` | The Dead Letter Office | warning correspondence | cipher: identify the key before decoding |
| `archive` | The Flooded Archive | survey and work-order records | dossier: align record provenance and revision |
| `reservoir` | The Cistern Vaults | relief gate and branch model | aquarium/network: test valve paths, not flood physics |
| `maze` | The Yew Labyrinth | map perspective | trail: derive a route from a drawn viewpoint |
| `orchard` | The Old Orchard | ground plan versus survey | tents: place trees and service markers with exclusions |
| `bridge` | The Seven-Arch Bridge | crossing constraints | bridges: test connectivity and odd-degree claims |
| `boathouse` | The Boathouse | boat capacity and rescue list | crossing/scene: schedule people without inventing facts |
| `chapel` | The Chapel of Echoes | optional reflective record | logic: reconcile an unsigned note's conditions |
| `sundial` | The Sundial Court | shadow and calibration | binary: encode a bounded set of observations |
| `nursery` | The Paper Theatre | missing doorway representation | spatial: fold/rotate the paper plan |
| `rookery` | The Rookery | message network | network: find the disconnected branch |
| `chess` | The Knight’s Chamber | route and movement | knight: constrained legal movement |
| `number` | The Number Cabinet | relationships replacing labels | sudoku: complete a small relation grid |
| `inequality` | The Balancing Hall | evidence ordering | futoshiki: satisfy strict and non-strict comparisons |
| `borough` | The Model Village | later town/history perspective | city: preserve IDs while comparing layouts |
| `hearth` | The Companion Hearth | companion observations and calm | no story gate; optional observation loop |

The ten current rooms remain the entry route: `gatehouse`, `library`, `observatory`, `cartography`, `orangery`, `museum`, `workshop`, `study`, `west-stair`, and
`conservatory`. The current engine's ten activity IDs are `gate`, `shelves`, `clock`, `route`, `lamps`, `hanoi`, `bridges`, `magic`, `ur`, and `inference`; a
proposed continuation must register any new puzzle against an existing pure family before considering a new engine.

## Proposed authored-record contract

The following is an editorial contract for a future content module. It is deliberately separate from the current save envelope. `revision: 1` is a proposed
content revision, not the current save revision.

```js
{
  id: 'wrenmere.ch2.survey-1911',
  revision: 1,
  chapter: 'room-between-rooms',
  room: 'archive',
  kind: 'record', // record | observation | model | inference | uncertainty
  sourceRef: 'archive:survey-1911',
  requires: ['wrenmere.ch1.route-feasible'],
  text: { storyOn: '...', storyOff: '...' },
  supports: ['wrenmere.ch2.route-direction'],
  alternatives: ['wrenmere.ch2.route-direction:service-only'],
  spoilerTier: 'chapter-2',
  permittedClaims: ['the two plans describe the same courtyard by different names'],
  remainingUncertainty: ['who ordered the later alteration'],
}
```

`sourceRef` identifies an authored fictional record, not a claim about a real historical source. The registry should validate IDs, chapter, room, kind,
revision, bounded text, and acyclic `requires`/`supports` edges. It should keep evidence text and answer state distinct. Hints may refer to `permittedClaims`
but never read a solution field. An optional record has a visible uncertainty label; it cannot silently become required evidence.

The `storyOn` and `storyOff` strings are both authored. Story-off keeps practical instructions, room identity, dates needed by the puzzle, and accessible labels
while removing tragedy framing, character stakes, and future-chapter spoilers. It must not alter puzzle answers, completion IDs, access requirements, or save
semantics. Asset filenames, alt text, and map tooltips must also be checked for accidental story leakage.

## Chapter II — “The Room Between the Rooms” (`#53`, proposed)

**Story beat.** The player compares the 1911 survey with a later plan, household/service lists, and the unsigned margin found at the Unrecorded Stair. Different
doorway names are spatially compatible. The margin writer can be identified and the riverward direction corroborated, but the reason for Mara's route remains
open. The discovery makes the omission actionable: someone removed a route from the account after the flood, without proving why.

**Records and exposure.** All IDs below are proposed, revision 1, and exposed only after the Chapter I west-stair question is readable.

| ID | Kind / room | How exposed | Supports / uncertainty |
| --- | --- | --- | --- |
| `wrenmere.ch2.survey-1911` | record / `archive` | inspect the rolled plan; compare its legend | supports `plan-alignment`; survey is incomplete |
| `wrenmere.ch2.survey-later` | record / `cartography` | align the later survey overlay | supports `plan-alignment`; alteration date is not given |
| `wrenmere.ch2.service-list` | record / `dining` | read guest and service lists separately | supports `service-route`; list does not prove who carried an item |
| `wrenmere.ch2.doorway-names` | observation / `court` | mark two descriptions on the room index | supports `terminology-reconciled`; witness memory remains partial |
| `wrenmere.ch2.draught-mark` | optional record / `workshop` | inspect a discarded drafting mark | character/alternative hint only; not a required truth |
| `wrenmere.ch2.margin-author` | inference / `west-stair` | reconcile hand, vocabulary, and access | permits “Iona is the strongest attribution”; signature remains absent |
| `wrenmere.ch2.route-direction` | inference / `cartography` | submit the aligned route | permits “Mara went riverward by the service route” |
| `wrenmere.ch2.altered-account` | uncertainty / `study` | answer the remaining-question prompt | alteration is established; motive and exact editor are not |

The evidence graph is intentionally narrow:

```
Ch I route-feasible
  -> inspect west-stair
  -> survey-1911 + survey-later
  -> align doorway names
  -> service-list + doorway-names
  -> route-direction and margin-author
  -> altered-account (what changed is known; why remains unknown)
```

**Room loop and mechanic.** Enter via `west-stair`, read the practical question, and choose either the `archive` survey or the `cartography` overlay first. In
`archive`, use a small dossier board to match legend, scale mark, and revision note. In `cartography`, use the existing trail-family mechanic to draw a route
across the two plans. In `dining`, a scene-family board separates guest entries from service entries. In `court`, a witness-family board marks “saw”, “heard”,
and “inferred” as different evidence types. Return to `workshop` only for the optional draughting mark, then submit the inference in `study`. A player who
solves through the museum's method lesson gets the same evidence entitlement as a player who opens the family directly.

**Hint ladder.** Hints escalate as orientation (“start with the two legends”), constraint (“the same doorway must occupy the same relative position”), method
(“compare adjacency before names”), then worked solution (“place the stair, courtyard, and riverward exit in this order”). The final hint is an explicit reveal
labelled as such and still does not award an unearned record. Hints cannot be required to progress.

**Access and chapter end.** The `west-stair` is available after the current `inference` completion. `archive`, `cartography`, `dining`, and `court` are unlocked
by readable invitations or directory access, not score. End Chapter II only when the player has submitted a valid aligned route, reviewed one independent
service/witness record, and acknowledged the remaining uncertainty. This is an authored evidence checkpoint, not a final answer. Replaying a solved board,
toggling story mode, or visiting the museum cannot duplicate a completion receipt.

**Smallest buildable next slice.** Author the two survey records, one overlay puzzle, one service record, and one uncertainty prompt; use the current `trail`
family and no new engine. Add a future continuation content registry with the contract above, then extend `src/castle/engine.mjs` with a bounded optional
continuation section only after its validator is specified. A migrated Chapter I save must gain an empty continuation section while preserving its version,
completed answers, notes, drafts, and preferences. A malformed or future continuation revision must be refused and left unchanged. `src/castle/storage.mjs`
keeps its existing CAS and recovery behavior.

The first test set should prove:

1. Fresh and migrated saves reach the same Chapter II graph.
2. Both plan orientations and both doorway vocabularies resolve to one semantic route.
3. A plausible but unsupported route leaves `route-direction` locked and records the uncertainty.
4. Story on/off changes copy only; answer, access, and completion IDs remain identical.
5. Museum-alternative and direct-family paths produce the same authored evidence.
6. Hints expose orientation, constraint, method, and optional solution in order without reading `solution` from state.
7. CAS conflict, export/import, and a stale tab cannot award the same evidence twice.

## Chapter III — “What Warning Reached” (`#54`, proposed)

**Story beat.** The player follows the warning network through `rookery`, `post`, `reservoir`, and `archive`. The intended arrangement, the installed temporary
arrangement, and what witnesses actually observed are separate records. A deferred relief-gate repair and a disconnected village branch explain separate
failures; neither becomes a tidy murder motive or a claim about exact flood physics.

Proposed revision-1 records:

| ID | Room / exposure | Permitted inference | Uncertainty retained |
| --- | --- | --- | --- |
| `wrenmere.ch3.warning-intended` | `rookery` message chart | the designed path had a house and village branch | plan is not proof of installation |
| `wrenmere.ch3.relief-work-order` | `archive` invoice/work order | relief-gate maintenance was deferred | reason and decision-maker remain partial |
| `wrenmere.ch3.warning-installed` | `reservoir` valve labels | temporary selector differed from the intended plan | installation date is approximate |
| `wrenmere.ch3.warning-observed` | `post` returned letters | at least one message route did not reach its addressee | silence is not proof of no attempt |
| `wrenmere.ch3.village-branch` | `rookery` network board | village branch was disconnected in the relevant arrangement | exact physical water level is unknown |
| `wrenmere.ch3.separate-failures` | `study` synthesis | gate reliability and village warning were distinct failures | responsibility is distributed |
| `wrenmere.ch3.remaining-question` | `conservatory` optional note | “what should a warning protect?” is the next question | no counterfactual certainty |

The loop is a network-path board in `rookery`, a bounded valve/path model in `reservoir`, and a provenance board in `archive`. The puzzle accepts
intended/installed/observed as three labelled layers; it must reject an attractive path that collapses those layers. Hints follow the same four steps. End
access requires the separated-failures inference and a readable uncertainty statement; the chapter does not require a precise fluid simulation. Story-off
retains labels such as “intended” and “observed” while removing the tragedy framing.

## Chapter IV — “Other Bank” (`#54`, proposed)

**Story beat.** `boathouse`, `bridge`, `orchard`, and `court` join the records. A capacity and crossing schedule establishes intervals in which Finch was at the
tower and Mara moved toward the warning point. Independent records corroborate her warning direction and Finch's early presence; they do not establish every
second, a final thought, or that a different action would certainly have saved anyone.

Proposed revision-1 records:

| ID | Room / exposure | Permitted inference | Uncertainty retained |
| --- | --- | --- | --- |
| `wrenmere.ch4.boat-manifest` | `boathouse` rescue list | capacity and named departures constrain schedules | additions have uncertain ordering |
| `wrenmere.ch4.tower-observation` | `bridge` model / tower note | Finch was present before the calibrated bell interval | observation's exact vantage remains unknown |
| `wrenmere.ch4.mara-warning` | `orchard` route + `court` witness | Mara moved riverward toward warning work | return route is not fully witnessed |
| `wrenmere.ch4.bridge-witness` | `court` two accounts | crossing failure interval is bounded | witness terminology is approximate |
| `wrenmere.ch4.chronology-model` | `study` synthesis | shared interval supports a cautious sequence | exact timestamps are not canonical in UI |
| `wrenmere.ch4.counterfactual-limit` | `conservatory` reflection | a different outcome is not established by the records | responsibility and grief remain plural |

Use `bridges` for the connectivity proof and a `crossing`/scene-family board for boat capacity. The schedule accepts intervals and shared order, not a single
theatrical timestamp. The proposed story-bible outline's later times are authoring material and must not leak into Chapter I. End access requires two
independent records plus the interval model; the player then chooses whether to read the optional reflection.

## Chapter V — “An Honest Exhibition” (`#54`, proposed)

**Story beat.** In the `study`, the player compares the report draft with the published account. In `post`, Ada Vale's correspondence gives a family
counterweight without becoming a confession. In `museum`, the player builds an exhibition that distinguishes supported, contradicted, and not established
claims. The final public account corrects the record while allowing the player to name an object display, memorial planting, or public-room label; these are
choices without a superior moral ending.

Proposed revision-1 records:

| ID | Room / exposure | Permitted inference | Uncertainty retained |
| --- | --- | --- | --- |
| `wrenmere.ch5.report-draft` | `study` working papers | the draft included route and warning qualifications | authorial motive is not explicit |
| `wrenmere.ch5.report-published` | `museum` exhibit drawer | the public account omitted material limits | omission's internal discussion is unknown |
| `wrenmere.ch5.ada-letter` | `post` correspondence | Ada asked for a correct public account | grief does not settle every fact |
| `wrenmere.ch5.object-register` | `museum` catalogue | objects can teach method and context together | provenance may remain incomplete |
| `wrenmere.ch5.public-account` | `study` synthesis | the account can be corrected with supported claims | no perfect account is promised |
| `wrenmere.ch5.questions-we-share` | `museum`/`conservatory` | the estate preserves questions as well as answers | future questions remain open |

The final synthesis is a three-column evidence board, not a single culprit selector. The hint ladder can identify a source, explain a contradiction, show how to
classify it, and optionally reveal the classification. End Chapter V after a valid supported/contradicted/not-established submission and one chosen exhibition
treatment. The `questions-we-share` room is an authored continuation invitation, not an XP reward.

## Compatibility and acceptance boundary

Chapters II–V should use stable room IDs and content revision 1, with explicit migration tests before any old save can see a new gate. A current save's
`completed` answers remain pinned to their existing activity IDs/revisions. New evidence is additive and idempotent; replay, reset, reopen, or decorative visits
do not farm access. Official completion receipts may contribute to familiarity only after their registered definition and revision are validated; custom packs
never grant an official story entitlement.

The shipped Chapter I remains playable with story on or off, without downloading a film, and with its existing 1911 lens as optional context. Future rooms may
use the same room directory/direct access and Quiet Wing practice/history purpose described in `.castle-input/production-docs/design/WORLD-BIBLE.md`. Physical
phone, TalkBack, sensory, battery, enjoyment, and difficulty acceptance remain human playtest work under the existing production notes and `HUMAN_TODO.md`; this
proposal does not convert simulated checks into those claims.
