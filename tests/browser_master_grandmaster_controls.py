"""Complete every Master/Grandmaster study through real browser controls."""
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
PUZZLES = PACK['puzzles']


def action(page, name, extra=''):
    page.locator(f'[data-action="{name}"]{extra}').first.click()


def cell(page, index):
    action(page, 'cell', f'[data-cell="{index}"]')


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
        page.keyboard.press('Escape')
    if page.locator('dialog[open]').count():
        page.locator('dialog[open] button').first.click()
    expect(page.locator('dialog[open]')).to_have_count(0)


def assert_cell_hit_target(page, index, checks, label):
    locator = page.locator(f'[data-action="cell"][data-cell="{index}"]').first
    expect(locator).to_be_visible()
    locator.evaluate('(element) => element.scrollIntoView({block: "center", inline: "center"})')
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


def aquarium_cell_for(puzzle, tank, level):
    rows = sorted(
        {
            index // puzzle['size']
            for index, value in enumerate(puzzle['tanks'])
            if value == tank
        },
        reverse=True,
    )
    if not 1 <= level <= len(rows):
        raise AssertionError(f"tank {tank} cannot use water level {level}")
    row = rows[level - 1]
    return next(
        index
        for index, value in enumerate(puzzle['tanks'])
        if value == tank and index // puzzle['size'] == row
    )


