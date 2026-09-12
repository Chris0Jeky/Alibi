"""Complete the non-Aquarium Expert records through real player controls."""
import json
import os
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'expert-control'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
PACK = json.loads((ROOT / 'content' / 'extra' / 'expert-families.json').read_text(encoding='utf-8'))
PUZZLES = [puzzle for puzzle in PACK['puzzles'] if puzzle['type'] != 'aquarium']


def action(page, name, extra=''):
    page.locator(f'[data-action="{name}"]{extra}').first.click()


def current(page):
    return page.evaluate('AlibiDiagnostics.getCurrent()')


def cell(page, index):
    action(page, 'cell', f'[data-cell="{index}"]')


def finish_lesson(page, puzzle):
    dialog = page.locator('dialog[open]')
    if not dialog.count():
        return
    if page.locator('[data-action="lesson-finish"]').count():
        action(page, 'lesson-example')
        if puzzle['type'] == 'scene':
            action(page, 'lesson-person')
        targets = {
            'scene': [5],
            'dossier': [0],
            'witness': [1],
            'nonogram': [1, 2, 3, 4],
            'lightup': [0],
            'tents': [1],
            'network': [1],
            'trail': [1],
            'binary': [1],
            'futoshiki': [3],
            'bridges': [2],
        }[puzzle['type']]
        for index in targets:
            action(page, 'lesson-tap', f'[data-cell="{index}"]')
        expect(page.locator('.lesson-success')).to_have_count(1)
        action(page, 'lesson-finish')
    elif page.locator('[data-action="close-dialog"]').count():
        action(page, 'close-dialog')
    else:
        dialog.locator('button').first.click()
    expect(page.locator('dialog[open]')).to_have_count(0)


def exercise_bridges_undo(page, puzzle):
    if puzzle['type'] != 'bridges':
        return False
    graph = page.evaluate('(p) => AlibiCore.bridges.graph(p)', puzzle)
    edge = graph['edges'][0]
    before = current(page)['state']
    cell(page, puzzle['islands'][edge['a']]['cell'])
    cell(page, puzzle['islands'][edge['b']]['cell'])
    if current(page)['state'] == before:
        raise AssertionError('bridge control did not change state before undo')
    action(page, 'undo')
    if current(page)['state'] != before:
        raise AssertionError('undo did not restore the pre-move bridge state')
    return True


def solve(page, puzzle):
    puzzle_type = puzzle['type']
    solution = puzzle['solution']
    wrong_witness = False
    if puzzle_type == 'scene':
        for person in puzzle['people']:
            action(page, 'person', f'[data-id="{person["id"]}"]')
            cell(page, solution[person['id']])
        victim = solution[puzzle['victim']]
        culprit = next(
            person['id']
            for person in puzzle['people']
            if person['id'] != puzzle['victim']
            and puzzle['rooms'][solution[person['id']]] == puzzle['rooms'][victim]
        )
        action(page, 'choose-accuse', f'[data-id="{culprit}"]')
        action(page, 'submit-accuse')
    elif puzzle_type == 'dossier':
        size = puzzle['size']
        for category in range(2):
            action(page, 'dossier-tab', f'[data-value="{category}"]')
            for row in range(size):
                index = category * size * size + row * size + solution[category * size + row]
                action(page, 'mark', f'[data-cell="{index}"]')
        culprit = solution[size:].index(puzzle['targetItem'])
        action(page, 'choose-accuse', f'[data-id="{culprit}"]')
        action(page, 'submit-accuse')
    elif puzzle_type == 'witness':
        wrong = (solution + 1) % puzzle['size']
        action(page, 'choose-accuse', f'[data-id="{wrong}"]')
        action(page, 'submit-accuse')
        if current(page)['completedAt'] is not None:
            raise AssertionError('wrong witness accusation completed the puzzle')
        wrong_witness = True
        action(page, 'choose-accuse', f'[data-id="{solution}"]')
        action(page, 'submit-accuse')
    elif puzzle_type in {'nonogram', 'lightup', 'tents'}:
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
    return wrong_witness


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks, failures = [], []
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
                for puzzle in PUZZLES:
                    try:
                        page.goto(URL + f'/#/play/{puzzle["id"]}@{puzzle["revision"]}')
                        page.wait_for_function(
                            '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id',
                            arg=puzzle['id'],
                        )
                        finish_lesson(page, puzzle)
                        if exercise_bridges_undo(page, puzzle):
                            checks.append(f'{width}px Bridges undo restores the Expert board')
                        if solve(page, puzzle):
                            checks.append(f'{width}px Expert Witness rejects a wrong conclusion')
                        page.wait_for_function('() => AlibiDiagnostics.getCurrent()?.completedAt')
                        snapshot = current(page)
                        if snapshot['puzzle']['id'] != puzzle['id'] or not snapshot['completedAt']:
                            raise AssertionError('completion did not retain the active Expert puzzle')
                        checks.append(f'{width}px actual controls complete {puzzle["id"]}')
                        if puzzle['type'] == 'bridges':
                            page.screenshot(path=str(OUT / f'expert-bridges-{width}.png'), full_page=True)
                    except Exception as error:
                        screenshot = OUT / f'failure-{width}-{puzzle["id"]}.png'
                        page.screenshot(path=str(screenshot), full_page=True)
                        failures.append(
                            {
                                'width': width,
                                'id': puzzle['id'],
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
        'excluded': 'expert-aquarium-01 has dedicated control coverage.',
        'url': URL,
        'scope': 'Real Chromium DOM controls in isolated contexts; simulated viewports, not a physical device.',
    }
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    if failures:
        raise SystemExit(1)
    print(f'PASS {len(checks)} Expert control checks', flush=True)


if __name__ == '__main__':
    run()
