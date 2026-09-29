# Emitted native inset delivery gate

PR #486 review follow-up, refs #130. The first computed-style test read the source-exported
`NATIVE_UI_CSS` constant. It could remain green if the builder stopped inserting that style.
It now reads `dist-android/index.html`, parses the one `alibi-native-ui` style and requires its
complete bytes to equal the source stylesheet. It also checks that the layer precedes shared
stylesheets, matching the fixture's cascade order. Missing output never falls back to source.

The corresponding web index must not contain that layer, even under a different style ID, and
emitted web CSS is checked for accidental native inset-variable consumers. The existing 144
computed-style scenarios use the extracted emitted layer, retain all zero/asymmetric/reset/PWA
assertions, and record both index hashes and the exact stylesheet hash in their receipt.

Eight dependency-free Python test groups cover good output, missing/stale/duplicate/unclosed
styles, wrong insertion order, source changes without rebuild, web leakage, missing files and
CRLF source/build bytes. The CRLF regression failed before replacing universal-newline source
reading with exact-byte reading. All eight groups passed locally; the modified browser driver
was syntax-checked. No fresh local build or full browser result is asserted because this
workspace cannot install the complete locked dependencies. Exact-head CI builds the actual
artifacts before invoking these tests and the full 144-case driver.

This closes an artifact-delivery test gap, not the physical-device gate. It adds no native
plugin, JavaScript lifecycle listener, new padding owner, save mutation, network call or byte
budget increase. Actual older-WebView inset injection, gesture navigation, IME, TalkBack and
phone comfort remain in #130/#131 and HUMAN_TODO.md / PHONE-SESSION.md. The fixtures are still
isolated Chromium geometry, not an instrumented or human-reviewed Android interface.
