"""Exercise representative Master/Grandmaster studies through real browser controls."""
import json
import math
import os
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'master-grandmaster-controls'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
PACK = json.loads(
    (ROOT / 'content' / 'extra' / 'master-grandmaster-studies.json').read_text(encoding='utf-8')
)
PUZZLES = {puzzle['id']: puzzle for puzzle in PACK['puzzles']}
CASES = (
    'master-study-nonogram-01',
    'master-study-bridges-01',
    'master-study-lightup-01',
)


def action(page, name, extra=''):
    page.locator(f'[data-action="{name}"]{extra}').first.click()


def current(page):
    return page.evaluate('AlibiDiagnostics.getCurrent()')


def dismiss_lesson(page):
    dialog = page.locator('dialog[open]')
    if not dialog.count():
        return
    close = dialog.locator('[data-action="close-dialog"]')
    if close.count():
        close.click()
    else:
        dialog.locator('button').first.click()
    expect(page.locator('dialog[open]')).to_have_count(0)


def assert_cell_hit_target(page, index, checks, label):
    locator = page.locator(f'[data-action="cell"][data-cell="{index}"]').first
    expect(locator).to_be_visible()
    locator.scroll_into_view_if_needed()
    box = locator.bounding_box()
    if not box:
        raise AssertionError(f'{label} cell {index} has no rendered box')
    values = (box['x'], box['y'], box['width'], box['height'])
    if not all(math.isfinite(value) for value in values):
        raise AssertionError(f'{label} cell {index} has non-finite geometry: {box}')
    if box['width'] < 12 or box['height'] < 12:
        raise AssertionError(f'{label} cell {index} is too small to operate: {box}')
    point = {'x': box['x'] + box['width'] / 2, 'y': box['y'] + box['height'] / 2}
    mapped = page.evaluate(
        """point => {
          const hit = document.elementFromPoint(point.x, point.y);
          return hit?.closest('[data-action="cell"][data-cell]')?.dataset.cell ?? null;
        }""",
        point,
    )
    if mapped != str(index):
        raise AssertionError(f'{label} center mapped to {mapped!r}, expected cell {index}')
    checks.append(f'{label} cell {index} has finite geometry and correct pointer mapping')


def exercise_nonogram(page, puzzle, checks):
    probes = (0, puzzle['size'] * (puzzle['size'] // 2) + puzzle['size'] // 2, puzzle['size'] ** 2 - 1)
    for index in probes:
        assert_cell_hit_target(page, index, checks, puzzle['id'])
    before = current(page)['state']
    page.locator('[data-action="cell"][data-cell="0"]').click(position={'x': 6, 'y': 6})
    if current(page)['state'] == before:
        raise AssertionError('Nonogram cell control did not mutate the board')
    action(page, 'undo')
    if current(page)['state'] != before:
        raise AssertionError('Nonogram undo did not restore the board')
    checks.append('15×15 Nonogram actual cell control mutates and undoes state')


def exercise_lightup(page, puzzle, checks):
    open_cells = [index for index, wall in enumerate(puzzle['walls']) if wall == -2]
    probes = (open_cells[0], open_cells[len(open_cells) // 2], open_cells[-1])
    for index in probes:
        assert_cell_hit_target(page, index, checks, puzzle['id'])
    before = current(page)['state']
    page.locator(f'[data-action="cell"][data-cell="{open_cells[0]}"]').click()
    if current(page)['state'] == before:
        raise AssertionError('Light Up cell control did not mutate the board')
    action(page, 'undo')
    if current(page)['state'] != before:
        raise AssertionError('Light Up undo did not restore the board')
    checks.append('7×7 Light Up actual cell control mutates and undoes state')


def exercise_bridges(page, puzzle, checks):
    graph = page.evaluate('(p) => AlibiCore.bridges.graph(p)', puzzle)
    edge_index = next(index for index, value in enumerate(puzzle['solution']) if value > 0)
    edge = graph['edges'][edge_index]
    endpoints = (puzzle['islands'][edge['a']]['cell'], puzzle['islands'][edge['b']]['cell'])
    for index in endpoints:
        assert_cell_hit_target(page, index, checks, puzzle['id'])
    before = current(page)['state']
    for index in endpoints:
        page.locator(f'[data-action="cell"][data-cell="{index}"]').click()
    if current(page)['state'] == before:
        raise AssertionError('Bridges endpoint controls did not create a bridge')
    action(page, 'undo')
    if current(page)['state'] != before:
        raise AssertionError('Bridges undo did not restore the board')
    checks.append('9×9 Bridges endpoint controls create and undo a bridge')


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks = []
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            for width in (390, 1440):
                context = browser.new_context(
                    viewport={'width': width, 'height': 1000}, reduced_motion='reduce'
                )
                page = context.new_page()
                page.set_default_timeout(7000)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(URL + '/#/library')
                page.wait_for_function(
                    '() => navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady',
                    timeout=30000,
                )
                for puzzle_id in CASES:
                    puzzle = PUZZLES[puzzle_id]
                    try:
                        page.goto(URL + f'/#/play/{puzzle_id}@{puzzle["revision"]}')
                        page.wait_for_function(
                            '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id', arg=puzzle_id
                        )
                        dismiss_lesson(page)
                        expect(page.locator('.board-card')).to_be_visible()
                        if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                            raise AssertionError('page has horizontal overflow')
                        if puzzle['type'] == 'nonogram':
                            exercise_nonogram(page, puzzle, checks)
                        elif puzzle['type'] == 'bridges':
                            exercise_bridges(page, puzzle, checks)
                        elif puzzle['type'] == 'lightup':
                            exercise_lightup(page, puzzle, checks)
                        else:
                            raise AssertionError(f'unhandled representative type: {puzzle["type"]}')
                        page.screenshot(
                            path=str(OUT / f'{puzzle_id}-{width}.png'), full_page=True
                        )
                        checks.append(f'{width}px actual-control pass for {puzzle_id}')
                    except Exception as error:
                        screenshot = OUT / f'failure-{width}-{puzzle_id}.png'
                        page.screenshot(path=str(screenshot), full_page=True)
                        failures.append(
                            {
                                'width': width,
                                'id': puzzle_id,
                                'error': str(error),
                                'traceback': traceback.format_exc(),
                                'active': current(page),
                                'screenshot': str(screenshot),
                            }
                        )
                if errors:
                    failures.append({'width': width, 'pageErrors': errors})
                context.close()
        finally:
            browser.close()
    receipt = {
        'passed': not failures,
        'checks': checks,
        'failures': failures,
        'widths': [390, 1440],
        'puzzles': list(CASES),
        'scope': (
            'Real Chromium DOM controls and pointer hit-testing in simulated phone and desktop '
            'viewports; not a physical-device or human difficulty calibration.'
        ),
        'url': URL,
    }
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    if failures:
        raise SystemExit(1)
    print(f'PASS {len(checks)} Master/Grandmaster control checks', flush=True)


if __name__ == '__main__':
    run()
