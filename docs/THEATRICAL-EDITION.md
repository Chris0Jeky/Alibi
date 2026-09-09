# The theatrical edition

Alibi is a place to spend time as well as a puzzle cabinet. The atmosphere follows the current
visit, or the player can choose one room to carry through the app. The eight scenes live in
`content/theatre.json`; `src/theatre.js` owns presentation only. It cannot change puzzle answers,
completion, clocks, saves or rewards. The existing 324 puzzles and revision identities stay intact.

## Rooms and coverage

| Room | Local art and motion | Sound character | Routes / activities |
| --- | --- | --- | --- |
| Lighthouse | Storm painting, beacon emblem, rain | Low coastal tone and filtered weather | Bellweather, scene, witness |
| Under glass | Conservatory painting, leaf emblem, drifting pollen | Warm glasshouse tones | Glasshouse, tents, lightup, nonogram, garden |
| Midnight line | Train painting, rail emblem, passing lights | Evening rhythm and low tone | Night Train, trail, network |
| Map room | Map painting, compass emblem, moving tide | Coastal sound bed | Cartographer, bridges, aquarium, realm |
| Lamplight & paper | Original reading room, book emblem, drifting dust | Library tone and air | Sudoku, futoshiki, dossier, classics, challenges, journal, Field notes |
| Drawing room | Briar House painting, key emblem, dust | Lower library register | Archive Heist, pets/companions |
| Winter gallery | Hiroshige’s complete Kanbara print, star emblem, snow | Higher evening register | Binary, calm, gallery |
| Little harbour | Original town painting, harbour emblem, tide | Water and a low harbour tone | Pocket Borough, city, Canvas atlas |

The first five also have photographic alternatives. Winter can use sharper detail of the same
credited museum work. The drawing room and harbour deliberately keep their authored paintings.
Photos, museum works and decorative previews contain no puzzle-only information.

## What makes the rooms eventful

- Eight original line emblems and six CSS weather treatments share the same visual palette.
  Each decorated stage has eight particles and one glow layer, with no layout polling loop.
- “Notice a little detail” reveals a scene-specific observation and a short glimmer. These are
  fictional atmosphere, never a fake achievement or an obligation to return at a certain time.
- Explicit room sound creates a local procedural composition immediately: a scene-specific tone
  and deterministic filtered weather. Eligible online sessions may crossfade to one of the four
  existing original recorded ambience loops. Four-second startup/stall bounds restore local sound.
- Deliberate placement and completed-puzzle actions can produce soft locally synthesised cues.
  Cues are rate-limited and disconnect after playback. Sound is off on each new document.
- The screening room offers four existing original motion studies: Quiet Wing, Bridges,
  Lamplight and Earned Stamp. No film downloads before its play button. Native video controls,
  Escape/close cleanup and an eight-second startup bound keep navigation usable. Films are an
  explicitly connected extra; the interactive worlds and art remain useful without them.
- The Quiet Wing invitation and Field notes collection lead into the existing interactive
  library: three realm scenes, 43 modules, 32 companion expressions, 24 sound assets, eight films
  and ten editorial images. Models have local previews and working controls, companions retain
  their expressions, and the garden can produce a real postcard. Full Field notes offline media
  is a separate explicit download, not silently bundled into core installation.

The historical 116-puzzle introduction films remain labelled in Field notes; the screening-room
selection avoids using them to advertise the current 324-puzzle edition. No new video generation
or paid asset service is necessary for this release.

## Comfort and performance

The visible rail exposes Room sound, Still the room and Painted/Rich edition controls. Room and
image preferences persist locally. Reduced-motion, hidden documents and Zen stop decorative
motion and room audio; returning to the foreground does not unexpectedly restart sound. Films
pause when hidden, and route disposal closes them. The single-file preview includes all local
room artwork and procedural sound, and honestly labels films as a hosted-edition feature.
Night, stronger contrast and large text are supported. Game boards remain clear and usable;
atmospheric layers cannot intercept pointer input. Physical sensory/accessibility acceptance is
still [HUMAN_TODO.md](../HUMAN_TODO.md) q-2/q-4, not inferred from browser screenshots.

CSS minification keeps the expanded cascade within the existing 32 KiB gzip budget. Initial JS
stays below 125 KiB gzip, code plus official data below 200 KiB gzip, and the core shell retains
its existing budgets. Photos/detail are accounted separately. Runtime package-CDN JavaScript is
unnecessary: libraries remain bundled and optional engines stay lazy within a coherent release.

## Verification

`npm run verify` checks scene coverage, source files, decoded images, cache races, failure bounds
and existing engines/storage/build contracts. `tests/browser_theatre.py` uses actual controls at
390px and 1280px: all eight offline rooms, keyboard choices, semantic state, sound creation and
disposal, preference reload, Night heading contrast, film playback/cleanup and runtime errors.
The delivery, origin, UI and two-tab update suites remain separate proving layers. Provider
receipts and hosted headers must be checked on the deployed origins; simulated failures cannot
certify a real provider. Release-specific results belong in `RELEASE-0.8.0.md`.
