# Theatre controlled preference and offline-status checks

The existing browser suite now counts an ordinary ambience recording start,
then makes the reduced-preference read true without firing the separate stop
listener. A real ambience-select change must not construct another recording.
Audio and matchMedia are restored in finally. The offline-film check similarly
pins navigator.onLine false, checks immediately that no video source was assigned,
and restores the inherited property. Existing online playback is the positive
control. No production code changes.

Clean 72843be8's preserved release (web ce33c615123e) has unchanged source,
content and tools at current main f8d5093e. Serving that release at an isolated
local origin, source fixture 01cf6d25 passes all 102 actual browser checks at
390px/1280px, including autoplay recovery, with no runtime errors. Two separate
disposable browser-response mutations each remove exactly one compiled guard:
the reduced-preference mutation fails the new recording assertion; the offline
status mutation fails the immediate no-source assertion. Both ordinary controls
run before their corresponding failure. Helpers terminate their owned servers
and report cleanup clear.

The first added no-source assertion failed because Chromium network emulation
kept navigator.onLine true after reload; a probe measured that true value and
assigned source. This was a fixture assumption, not a demonstrated production
defect. The corrected test explicitly measures the controlled status branch.
Physical preference changes, phone offline detection and listening comfort are
not established. Fresh independent fixture review found no HIGH/CRITICAL defect.
Current-head hosted CI and age remain required; no build of the final docs head
or primary deployment is claimed. [HUMAN_TODO.md](../../HUMAN_TODO.md) retains
physical Android/TalkBack and owner acceptance.
