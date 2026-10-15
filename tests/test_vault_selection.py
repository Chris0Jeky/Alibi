"""The Vault selector must coexist with other deferred official collections."""
import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class VaultSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='alibi-vault-selection-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'content' / 'extra').mkdir(parents=True)
        self.registry = json.loads((ROOT / 'content' / 'official-packs.json').read_text())
        self.vaults = [p for p in self.registry['packs'] if p.startswith('extra/vault-')]
        self.registry = {'packs': self.vaults[:], 'deferred': self.vaults[:]}
        for path in self.vaults:
            shutil.copyfile(ROOT / 'content' / path, self.root / 'content' / path)
        spec = importlib.util.spec_from_file_location('vault_selection_subject', ROOT / 'tests' / 'browser_vault_studies.py')
        self.subject = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.subject)
        self.subject.ROOT = self.root

    def selected(self):
        (self.root / 'content' / 'official-packs.json').write_text(json.dumps(self.registry))
        return self.subject.registered()

    def test_original_eighty_studies_still_selected_in_order(self):
        puzzles = self.selected()
        expected = []
        for path in self.vaults:
            expected.extend(json.loads((ROOT / 'content' / path).read_text())['puzzles'])
        self.assertEqual(puzzles, expected)
        self.assertEqual(len(puzzles), 80)

    def test_other_deferred_collection_does_not_replace_vault_coverage(self):
        self.registry['packs'].append('extra/interlock-routes.json')
        self.registry['deferred'].append('extra/interlock-routes.json')
        puzzles = self.selected()
        self.assertEqual(len(puzzles), 80)
        self.assertTrue(all(p['id'].startswith('vault-') for p in puzzles))

    def test_registered_vault_must_still_be_deferred(self):
        self.registry['deferred'].remove(self.vaults[0])
        with self.assertRaisesRegex(AssertionError, 'Vault pack'):
            self.selected()

    def test_unregistered_deferred_vault_is_rejected(self):
        self.registry['deferred'].append('extra/vault-missing.json')
        with self.assertRaisesRegex(AssertionError, 'Vault pack'):
            self.selected()

    def test_duplicate_deferred_vault_is_rejected(self):
        self.registry['deferred'].append(self.vaults[0])
        with self.assertRaisesRegex(AssertionError, 'Vault pack'):
            self.selected()

    def test_missing_vault_file_is_not_silently_skipped(self):
        (self.root / 'content' / self.vaults[0]).unlink()
        with self.assertRaises(FileNotFoundError):
            self.selected()


if __name__ == '__main__':
    unittest.main()
