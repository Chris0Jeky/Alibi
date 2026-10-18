"""Negative artifact fixtures for native-only stylesheet delivery, not real builds."""
from pathlib import Path
import tempfile
import unittest

from native_inset_payload import load_native_style, validate_payloads

CSS = "html[data-alibi-target='android'] .mobile-nav { padding-bottom: var(--safe-area-inset-bottom); }"
LAYER = f'<style id="alibi-native-ui">{CSS}</style>'
WEB = '<html><head><link rel="stylesheet" href="./assets/app.css"></head><body></body></html>'
ANDROID = WEB.replace('<head>', '<head>' + LAYER)


class NativeInsetPayloadTest(unittest.TestCase):
    def test_returns_the_exact_emitted_style_not_a_source_fallback(self):
        self.assertEqual(validate_payloads(ANDROID, WEB, CSS), CSS)

    def test_missing_stale_duplicate_or_unclosed_native_layer_is_rejected(self):
        for html in [WEB, ANDROID.replace(CSS, "stale css"),
                     ANDROID.replace(LAYER, LAYER * 2), ANDROID.replace('</style>', ''),
                     ANDROID.replace('id="alibi-native-ui"', 'id="another"')]:
            with self.subTest(html=html), self.assertRaises(ValueError):
                validate_payloads(html, WEB, CSS)

    def test_source_css_cannot_silently_change_without_rebuilding(self):
        with self.assertRaises(ValueError):
            validate_payloads(ANDROID, WEB, CSS + "\n/* new source */")

    def test_native_layer_in_web_output_is_rejected_even_with_another_id(self):
        for extra in [LAYER, LAYER.replace('id="alibi-native-ui"', 'id="other"'),
                      '<style>body{padding:var(--safe-area-inset-bottom)}</style>']:
            with self.subTest(extra=extra), self.assertRaises(ValueError):
                validate_payloads(ANDROID, WEB.replace('<head>', '<head>' + extra), CSS)

    def test_layer_order_matches_the_computed_style_fixture(self):
        with self.assertRaises(ValueError):
            validate_payloads(WEB.replace('</head>', LAYER + '</head>'), WEB, CSS)

    def test_crlf_builds_preserve_exact_emitted_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            css = CSS + "\r\n/* retained CRLF */\r\n"
            for name, text in [('src/platform/native-insets.css', css),
                               ('dist-android/index.html', ANDROID.replace(CSS, css)),
                               ('dist/index.html', WEB)]:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(text.encode('utf-8'))
            self.assertEqual(load_native_style(root)[0], css)

    def test_missing_artifacts_never_fall_back_to_sources(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'src/platform').mkdir(parents=True)
            (root / 'src/platform/native-insets.css').write_text(CSS)
            with self.assertRaises(OSError):
                load_native_style(root)

    def test_loader_binds_both_indexes_and_rejects_external_stylesheet_leak(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name, text in [('src/platform/native-insets.css', CSS),
                               ('dist-android/index.html', ANDROID), ('dist/index.html', WEB),
                               ('dist/assets/app.css', 'body{margin:0}')]:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(text)
            style, receipt = load_native_style(root)
            self.assertEqual(style, CSS)
            for key in ('androidIndexSha256', 'webIndexSha256', 'nativeStyleSha256'):
                self.assertRegex(receipt[key], r'^[0-9a-f]{64}$')
            (root / 'dist/assets/app.css').write_text(CSS)
            with self.assertRaises(ValueError):
                load_native_style(root)


if __name__ == '__main__':
    unittest.main()
