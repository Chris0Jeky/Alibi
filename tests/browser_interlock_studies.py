"""Exercise every registered Interlock study using the existing real-control driver."""
import importlib.util
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def run():
    registry = json.loads(
        (ROOT / 'content' / 'official-packs.json').read_text(encoding='utf-8')
    )
    packs = [path for path in registry['packs'] if path.startswith('extra/interlock-')]
    if not packs:
        raise AssertionError('No registered Interlock collections to exercise')
    puzzles = []
    for path in packs:
        if not re.fullmatch(r'extra/interlock-[a-z0-9][a-z0-9_-]*\.json', path):
            raise AssertionError(f'Invalid Interlock pack path: {path}')
        pack = json.loads((ROOT / 'content' / path).read_text(encoding='utf-8'))
        if not pack['puzzles']:
            raise AssertionError(f'Empty Interlock collection: {path}')
        puzzles.extend(pack['puzzles'])
    ids = [puzzle['id'] for puzzle in puzzles]
    if len(set(ids)) != len(ids):
        raise AssertionError('Duplicate Interlock puzzle IDs in registered collections')
    spec = importlib.util.spec_from_file_location(
        'advanced_controls', ROOT / 'tests' / 'browser_master_grandmaster_controls.py'
    )
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    driver.PUZZLES = puzzles
    driver.OUT = ROOT / 'test-results' / 'interlock-study-controls'
    solve = driver.solve
    durability_checks = []

    def mutation_history_and_restart(page, puzzle, checks, width):
        before = driver.current(page)['state']
        driver.mutate_once(page, puzzle)
        changed = driver.current(page)['state']
        if changed == before:
            raise AssertionError('Actual controls did not change the board')
        driver.action(page, 'undo')
        if driver.current(page)['state'] != before:
            raise AssertionError('Undo did not restore the board')
        driver.action(page, 'redo')
        if driver.current(page)['state'] != changed:
            raise AssertionError('Redo did not restore the changed board')
        driver.action(page, 'restart')
        if page.locator('dialog[open]').count() != 1:
            raise AssertionError('Restart did not request confirmation')
        if driver.current(page)['state'] != changed:
            raise AssertionError('Restart erased progress before confirmation')
        driver.action(page, 'restart-confirm')
        page.wait_for_function(
            '(state) => JSON.stringify(AlibiDiagnostics.getCurrent()?.state) === JSON.stringify(state)',
            arg=before,
        )
        checks.append(f'{width}px {puzzle["id"]}: mutation, undo, redo and guarded restart')

    def photograph_solve_and_reopen(page, puzzle):
        width = page.viewport_size['width']
        page.screenshot(
            path=str(driver.OUT / f'unsolved-{puzzle["id"]}-{width}.png'), full_page=True
        )
        solve(page, puzzle)
        page.wait_for_function(
            '() => AlibiDiagnostics.getCurrent()?.completedAt && AlibiDiagnostics.getStatus().pendingSaves === 0',
            timeout=30000,
        )
        status = page.evaluate('AlibiDiagnostics.getStatus()')
        if status['saveError'] or status['mode'] != 'indexeddb':
            raise AssertionError(f'Completion is not durably saved in IndexedDB: {status}')
        saved = driver.current(page)
        page.goto(driver.URL + '/#/library')
        page.goto(driver.URL + f'/#/play/{puzzle["id"]}@{puzzle["revision"]}')
        page.wait_for_function(
            '(id) => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === id',
            arg=puzzle['id'],
        )
        restored = driver.current(page)
        if restored['state'] != saved['state'] or restored['completedAt'] != saved['completedAt']:
            raise AssertionError('Reopen lost the completed state or timestamp')
        page.context.set_offline(True)
        try:
            page.reload()
            page.wait_for_function(
                '(id) => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === id',
                arg=puzzle['id'], timeout=30000,
            )
            restored = driver.current(page)
            if restored['state'] != saved['state'] or restored['completedAt'] != saved['completedAt']:
                raise AssertionError('Offline reload lost the completed state or timestamp')
        finally:
            page.context.set_offline(False)
        durability_checks.append(f'{width}px {puzzle["id"]}: saved completion, reopen and offline reload')

    driver.assert_mutation_and_undo = mutation_history_and_restart
    driver.solve = photograph_solve_and_reopen
    receipt_path = driver.OUT / 'receipt.json'
    if receipt_path.exists():
        receipt_path.unlink()
    try:
        driver.run()
    finally:
        if receipt_path.exists():
            receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
            receipt['checks'].extend(durability_checks)
            receipt['scope'] = (
                'All registered Interlock studies, real DOM controls at 390 and 1440 pixels: '
                'geometry, mutation, undo, redo, confirmed restart, solve, IndexedDB completion, '
                'reopen and offline reload. Not physical-device or player-data calibration.'
            )
            receipt_path.write_text(json.dumps(receipt, indent=2), encoding='utf-8')


if __name__ == '__main__':
    run()
