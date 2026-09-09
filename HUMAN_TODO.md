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
