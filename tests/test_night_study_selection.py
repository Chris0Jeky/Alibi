"""Test the real Night registry handoff, without starting a browser."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

SOURCE = Path(__file__).with_name('browser_night_studies.py')
# Replace only the browser boundary. Selection still reads real manifest/pack files
# and executes the actual wrapper, including its dynamic driver import.
DRIVER = '''
import json

def solve(page, puzzle):
    pass

def run():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'selection.json').write_text(json.dumps(PUZZLES), encoding='utf-8')
'''


class NightSelectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='alibi-night-selection-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'content' / 'extra').mkdir(parents=True)
        (self.root / 'tests').mkdir()
        (self.root / 'tests' / 'browser_master_grandmaster_controls.py').write_text(
            DRIVER, encoding='utf-8'
        )
        spec = importlib.util.spec_from_file_location('night_selection_subject', SOURCE)
        self.subject = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.subject)
        self.subject.ROOT = self.root

    def pack(self, name, *ids):
        puzzles = [{'id': value, 'revision': 1, 'title': 'Lantern café'} for value in ids]
        (self.root / 'content' / 'extra' / f'{name}.json').write_text(
            json.dumps({'puzzles': puzzles}, ensure_ascii=False), encoding='utf-8'
        )
        return puzzles

    def registry(self, *names):
        (self.root / 'content' / 'official-packs.json').write_text(
            json.dumps({'packs': list(names)}), encoding='utf-8'
        )

    def selected(self):
        self.subject.run()
        return json.loads(
            (self.root / 'test-results' / 'night-study-controls' / 'selection.json')
            .read_text(encoding='utf-8')
        )

    def test_new_registered_collection_is_not_silently_omitted(self):
        first = self.pack('night-gardens', 'garden-01')
        future = self.pack('night-atrium', 'atrium-01', 'atrium-02')
        self.registry('extra/night-gardens.json', 'extra/night-atrium.json')
        self.assertEqual(self.selected(), first + future)

    def test_new_collection_does_not_depend_on_the_original_three(self):
        future = self.pack('night-atrium', 'atrium-01')
        self.registry('extra/night-atrium.json')
        self.assertEqual(self.selected(), future)

    def test_registry_order_and_every_puzzle_are_preserved(self):
        symbols = self.pack('night-symbols', 'symbol-02', 'symbol-01')
        gardens = self.pack('night-gardens', 'garden-02', 'garden-01')
        self.registry('extra/night-symbols.json', 'extra/night-gardens.json')
        self.assertEqual(self.selected(), symbols + gardens)

    def test_unregistered_and_other_collections_are_excluded(self):
        expected = self.pack('night-gardens', 'garden-01')
        self.pack('night-unregistered', 'unregistered-01')
        self.pack('vault-sudoku', 'vault-01')
        self.registry('extra/vault-sudoku.json', 'extra/night-gardens.json')
        self.assertEqual(self.selected(), expected)

    def test_no_registered_night_pack_cannot_report_success(self):
        self.registry('extra/vault-sudoku.json')
        with self.assertRaisesRegex(AssertionError, 'No registered Night'):
            self.selected()

    def test_empty_registered_collection_cannot_report_success(self):
        self.pack('night-gardens')
        self.registry('extra/night-gardens.json')
        with self.assertRaisesRegex(AssertionError, 'Empty Night collection'):
            self.selected()

    def test_duplicate_puzzle_ids_cannot_inflate_coverage(self):
        self.pack('night-gardens', 'shared-01')
        self.pack('night-symbols', 'shared-01')
        self.registry('extra/night-gardens.json', 'extra/night-symbols.json')
        with self.assertRaisesRegex(AssertionError, 'Duplicate Night puzzle'):
            self.selected()

    def test_missing_registered_collection_is_not_silently_skipped(self):
        self.pack('night-gardens', 'garden-01')
        self.registry('extra/night-gardens.json', 'extra/night-missing.json')
        with self.assertRaises(FileNotFoundError):
            self.selected()

    def test_nested_night_path_is_rejected_before_reading(self):
        self.pack('night-gardens', 'garden-01')
        self.registry('extra/night-gardens.json', 'extra/night-escape/../../outside.json')
        with self.assertRaisesRegex(AssertionError, 'Invalid Night pack path'):
            self.selected()


if __name__ == '__main__':
    unittest.main()
