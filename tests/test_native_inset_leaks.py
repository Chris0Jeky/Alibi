"""Partial native-only CSS must not escape into any web stylesheet."""
from pathlib import Path
import tempfile
import unittest
from native_inset_payload import validate_payloads, load_native_style

NATIVE = "html[data-alibi-target='android'] .main{padding-bottom:var(--safe-area-inset-bottom)}"
WEB = '<link rel="stylesheet" href="app.css">'
ANDROID = '<style id="alibi-native-ui">' + NATIVE + '</style>' + WEB
FRAGMENTS = (
    'html[data-alibi-target="android"] [data-action="install"]{display:none!important}',
    "html[data-alibi-target='android'] [data-action='check-update']{display:none}",
    '[data-alibi-target=android] .settings-grid>.panel:has([data-action=install]){display:none}',
    '[DATA-ALIBI-TARGET = "android"] .main{padding-bottom:95px}',
)


class NativeInsetLeakTest(unittest.TestCase):
    def test_every_partial_native_selector_fails_even_under_an_unrelated_style_id(self):
        for fragment in FRAGMENTS:
            for attrs in ('', ' id="unrelated"'):
                with self.subTest(fragment=fragment, attrs=attrs), self.assertRaises(ValueError):
                    validate_payloads(ANDROID, WEB + f'<style{attrs}>{fragment}</style>', NATIVE)

    def test_external_minified_partial_rules_also_fail(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            for name, text in [('dist-android/index.html', ANDROID), ('dist/index.html', WEB),
                               ('src/platform/native-insets.css', NATIVE)]:
                file = root / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(text, encoding='utf-8')
            css = root / 'dist/app.css'
            for fragment in FRAGMENTS:
                css.write_text(fragment, encoding='utf-8')
                with self.subTest(fragment=fragment), self.assertRaises(ValueError):
                    load_native_style(root)

    def test_ordinary_web_control_styles_remain_valid(self):
        style = '[data-action=install]{display:flex}.settings-grid{padding:1rem}'
        self.assertEqual(validate_payloads(ANDROID, WEB + f'<style>{style}</style>', NATIVE), NATIVE)


if __name__ == '__main__':
    unittest.main()