def operable_cells(page, puzzle):
    puzzle_type = puzzle['type']
    if puzzle_type == 'nonogram':
        return [
            0,
            puzzle['size'] * (puzzle['size'] // 2) + puzzle['size'] // 2,
            puzzle['size'] ** 2 - 1,
        ]
    if puzzle_type == 'binary':
        return [index for index, value in enumerate(puzzle['givens']) if value == -1]
    if puzzle_type in {'futoshiki', 'trail'}:
        return [index for index, value in enumerate(puzzle['givens']) if value == 0]
    if puzzle_type == 'lightup':
        return [index for index, wall in enumerate(puzzle['walls']) if wall == -2]
    if puzzle_type == 'tents':
        return [index for index, value in enumerate(puzzle['solution']) if value == 1]
    if puzzle_type == 'aquarium':
        return [
            aquarium_cell_for(puzzle, tank, 1)
            for tank in sorted(set(puzzle['tanks']))
        ]
    if puzzle_type == 'network':
        return list(range(puzzle['size'] ** 2))
    if puzzle_type == 'bridges':
        return [island['cell'] for island in puzzle['islands']]
    raise AssertionError(f'unhandled puzzle type: {puzzle_type}')


def probe_geometry(page, puzzle, checks):
    cells = operable_cells(page, puzzle)
    probes = tuple(dict.fromkeys((cells[0], cells[len(cells) // 2], cells[-1])))
    for index in probes:
        assert_cell_hit_target(page, index, checks, puzzle['id'])


def mutate_once(page, puzzle):
    puzzle_type = puzzle['type']
    if puzzle_type in {'nonogram', 'lightup', 'tents'}:
        index = operable_cells(page, puzzle)[0]
        cell(page, index)
        return
    if puzzle_type == 'binary':
        index = operable_cells(page, puzzle)[0]
        action(page, 'symbol', f'[data-value="{puzzle["solution"][index]}"]')
        cell(page, index)
        return
    if puzzle_type == 'futoshiki':
        index = operable_cells(page, puzzle)[0]
        cell(page, index)
        action(page, 'value', f'[data-value="{puzzle["solution"][index]}"]')
        return
    if puzzle_type == 'aquarium':
        tank = next(index for index, level in enumerate(puzzle['solution']) if level)
        action(page, 'brush', '[data-value="1"]')
        cell(page, aquarium_cell_for(puzzle, tank, 1))
        return
    if puzzle_type == 'network':
        index = next(index for index, turns in enumerate(puzzle['solution']) if turns)
        cell(page, index)
        return
    if puzzle_type == 'trail':
        index = operable_cells(page, puzzle)[0]
        action(page, 'trail-value', f'[data-value="{puzzle["solution"][index]}"]')
        cell(page, index)
        return
    if puzzle_type == 'bridges':
        graph = page.evaluate('(p) => AlibiCore.bridges.graph(p)', puzzle)
        edge_index = next(index for index, value in enumerate(puzzle['solution']) if value)
        edge = graph['edges'][edge_index]
        cell(page, puzzle['islands'][edge['a']]['cell'])
        cell(page, puzzle['islands'][edge['b']]['cell'])
        return
    raise AssertionError(f'unhandled puzzle type: {puzzle_type}')


def assert_mutation_and_undo(page, puzzle, checks, width):
    before = current(page)['state']
    mutate_once(page, puzzle)
    if current(page)['state'] == before:
        raise AssertionError(f'{puzzle["type"]} controls did not mutate the board')
    action(page, 'undo')
    if current(page)['state'] != before:
        raise AssertionError(f'{puzzle["type"]} undo did not restore the board')
    checks.append(f'{width}px {puzzle["id"]} mutates and undoes through actual controls')


def solve(page, puzzle):
    puzzle_type = puzzle['type']
    solution = puzzle['solution']
    if puzzle_type in {'nonogram', 'lightup', 'tents'}:
        for index, value in enumerate(solution):
            if value == 1:
                cell(page, index)
    elif puzzle_type == 'binary':
        for index, value in enumerate(solution):
            if puzzle['givens'][index] == -1:
                action(page, 'symbol', f'[data-value="{value}"]')
                cell(page, index)
    elif puzzle_type == 'futoshiki':
        for index, value in enumerate(solution):
            if not puzzle['givens'][index]:
                cell(page, index)
                action(page, 'value', f'[data-value="{value}"]')
    elif puzzle_type == 'aquarium':
        action(page, 'brush', '[data-value="1"]')
        for tank, level in enumerate(solution):
            if level:
                cell(page, aquarium_cell_for(puzzle, tank, level))
    elif puzzle_type == 'network':
        for index, turns in enumerate(solution):
            for _ in range(turns):
                cell(page, index)
    elif puzzle_type == 'trail':
        for index, value in enumerate(solution):
            if not puzzle['givens'][index]:
                action(page, 'trail-value', f'[data-value="{value}"]')
                cell(page, index)
    elif puzzle_type == 'bridges':
        edges = page.evaluate('(p) => AlibiCore.bridges.graph(p).edges', puzzle)
        for edge, value in zip(edges, solution):
            for _ in range(value):
                cell(page, puzzle['islands'][edge['a']]['cell'])
                cell(page, puzzle['islands'][edge['b']]['cell'])
    else:
        raise AssertionError(f'unhandled puzzle type: {puzzle_type}')


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
                page.set_default_timeout(10000)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(URL + '/#/library')
                page.wait_for_function(
                    '() => navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady',
                    timeout=30000,
                )
                for puzzle in PUZZLES:
                    puzzle_id = puzzle['id']
                    try:
                        page.goto(URL + f'/#/play/{puzzle_id}@{puzzle["revision"]}')
                        page.wait_for_function(
                            '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id',
                            arg=puzzle_id,
                        )
                        dismiss_lesson(page)
                        expect(page.locator('.board-card')).to_be_visible()
                        if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                            raise AssertionError('page has horizontal overflow')
                        probe_geometry(page, puzzle, checks)
                        assert_mutation_and_undo(page, puzzle, checks, width)
                        solve(page, puzzle)
                        page.wait_for_function(
                            '() => Boolean(AlibiDiagnostics.getCurrent()?.completedAt)',
                            timeout=30000,
                        )
                        snapshot = current(page)
                        if snapshot['puzzle']['id'] != puzzle_id or not snapshot['completedAt']:
                            raise AssertionError('completion did not retain the active study')
                        checks.append(f'{width}px actual controls complete {puzzle_id}')
                        page.screenshot(
                            path=str(OUT / f'{puzzle_id}-{width}.png'), full_page=True
                        )
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
        'puzzles': [puzzle['id'] for puzzle in PUZZLES],
        'scope': (
            'Every new study is completed through real Chromium DOM controls after an independent '
            'mutation/undo and pointer-hit test in simulated phone and desktop viewports; this is '
            'not a physical-device or human difficulty calibration.'
        ),
        'url': URL,
    }
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    if failures:
        raise SystemExit(1)
    print(f'PASS {len(checks)} Master/Grandmaster control checks', flush=True)


if __name__ == '__main__':
    run()
