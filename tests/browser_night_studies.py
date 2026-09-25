"""Exercise every registered Night study using the existing real-control driver."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAMES = ('night-gardens', 'night-routes', 'night-symbols')


def run():
    registry = json.loads((ROOT / 'content' / 'official-packs.json').read_text())
    packs = [name for name in NAMES if f'extra/{name}.json' in registry['packs']]
    if not packs:
        raise AssertionError('No registered Night collections to exercise')
    puzzles = []
    for name in packs:
        pack = json.loads((ROOT / 'content' / 'extra' / f'{name}.json').read_text())
        puzzles.extend(pack['puzzles'])
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
