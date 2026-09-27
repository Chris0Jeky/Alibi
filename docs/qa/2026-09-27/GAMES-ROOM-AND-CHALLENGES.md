# Alibi 0.14.1: Games Room, Challenge Library and Quiet Wing QA (condensed by coordinator from the agent's full report)

Build 0.14.1 `e6f71ff5` snapshot on http://127.0.0.1:8793; Python Playwright headless Chromium; phone 390x844 touch and desktop 1280x800; all moves through real controls; Pulseboard blocked; zero uncaught page errors. Evidence: `shots/` (185), `logs/`, `scripts/`. Nothing blocks finishing: every Games Room game and all 15 sampled challenges completed.

Measured: 7 Games Room cards; Archive Heist 9 rooms; Lantern Gardens 9; Duel strengths Learner(1)/Club(3)/Keeper(4)/Expert(5); 13 Quiet Wing classics; 95 curated challenges in 10 families (hanoi 6, sliding 8, river 3, jugs 4, queens 6, magic 4, knight 4, warehouse 36 = 12 older + 24 vaults, reversi 8, borough 16 = 4 older + 12 contracts); vaults 12x3 crates, 12x4.

## Advertised vs reachable
- C1 0.13.0 "24 Archive Heist vaults" (`content/releases.json:31`): PARTLY. Only in Quiet Wing › Challenges; Archive Heist says ROOM 01/09 and links nowhere. Phone: ~4,200px desk scroll → "The quiet cabinet" → ~2,800px → 10px "Curated challenges" → filter → "Archive Heist (36)" → past 12 older → vault (5 taps). Vaults use a text-glyph launcher, not the Archive board (F02).
- C2 "12 Pocket Borough planning contracts" (`releases.json:31`): PARTLY. Same library, "Pocket Borough (16)" mixes 4 older + 12 contracts; plain text progress; raw ids (F03).
- C3 "Filter the 95-challenge library by family": YES, but raw labels "hanoi (6)", tags "WAREHOUSE"/"REVERSI"/"BOROUGH".
- C4 Duel strengths: YES; no visual selected state, unstyled fieldset (F08).
- C5 Duel Retry: YES (simulated worker failure).
- C6 Block Cabinet fresh restart: YES; typed seed only in Simple controls behind ⋯ + scroll (F07).
- C7 0.11.0 "five new Games Room tables" incl. Draw Dominoes and Mahjong (`releases.json:142`, shown in What's new): PARTLY; Dominoes/Mahjong only by typing `#/salon/dominoes` / `#/salon/mahjong`.
- C8/C9 historical counts (six rooms; 59 challenges): fine as history.
- C10 companions/calm boards/postcards: YES; deep phone entrance.
- C12 README "Archive Heist has nine rooms" / card "SPATIAL · 9 ROOMS" (`src/club.js:504`): true, but should mention vaults.
- C13 README stale: "Current release: 0.11.6" (:12), "382 puzzles" (:28), "59 challenges" (:144). Build: 0.14.1 / 510 / 95.
- C14 README "Enter [the Quiet Wing] from the home desk or main navigation": PARTLY; phone bottom nav has no Quiet Wing entry.
- C15 Cascade: hidden behind Block Cabinet ⋯ → scroll.
- C17 "optional private-room server" (`src/club.js:607`): button on every Duel page though the static site can't create rooms.
- C20 Classics completion "Your stamp is in the journal" (`src/quiet-wing/app.js:1690`): false for Tideglass, Evening tide, Pressed meadow, Beachcomber.
- C23 Desk news "FOUR NEW 8×8 BOARDS… 27 puzzles" (`src/curation.js:28`): stale (0.8.1; 55 exist).

## Findings (0 blocker, 11 major, 13 minor, 9 polish)
- F01 major — vaults/contracts hidden from the Games Room; Archive/Borough pages never link; Classics entry is a 10px text button. Source `src/club.js:607, 784–800`; `src/quiet-wing/app.js:1453` (`font-size:10px`). Fix: vaults inside Archive Heist; contracts linked from Borough; Games Room "Challenges" card; deep link with family filter.
- F02 major — vault board: glyph buttons ■ @ $ ◇ ▣, no legend, every cell `disabled` (49/49), no tap-to-walk/keyboard, lowercase "up left down right" buttons. `src/challenge-launcher.js:117–153`. Fix: Club archive renderer/controls for warehouse family.
- F03 major — Borough contracts show raw ids (home, cafe, water, library, +), no art/rules/preview; requirements say "home plots… garden plots" while the game calls them Cottages/Canals; plot tap with no offer selected is silent. `src/challenge-launcher.js:161–170`. Fix: reuse boroughPage components; map ids to typeInfo names.
- F04 major — reversi endgame challenges: player must also play Ink; no turn indicator/legend; "forces a win against best defence" not enforced; wrong first move gives no failure message; stored `hint` never shown. `src/challenge-launcher.js:154–160, 184`; `src/challenges.js:284–291`. Fix: auto-reply for Ink from principalVariation/minimax; "Gold/Ink to move"; fail text + hint.
- F05 major — challenge "Start again" wipes a completed replay without confirmation; completion recorded nowhere (card still "Open challenge →", no stamp). `src/challenge-launcher.js:43–49`; list `src/quiet-wing/app.js:1501`. Fix: confirm; store completedAt separately; mark cards Completed/Continue.
- F06 major — challenge completion is only status text; no next, no celebration; Expert/Master difficulty never shown. `src/challenge-launcher.js:35`.
- F07 major — phone Block Cabinet: sticky action bar overlaps "NEXT MOVE" text (text 723–743px vs Undo 734–778px), covers the rules card on scroll; ⋯ options render ~600px below the fold; same in Cascade. `src/block-cabinet/style.css:815–826` (`.bc-controls` sticky with both top and bottom despite a "Bottom-only" comment). Fix: bottom-only sticky with reserved space; ⋯ as popover/sheet or scroll+focus.
- F08 major — Duel strength `<fieldset>` unstyled; selected strength visually identical (aria-pressed only); "1 moves ahead at most". `src/club.js:631–644`; no `.duel-strengths`/`[aria-pressed]` rules.
- F09 major — at 390px the room banner (~110px) + heading push boards down: Duel board at y=728 of 779 usable; Tic-Tac-Toe status below fold; Archive D-pad 834–925; Borough plan tray 811, Build 991. `src/club.js:594` heading; theatre banner. Fix: collapse banner/heading on play pages or scroll to board; plan tray beside board.
- F10 major — phone bottom nav has no Quiet Wing entry; inside the wing the root nav disappears; only back path is the logo (rail "← Puzzle cabinet" is 0x0 at 390). `src/app.js` mobileNav().
- F11 minor — internal text reaches players: "Illegal archive replay action.", "TRUSTED CHALLENGE · REVISION 1", "05 / WAREHOUSE", "hanoi (6)", sliding "Picture mode must retain…", duplicated title. `src/challenges.js:243`; `src/challenge-launcher.js:35`; `src/quiet-wing/app.js:1501, 1523`; `content/challenges/classics.json`.
- F12 minor — calm classics claim a journal stamp that doesn't exist. `src/quiet-wing/app.js:1690`; stamps in `src/quiet-wing/engine.js` (~590–640).
- F13 polish — Games Room section numbers collide (/01 Duel, /02 TTT+Borough, /03 Block+Archive, /04 Dominoes+Mahjong+atlas, none for Gardens); every card engraving "01 / ALIBI". `src/club.js:629,665,673,706,723,756,770,784,1749`; `portrait()` default `:463`, gameCard `:507`.
- F14 polish — "How this works" disclosure picks up a global `details > summary` rule (`src/curation.css:23–30`) inside `.club-rules summary` (`src/club.css:660–675`); "+" overflows ~9px.
- F15 minor — Lantern Gardens: no "Next garden" after completion; switching always confirms even when solved; current garden not highlighted. `src/club.js:673–684`.
- F16 minor — Archive Heist: finishing room 9 offers nothing; room list has no solved markers. `src/club.js:784–800`.
- F17 minor — TTT/Duel/Gardens end states offer only ghost "Start again"; TTT keeper can't be beaten solo. `src/club.js:665`.
- F18 minor — Club journal records omit the game name. `src/club.js:898–917`.
- F19 polish — Games Room page links to itself; stale sidebar "NEW" badge. `src/club.js:594`; `src/app.js:482`.
- F20 minor — Dominoes/Mahjong advertised in What's new but unreachable; pages still say "THE GAMES ROOM / 04". `src/club.js:706, 756`; `content/releases.json:142`.
- F21 minor — challenge list: 95 cards in a 12,958px column on phone; unstyled select; vaults after 12 older puzzles with no badge; no search/sort/progress. `src/quiet-wing/app.js:1501`.
- F22 major — launcher selection states invisible (Borough offer, Magic tile); Hanoi pegs text-only "3 · 2 · 1". `src/challenge-launcher.js:74, 110–116, 161`.
- F23 minor — Block Cabinet has two UIs (tactile Classic vs Simple controls) with different end wording ("Cabinet complete" vs "Cabinet closed"); Cascade only in ⋯. `src/block-cabinet/*`.
- F24 polish — Borough share dialog: truncated 175px URL field, no Copy/Share.
- F25 polish — Quiet Wing rail labels wrap mid-word at 390 ("Compan/ions"); Challenges and Art room both "05 /".
- F26 polish — Miso portrait (orange tabby) vs 3D model (dark grey).
- F27 polish — Classics card art doesn't depict the puzzle.
- F28 minor — desk news stale (0.8.1). `src/curation.js:28`.
- F29 minor — README stale (C13).
- F30 minor — Borough desktop: plans/Build below fold; breadcrumb never names the game.
- F31 polish — plurals: "1 moves from the fixed start" (`src/challenge-launcher.js:35, 168`), "1 moves ahead at most" (`src/club.js:644`), "at least 1 garden plots".
- F32 polish — Realm three.js warnings (PCFSoftShadowMap deprecated; GPU stall ReadPixels).
- F33 minor — "Private online room" button on every Duel page though the static site can't create rooms. `src/club.js:629`.

## Per-game verdicts
Duel: clear, finishable; needs visible strength (F08), board-first phone layout (F09), end CTA (F17), hide online (F33). Tic-Tac-Toe: finishable; solo can't win (say so). Gardens: finishable; next garden/highlight (F15). Block Cabinet: finishable (32 placements to stuck, score 221); phone overlap/menu (F07), one visual language (F23), surface Cascade. Pocket Borough: finishable (18 placements, 72 points); layout (F09/F30), copy button (F24). Archive Heist: all 9 solved via D-pad; tap-to-walk/arrows work; needs solved markers, end card, the vaults (F16/F01). Challenge library: all 15 sampled completed; needs real boards (F02/F03/F22), opponent replies (F04), completion records/next (F05/F06), copy (F11), grouped list (F21), Games Room entrance (F01). Quiet Wing classics: finishable; stamp claim (F12), art (F27).

## Site map
```
#/home (Desk) → games cards; Daily borough (~6,700px on phone); Quiet Wing invitation (~4,200px)
#/salon → /duel /tictactoe /regiongardens /blockcabinet (⋯ → Simple controls · Options · Cascade lab) /borough(?seed=) /archive (9) ; #/lab ; /dominoes /mahjong (URL only) ; #/club journal
#/quiet/… → realm · pets · garden · gallery · journal · folio · classics (13, footer 10px "Curated challenges") · challenges (95) → /challenges/<id> · castle
```
Tap counts from the phone desk: Games room 1; any game 2; Classics 1 (+4,200px scroll); first Archive vault 5 (+~8,600px scroll).

## Not verified
Physical devices, TalkBack, large system text, real touch drag, hosted origins, offline/update paths, private-room server, Realm/Companions/Garden interactions, Dominoes to completion, Cascade play, C22 claims, animation quality, real worker crashes.
