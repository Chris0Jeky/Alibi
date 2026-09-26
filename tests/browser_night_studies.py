"""Exercise every registered Night study using the existing real-control driver."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run():
    registry = json.loads(
        (ROOT / 'content' / 'official-packs.json').read_text(encoding='utf-8')
    )
    packs = [path for path in registry['packs'] if path.startswith('extra/night-')]
    if not packs:
        raise AssertionError('No registered Night collections to exercise')
    puzzles = []
    for path in packs:
        if not re.fullmatch(r'extra/night-[a-z0-9][a-z0-9_-]*\.json', path):
            raise AssertionError(f'Invalid Night pack path: {path}')
        pack = json.loads((ROOT / 'content' / path).read_text(encoding='utf-8'))
        if not pack['puzzles']:
            raise AssertionError(f'Empty Night collection: {path}')
        puzzles.extend(pack['puzzles'])
    ids = [puzzle['id'] for puzzle in puzzles]
    if len(set(ids)) != len(ids):
        raise AssertionError('Duplicate Night puzzle IDs in registered collections')
    spec = importlib.util.spec_from_file_location(
        'advanced_controls', ROOT / 'tests' / 'browser_master_grandmaster_controls.py'
    )
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    driver.PUZZLES = puzzles
    driver.OUT = ROOT / 'test-results' / 'night-study-controls'
    solve = driver.solve

    def photograph_and_solve(page, puzzle):
        width = page.viewport_size['width']
        page.screenshot(
            path=str(driver.OUT / f'unsolved-{puzzle["id"]}-{width}.png'), full_page=True
        )
        solve(page, puzzle)

    driver.solve = photograph_and_solve
    driver.run()


if __name__ == '__main__':
    run()
