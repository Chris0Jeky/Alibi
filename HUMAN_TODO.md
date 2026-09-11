# Owner decisions

No owner input is needed to continue the authorized browser-game launch.

2026-09-09 playtest update: the owner reports that two real players have played Alibi and loved
it. This is a successful early qualitative playtest. Their concrete interaction/content feedback
is tracked in [PLAYER-QA.md](docs/PLAYER-QA.md). The report does not explicitly confirm the
affected-device freeze retest, TalkBack, measured difficulty or the complete sampler below.

- [ ] q-1 — Choose the public source license: GPL-3.0, MIT, or no reuse license yet.
  Asked in this session. Until answered, there is no open-source license grant.
- [ ] q-2 — Finish physical Android acceptance (installation and initial play confirmed by owner on 2026-09-08): install, airplane-mode relaunch, backup export,
  large system text and TalkBack. Owner and another player report repeated post-completion freezes,
  including The last service; retest after the recovery update. Do not clear phone data.
  Browser emulation cannot certify that the physical-device fault is resolved.
- [ ] q-3 — Before a store submission or substantial promotion, confirm the Alibi name and
  publisher identity. Store accounts, signing-key ownership and disclosures belong here.

A custom domain, monetization and account sync are optional future decisions, not launch gates.

Phone recovery follow-up: [issue #11](https://github.com/Chris0Jeky/Alibi/issues/11).

- [ ] q-4 — Before Quiet Wing preview promotion, run the affected-device script in
  [QUIET-WING.md](docs/QUIET-WING.md), then verify TalkBack plot selection, pinch/pan/place,
  large system text, sound/haptics and sustained full-scene performance. Local Chromium checks
  do not close this item. Hosted 0.6.0 persistence, offline and old-to-new update checks passed;
  the prior release is retained as a file rollback candidate, but a production rollback was not executed.
  Track [issue #13](https://github.com/Chris0Jeky/Alibi/issues/13).
- [ ] q-5 — Human-review classic difficulty and idle reward pace; import a real exported OBJ/MTL
  into a 3D editor. Current finite geometry/ZIP checks do not prove editor interoperability.

- [ ] q-6 — Playtest the Curation Cabinet sampler (two puzzles per family) without answer reveals; record wording, solve path, guessing, timing and hint expectations in docs/curation/PLAYTEST_TEMPLATE.md. Review the 59 separate challenges for enjoyment and touch ergonomics. Machine uniqueness/replays do not calibrate difficulty.

The 0.8 theatrical edition adds an acceptance focus for q-4: compare Painted/Rich rooms, try
Room sound and Still the room, background/return, and deliberately play a short film. Browser
checks do not confirm loudness, comfort, battery use or sustained performance on the affected phone.
The September sound candidate replaces the main-room synthetic bed with recorded rain and waves.
For q-4, listen to both at low and normal volume, including several loop boundaries, and report
any distracting voices, repetition or harshness. This acceptance remains open until heard by a person.

- [ ] q-7 — Play Wrenmere Chapter I on the affected phone and with a new player: follow the
  grounds and nearby doors, inspect an object, try the museum label reviews, revise a notebook
  hypothesis, export/review a castle backup and deliberately play the captioned prologue.
  Try larger text, TalkBack and offline reopening. Record where the story, uncertainty or next
  step becomes unclear, and whether the visit feels rewarding. Browser simulations do not close
  this item; track [issue #56](https://github.com/Chris0Jeky/Alibi/issues/56).

- [ ] q-8 — Play the September additions on the affected phone: repeated scene tap cycles and
  hold menus, 15×15 Nonogram panning/auto-cross, the eight-chapter invitation, and all five new
  Games Room tables. Sample the fifteen provisional Expert puzzles across all thirteen families;
  report any easy, guess-heavy or confusing entry before treating Expert as calibrated. The
  region game uses one lantern per row/column/region with no touching, and Dominoes uses the
  double-six draw variant. Confirm whether these interpretations match the player's intention.

## Capacitor transition: owner gates, not a request to stop planning

The [Capacitor architecture package](docs/capacitor/README.md) and [program #120](https://github.com/Chris0Jeky/Alibi/issues/120)
plan a shared PWA plus bundled Android edition. No native application, store release or new account
is claimed by this planning PR. Build-target/port work and a visibly non-publishable preview can
proceed without more animation choices, a new domain or store credentials.

Before production registration, extend q-3 with the approved legal publisher, applicationId, Play
account type/status, support/privacy endpoints, signing custodian and production approver:
[CAP-01/#123](https://github.com/Chris0Jeky/Alibi/issues/123). Keep identity documents, tester addresses
and key material private, not in this public repository. No fees or subscriptions are authorized
by the architecture alone.

Before native promotion, existing q-2/q-4 physical checks also cover native touch, TalkBack,
interruption/process-recreation, document-provider transfer and sustained performance. Record
actual results under [CAP-09/#131](https://github.com/Chris0Jeky/Alibi/issues/131) and existing #118.
Applicable genuine closed testing and Google approval remain external gates under
[CAP-13/#135](https://github.com/Chris0Jeky/Alibi/issues/135).

The proposed native default excludes private progress from automatic cloud/device transfer and
provides explicit export/import. Confirm any decision to change that privacy/recovery trade-off
before release; platform/OEM behaviour still needs testing. All seven release gates remain pending
in [plan.json](docs/capacitor/plan.json).
