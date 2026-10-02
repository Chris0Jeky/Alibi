"""Emitted stylesheet closure, not a complete build or Android execution."""
from hashlib import sha256
from pathlib import Path
import tempfile
import unittest

from native_inset_stylesheets import load_shared_styles


class SharedStylesTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.paths = []
        for family, css in [('alibi', '.main{padding:105px}'),
                            ('block-motion', '#main{padding:0}'),
                            ('house', '.hx-experience{padding:0}')]:
            name = f'assets/{family}.{sha256(css.encode()).hexdigest()[:12]}.css'
            self.paths.append(name)
            for target in ('dist', 'dist-android'):
                file = self.root / target / name
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_text(css, encoding='utf-8')
        self.indexes(f'<link rel="stylesheet" href="./{self.paths[0]}">')

    def indexes(self, html):
        for target in ('dist', 'dist-android'):
            (self.root / target / 'index.html').write_text(html, encoding='utf-8')

    def test_uses_the_complete_emitted_core_and_both_optional_style_packs(self):
        css, entries = load_shared_styles(self.root)
        self.assertEqual(css, '.main{padding:105px}\n#main{padding:0}\n.hx-experience{padding:0}')
        self.assertEqual([entry['path'] for entry in entries], self.paths)
        for entry in entries:
            self.assertRegex(entry['sha256'], '^[0-9a-f]{64}$')
            self.assertGreater(entry['bytes'], 0)

    def test_missing_or_duplicate_linked_core_never_falls_back_to_sources(self):
        for html in ('', '<link rel="stylesheet">',
                     f'<link rel="stylesheet" href="./{self.paths[0]}">' * 2):
            self.indexes(html)
            with self.subTest(html=html), self.assertRaises(ValueError):
                load_shared_styles(self.root)

    def test_remote_traversal_query_and_unhashed_paths_fail(self):
        for href in ('https://example.invalid/app.css', '../app.css', '/app.css',
                     'assets/app.css', './'+self.paths[0]+'?v=1', './'+self.paths[0]+'#x',
                     'assets/%2e%2e/app.css'):
            self.indexes(f'<link rel="stylesheet" href="{href}">')
            with self.subTest(href=href), self.assertRaises(ValueError):
                load_shared_styles(self.root)

    def test_changed_bytes_cannot_reuse_the_old_fingerprint(self):
        (self.root / 'dist-android' / self.paths[0]).write_text('changed')
        with self.assertRaises(ValueError):
            load_shared_styles(self.root)

    def test_web_and_android_stylesheet_bytes_must_match(self):
        (self.root / 'dist' / self.paths[0]).write_text('different web')
        with self.assertRaises(ValueError):
            load_shared_styles(self.root)

    def test_different_link_order_or_inclusion_is_rejected(self):
        (self.root / 'dist/index.html').write_text('')
        with self.assertRaises(ValueError):
            load_shared_styles(self.root)

    def test_missing_or_ambiguous_optional_pack_is_rejected(self):
        file = self.root / 'dist-android' / self.paths[1]
        original = file.read_bytes()
        file.unlink()
        with self.assertRaises(ValueError):
            load_shared_styles(self.root)
        file.write_bytes(original)
        file.with_name('block-motion.' + 'a' * 12 + '.css').write_text('extra')
        with self.assertRaises(ValueError):
            load_shared_styles(self.root)

    def test_a_linked_extra_sheet_is_read_in_its_actual_cascade_order(self):
        css = '.main{padding-bottom:151px}'
        name = 'assets/extra.' + sha256(css.encode()).hexdigest()[:12] + '.css'
        for target in ('dist', 'dist-android'):
            (self.root / target / name).write_text(css)
        self.indexes(f'<link rel="stylesheet" href="./{self.paths[0]}">'
                     f'<link rel="stylesheet" href="./{name}">')
        joined, entries = load_shared_styles(self.root)
        self.assertEqual(entries[1]['path'], name)
        self.assertLess(joined.index('105px'), joined.index('151px'))

    def test_conditional_or_alternate_stylesheets_need_explicit_support(self):
        for attributes in ('media="print"', 'disabled', 'rel="alternate stylesheet"'):
            rel = '' if attributes.startswith('rel=') else 'rel="stylesheet"'
            self.indexes(f'<link {rel} {attributes} href="./{self.paths[0]}">')
            with self.subTest(attributes=attributes), self.assertRaises(ValueError):
                load_shared_styles(self.root)


if __name__ == '__main__':
    unittest.main()
