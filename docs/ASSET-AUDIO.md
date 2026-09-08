# Alibi audio asset library

Current integration: all 24 Ogg derivatives are available in Field notes. Quiet Wing uses selected
recordings for actual place/remove/complete/companion/undo/redo feedback under the existing sound
preference, and offers four deliberate session-only atmospheres. Mute, background and disposal
stop playback. Auditory acceptance remains pending; it is not implied by browser playback tests.
See [EXPERIENCE-INTEGRATION.md](EXPERIENCE-INTEGRATION.md). The staged proposals and event map
below document the original production pass, before this runtime integration.

This fragment contains an original, deterministic local sound library for the Quiet Wing and
related calm game surfaces. It was initially staged separately from the runtime for auditory QA and a deliberate
optional-pack policy. The style is paper lamplight at a coastal club: felted wood, restrained
plucks, rounded bells, air and water. There are no external samples, remote generation jobs or
credentials.

## Contents and evidence

- `assets-source/library/audio/source/recipes.json` is the editable recipe source.
- `tools/assets/audio/generate_audio.py` is the reproducible NumPy/Python generator.
- `assets-source/library/audio/masters/` contains 24 48 kHz PCM WAV masters.
- `assets-source/library/audio/production/` contains matching Opus and Ogg derivatives.
- `assets-source/library/audio/catalogue.json` records relative paths, recipe hash, derivative
  hashes, measured duration, channels, peak/RMS levels, subsonic/DC measurements and ffprobe
  receipts for every file.
- `assets-source/library/audio/evidence/waveform-contact.png` is the waveform/contact evidence;
  `evidence/receipt.json` records the generation counts and evidence path.
- `assets-source/library/audio/preview.html` is a local preview with explicit `controls` and
  `preload="none"` on every track. It has no autoplay.

The library has 20 short cues and four ambient loops. Cue masters are 260–900 ms and the loops are
16, 18, 20 and 22 seconds. Cues target approximately -24 to -31 dBFS RMS; loops target -33 to
-35 dBFS RMS. The catalogue is the authoritative measured result. All four loops have a zero
endpoint sample delta after a deterministic boundary crossfade, and the generation receipt probes
both Opus and Ogg derivatives with ffprobe. The generator records spectral guardrails for every
asset; this pass measured 100% of FFT energy above 20 Hz, 0% subsonic energy and DC below -160 dBFS
in the quantised WAV masters.

Create a dedicated environment for the generator; the repository's normal development
environments are not assumed to contain NumPy or Pillow. The pinned route used for this asset
pass was Python 3.13 with `tools/assets/audio/requirements.txt`:

```powershell
py -3.13 -m venv .asset-audio-venv
.\.asset-audio-venv\Scripts\python.exe -m pip install -r tools/assets/audio/requirements.txt
```

An existing Python installation with the same pinned packages is also acceptable. Do not install
these dependencies globally. Regenerate only with an explicit overwrite choice:

```powershell
.\.asset-audio-venv\Scripts\python.exe tools/assets/audio/generate_audio.py
.\.asset-audio-venv\Scripts\python.exe tools/assets/audio/generate_audio.py --force
```

The first command refuses every existing output, including a byte-identical deterministic output.
The second command is the deliberate replacement operation. Generation is local and uses the
pinned NumPy/Pillow environment, Python `wave`, FFmpeg `libopus` and `libvorbis`, and ffprobe.

## Existing sound audit and mapping

The current Quiet Wing has a small Web Audio oscillator in `src/quiet-wing/app.js` (`feedback`):
`place` uses one sine tone, `erase` uses a lower sine tone, and `win` uses three sine tones. It is
already gated by `state.settings.sound`, resumed only after a user action, and suspended when the
page is hidden or disposed. Haptic feedback is independent (`navigator.vibrate`): a short single
tap for ordinary actions and `[15, 40, 15]` for `win`. Renderer and companion motion already read
the motion preference. The asset library does not modify these runtime paths.

Every new recording is `proposed` because it is playable in the production gallery, not bound to
the shipped game. `existing_event_status` separately records whether a generic runtime event already
exists. The table below describes those existing event hooks, not integration of these new recordings.

| Event | Catalogue cue | Library status | Existing event path |
| --- | --- | --- | --- |
| Place / build / plant | `ui-place-wood` | proposed | current generic path: `applyAt`, garden plant, `feedback('place')` |
| Remove / erase | `ui-remove-low` | proposed | current generic path: `applyAt` erase, `feedback('erase')` |
| Invalid move | `ui-invalid-gentle` | proposed | current generic path: classic move error, `feedback('erase')` |
| Completion / harvest / return | `ui-complete-calm` | proposed | current generic path: classic, garden, pet trip, export, `feedback('win')` |
| Pet greeting | `pet-greeting` | proposed | current generic path: `petAction('pet')`, generic `place` feedback |
| Pet play | `pet-play` | proposed | current generic path: `petAction('play')`, generic `win` feedback |
| Pet treat and rest | `pet-treat`, `pet-rest` | proposed | `petAction('treat'|'nap')` |
| Undo / redo | `ui-undo`, `ui-redo` | proposed | `realmAction('undo'|'redo')`, classic and bouquet undo |
| Navigation / open / close | `ui-navigation-page`, `ui-open-desk`, `ui-close-desk` | proposed | `navigate(path)`, route disposal, `modal()` |
| Focus / selection / tabs | `ui-focus-soft`, `ui-select-paper`, `ui-tab-switch` | proposed | tray, activity and gallery controls |
| Discover artwork / species / specimen | `ui-discover-glint` | proposed | `artSeen`, first companion species, garden collection |
| Settings toggles | `ui-toggle-on`, `ui-toggle-off` | proposed | `settings()` `data-setting` changes |
| Cancel / unavailable | `ui-cancel` | proposed | `cancel-tool`, modal close and unavailable actions; generic error is the current path |

## Integration contract

The runtime owner should keep audio behind the existing sound setting and require a deliberate user
gesture before creating or resuming an `AudioContext`. Ambient loops are optional atmosphere, never
an automatic product requirement. Stop or suspend them on route disposal, hidden page and failed
save/recovery states; do not add audio to the service worker or initial offline path without a budget
review. Use one shared ambient player rather than starting a new loop per render.

Mute is a hard gate: when `state.settings.sound` is false, stop active audio and do not queue a
replacement cue. Reduced motion should suppress optional ambient loops and decorative continuous
audio; short deliberate feedback may remain available, subject to the user's sound setting. Haptic
feedback stays separate from audio and must continue to work when sound is muted. The app already
has independent haptic and motion settings; no audio asset should infer or alter either preference.

All tracks are short and low level so overlapping UI actions remain calm. Do not normalize them up
to notification loudness, layer completion over a running ambient loop above the measured level, or
use the calm cues for warnings that require urgent attention. The existing `feedback` kinds are a
safe first integration path; proposed event-specific mappings can be introduced one seam at a
time with the existing browser checks.

Auditory listening was not possible in this agent session. Waveform/contact evidence, local WAV
generation, SHA-256 receipts and ffprobe decodability were inspected; a human listening pass remains
the appropriate final tonal and device-volume check before runtime integration.
