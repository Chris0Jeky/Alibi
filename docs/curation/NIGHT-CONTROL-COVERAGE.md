# Registered Night control coverage

Follow-up to the browser-discovery review on #342, tracked under #161.
The previous wrapper named only Gardens, Routes and Symbols. A fourth registered
Night pack matched the workflow trigger but was silently omitted from its board list.

The wrapper now takes Night paths from `content/official-packs.json`, in registry
order, and passes every puzzle to the existing phone/desktop control driver. It
reads only direct `extra/night-*.json` pack paths, not a filesystem glob. Unregistered
files and other collections remain outside this lane. Missing, empty or malformed
Night paths and duplicate puzzle IDs fail instead of inflating coverage. UTF-8 pack
text is read explicitly. Real-control actions, screenshots and receipts are unchanged.

`python tests/test_night_study_selection.py -v` checks the actual registry handoff
with temporary manifest/pack files. Only the browser boundary is replaced by a
recording driver. Nine checks pass locally; seven failed against the exact previous
wrapper blob `94861909608e20da030228c0888c368760e25127`. Cases include a fourth pack,
a future-only registry, registry/puzzle order, exclusions, no selected pack, an empty
pack, duplicate IDs, a missing file and a nested path. These are selection tests,
not a claim that browser play or physical-device acceptance ran locally.

The existing read-only Night workflow runs these checks before installing browser
build dependencies, then retains its complete actual-control matrix. Changes to the
new test file trigger that lane. No runtime, puzzle definition, published ID/revision,
save format, dependency, budget, workflow permission or deployment changes occur.

Require exact-head full Verify and Night controls plus independent review before
merge. #161 and HUMAN_TODO q-8 remain open for human difficulty and explanation
quality; physical Android and TalkBack remain separate acceptance.
