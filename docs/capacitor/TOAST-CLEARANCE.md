# Populated ordinary toast repair

PR #486, 30 September 2026, review `4139456888`. Ordinary toasts retained their 83px mobile
bottom offset while the native dock grew. The new populated-toast fixture reproduced a 14px
overlap at a 390px viewport with a 32px inset. Ordinary mobile toasts now add the native inset
to that existing 83px base; desktop placement is unchanged and House retains its separate 92px
owner. The toast remains non-interactive, as in app.js; this patch does not invent toast action
buttons or change horizontal centering, dimensions, stacking or pointer behavior.

The new 252 scenarios cover all fourteen existing viewport boundaries, six body modes and
0/32/80px insets. They check the populated toast rectangle stays above a visible ordinary dock,
retains its baseline gap, and does not intercept the navigation button. House, hidden-dock,
desktop, reset and PWA cases preserve their respective positioning contracts. The normal driver
passes the same actual emitted native and complete shared styles into these tests, bringing the
fixture total to 900. All 900 passed locally using the complete recovered source cascade in
Chromium 144.0.7559.96, along with the existing twenty artifact/leak/stylesheet unit-test groups.
Fresh emitted-output CI and independent review remain necessary; none of this is physical-device
or native inset-injection acceptance. See NATIVE-INSET-DELIVERY.md for the retained full-cascade
and scrollable-content contracts. No shared PWA CSS, save, permission or dependency changed.
