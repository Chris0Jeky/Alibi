# Emitted native inset delivery gate

PR #486 review follow-up, refs #130. The first computed-style test read the source-exported
`NATIVE_UI_CSS` constant. It could remain green if the builder stopped inserting that style.
It now reads `dist-android/index.html`, parses the one `alibi-native-ui` style and requires its
complete bytes to equal the source stylesheet. It also checks that the layer precedes shared
stylesheets, matching the fixture's cascade order. Missing output never falls back to source.

The corresponding web index must not contain that layer, even under a different style ID, and
emitted web CSS is checked for accidental native rules. The original 144 computed-style scenarios
use the extracted emitted layer, retain zero/asymmetric/reset/PWA assertions, and record both index
hashes and the exact stylesheet hash in their receipt.

## Scrollable-content and partial-leak review repairs

Review at `96cbcb9` found that the fixed dock grew with the native bottom inset but `.main` did
not reserve its extra height. At a 390px viewport with a 32px inset the local regression observed
93px content reservation against a 97px dock. The native layer now preserves each original base
(95px above 430px, 93px for the small desk and 89px for the small player) and adds the inset once
at the content owner. Shared CSS and child controls do not change. Existing ID-specific House
and fullscreen Block overrides retain zero outer padding when they hide that dock.

The new helper exercises actual `#main`, `.shell.playing` and body selectors across ten breakpoint
and orientation cases, three body modes, two playing states, and insets 0/32/80px: 180 additional
geometry cases. It checks the same document-to-dock gap, unmodified other sides, hit-tests the
last scrollable action above the dock, and tests live reset and web isolation. Four synthetic
phone/tablet screenshots are retained by CI; they are geometry evidence, not a full-app visual
review. The existing browser driver supplies the **emitted** native CSS to both test groups.

The leakage predicate now rejects the Android target attribute in inline and external web CSS,
not just inset variables or the complete stylesheet. Three added unittest groups cover partial
install/update/panel suppression, minified/unquoted/case variants, and valid ordinary web controls.
Twelve subcases failed against the old predicate and pass with the repair.

## Verification scope

The 180 new geometry cases passed locally in Chromium 144.0.7559.96 after reproducing the
missing-reservation failure. The three leakage groups passed after the twelve expected failures.
Local shared CSS bytes match their exact Git blobs at `96cbcb9`. Local geometry used recovered
source CSS, not a fresh complete build: locked npm installation remains blocked by missing cached
`youch-core@0.3.3`. Current-head CI must run all 324 emitted-layer geometry scenarios, the retained
eight artifact groups, the new leakage groups, and full repository/control verification.

This closes artifact-delivery and scroll-reservation gaps, not the physical-device gate. No native
plugin, lifecycle listener, save mutation, network call or budget increase is introduced. Actual
older-WebView inset injection, gestures, IME, TalkBack and phone comfort remain in #130/#131,
HUMAN_TODO.md and PHONE-SESSION.md.
