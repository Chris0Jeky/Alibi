# Emitted native inset delivery gate

PR #486, refs #130. This is source/artifact/browser-fixture work, not physical Android acceptance.

## Full-cascade correction after review

Review discussion_r4139358230 found a real regression in the preceding `27bcf3f` patch: its
95/93/89px bases came only from app.css. The emitted core stylesheet also contains cabinet.css,
expedition.css, club.css, atmosphere.css, curation.css, after-hours.css and theatre.css, in that
order. At 390px the native override reduced the real 105px cabinet reservation to 93px, and the
108px player reservation to 89px, even with zero insets. The old fixture omitted cabinet.css and
could pass despite this regression. Those earlier green runs do not establish full-cascade safety.

The native layer no longer overrides `.main` padding at all. It adds only the fixed dock's extra
native height as an outer bottom margin. Existing shared padding, including important Club
variants and later responsive overrides, stays authoritative. House is excluded because it owns
another dock; existing ID-specific Block and important Zen margin rules keep zero extra margin
when the ordinary dock is hidden. The generated UI layer remains Android-only. No shared web CSS,
JavaScript layout listener, child-control padding, saved state, plugin or budget ceiling changes.

## Test the styles that actually ship

`native_inset_stylesheets.py` reads the ordered stylesheet URLs from both emitted indexes. It
requires the complete fingerprinted Alibi core stylesheet and both emitted Block Motion and House
packs, checks filename hashes and exact web/Android byte equality, and records each path, byte
count and full SHA-256 in the receipt. It refuses missing, duplicate, ambiguous, stale, remote,
escaping or conditional styles rather than silently using source CSS or a guessed partial list.
New inline/conditional styling requires explicit fixture support. The normal browser driver has
no source fallback. Optional packs are composed after the core for these isolated component modes.

The original 144 asymmetric-inset/reset/web-isolation cases are retained and now use that complete
emitted cascade. Scrollable-content coverage expands to 504 cases: fourteen breakpoint/orientation
viewports, six body modes (plain, Block, House, Club home, Club experiment, Zen), two playing states,
and bottom insets 0/32/80px. Every case preserves the exact baseline padding and other sides;
visible-dock cases preserve the total outer reservation gap and hit-test the final scrollable
control above the dock. Hidden-dock, reset and ordinary-web cases retain their baseline geometry.
Four scroll-end screenshots remain synthetic fixture evidence, not a full-app visual acceptance.

## Native layer and web isolation

The native layer is extracted from the actual Android index and must match the complete current
source bytes exactly, occur once, and precede shared stylesheets. Web inline and external styles
reject both inset-variable consumers and partial Android-target rules such as install/update
suppression, including transformed fragments without inset variables. The receipt binds both
indexes, the native layer and all shared stylesheet bytes.

## Observed evidence and remaining gates

The 390px full-cascade regression failed before removing the padding overrides and passed after
repair, retaining 105px and 108px respectively. All 648 local component/content cases passed with
the recovered complete source cascade in Chromium 144.0.7559.96. Nine new stylesheet-closure
unittest groups and three retained partial-leak groups passed locally. These are source/synthetic
results: local complete locked npm installation remains unavailable. Exact-head CI must build and
run all 648 cases against the emitted, hash-checked cascade plus the retained eight native-artifact
unittest groups and full repository/control checks. No fresh CI pass is asserted by this document.

Older-WebView injection, real cutouts, gestures, IME, TalkBack, phone comfort and sustained play
remain in #130/#131, HUMAN_TODO.md and PHONE-SESSION.md. Neither fixture counts nor an emulator
close those physical-device gates.
