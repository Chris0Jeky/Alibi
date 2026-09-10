# Recorded room ambience

These optional derivatives replace the main room's procedural noise and pitched cues.
Silence remains the default. The browser downloads a recording only after a play gesture
and attempts to retain it for offline use. Cache eviction can make a connection necessary again.

- Window rain: Ylmir, [Rain (loopable)](https://opengameart.org/content/rain-loopable),
  28 March 2016, CC0. `source/1.ogg` is the first recording from
  `https://opengameart.org/sites/default/files/Rain%20OGG.zip`.
- Beach waves: jasinski, extracts submitted by qubodup,
  [Beach Ocean Waves](https://opengameart.org/content/beach-ocean-waves), 4 July 2012, CC0.
  The four `wave_01` through `wave_04` FLAC extracts derive from
  [alkaibeach.aif](https://freesound.org/people/jasinski/sounds/18363/).
  Their download names are `wave_0N_cc0-18363__jasinski__alkaibeach.flac` under
  `https://opengameart.org/sites/default/files/`.

Source and derivative hashes are in `catalogue.json`. Rebuild with
`python tools/build-ambience.py` and FFmpeg. Derivatives are mono 24 kHz, 48 kbit/s MP3;
level targets -24 dBFS RMS with a peak guard. Wave joins and the loop edge are crossfaded.
MP3 loop timing varies by browser. Machine checks do not certify pleasantness, speech-free
content, loop comfort or loudness on a physical phone; listening acceptance remains pending.
