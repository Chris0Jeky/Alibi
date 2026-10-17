# Native inset consumers: CAP-08 slice

Refs #120 and #130. The broader Android architecture and package/CI work are in PR #485.
This change does not add native App, back, keyboard, haptics or file-picker capabilities.

## Defect and chosen boundary

`capacitor.config.json` already selects core SystemBars `insetsHandling: css`, but the shared
UI's safe-area owners read only `env(safe-area-inset-*)`. Capacitor documents that older Android
WebViews can expose incorrect environment values and supplies `--safe-area-inset-*` instead.
The relevant source is [Capacitor 8 SystemBars](https://capacitorjs.com/docs/apis/system-bars),
checked on 29 September 2026. A browser with no native variables must keep its existing geometry.

Use `var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))` and the corresponding
other sides in a small **Android-only build layer**, `src/platform/native-insets.css`.
`tools/build-android.cjs` loads it into the already existing `alibi-native-ui` style slot. This
preserves the existing install/update control suppression and keeps all shared PWA styles
unchanged. The layer is included in both Android preview flavors and therefore in their existing
payload identity and asset receipts. No JavaScript listener, layout polling or native plugin is
needed to consume a CSS variable update.

Only the existing owners change: mobile navigation, quick-action sheet, Block Cabinet studio
and sticky controls, House content/dock/sheet and House toasts. Landscape left and right dock
insets are independent. There is no additional blanket root padding, which would stack with
existing component padding. Keep the existing breakpoint conditions, including House's zero
reserved dock space on desktop and its static dock on short landscape viewports.

## Regression method and result

`tests/browser_native_insets.py` loads the actual shared app, Block Cabinet and House CSS plus
the exact exported Android build style string into an isolated Chromium fixture. The native
layer precedes the shared CSS, matching the real generated index. Network requests are aborted.
It compares computed geometry, not stylesheet substrings, at 12 phone/landscape/tablet/desktop
sizes including 760/761 px, 768 px, 800/801 px and 480/481 px breakpoint edges. Three body modes
cover the ordinary shell, Block Cabinet and House.

Four stages per combination give **144 fixture checks**: unchanged zero/fallback geometry;
nonzero asymmetric native insets; live reset to zero; and unchanged ordinary PWA geometry even
when native variables exist. The test failed against the baseline's missing native variable
consumers. It also caught an initial override that incorrectly reintroduced House bottom space
in short landscape; the final media rules preserve that responsive contract.

Observed locally: all 144 passed in Chromium 144.0.7559.96. This is computed-style browser
fixture evidence from the archive-derived working tree, not a full app screenshot, installed
WebView result or physical-device acceptance. The workflow now checks out the explicit PR head,
runs these fixtures with its existing pinned Playwright setup, and retains a source/browser
receipt. Full Android payload and repository checks remain separate gates.

```sh
# After the existing requirements-dev.txt / Playwright setup:
python tests/browser_native_insets.py
# Only when using an already installed local Chromium:
ALIBI_CHROMIUM_EXECUTABLE=/usr/bin/chromium python tests/browser_native_insets.py
```

## Remaining acceptance

Keep #130 open. Still exercise actual cutouts, the declared WebView floor, system navigation
modes, IME/keyboard resizing, fullscreen transitions, predictive/root Back, large text, TalkBack,
and every affected real game view. Generic root/top/side layout, orientation and process-death
handling are not solved by this targeted padding-owner change. No save format, content ID,
application ID, permission, release signing or production publishing changes are included.
