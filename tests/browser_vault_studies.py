"""Open and complete every registered Vault study through actual browser controls.

The Vault definitions arrive in a deferred, precached chunk. This suite also proves the
fail-closed path: with the chunk unavailable, opening a Vault card shows a Retry notice and
creates no save; after the chunk becomes reachable, Retry opens the board.
"""
import importlib.util
import json
import os
import re
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'vault-study-controls'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
WIDTHS = (390, 1440)


def registered():
    registry = json.loads((ROOT / 'content' / 'official-packs.json').read_text(encoding='utf-8'))
    packs = [path for path in registry['packs'] if path.startswith('extra/vault-')]
    if sorted(packs) != sorted(registry.get('deferred', [])):
        raise AssertionError('Every registered Vault pack must be the deferred set')
    puzzles = []
    for path in packs:
        if not re.fullmatch(r'extra/vault-[a-z0-9-]+\.json', path):
            raise AssertionError(f'Invalid Vault pack path: {path}')
        puzzles.extend(
            json.loads((ROOT / 'content' / path).read_text(encoding='utf-8'))['puzzles']
        )
    if len(puzzles) != 80 or len({p['id'] for p in puzzles}) != 80:
        raise AssertionError(f'Expected 80 distinct Vault studies, found {len(puzzles)}')
    return puzzles


def load_driver():
    spec = importlib.util.spec_from_file_location(
        'advanced_controls', ROOT / 'tests' / 'browser_master_grandmaster_controls.py'
    )
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    # Sudoku uses the same select-cell-then-value keypad as Futoshiki.
    for name in ('operable_cells', 'mutate_once', 'solve'):
        original = getattr(driver, name)

        def wrapped(page, puzzle, *rest, _original=original):
            if puzzle['type'] == 'sudoku':
                return _original(page, {**puzzle, 'type': 'futoshiki'}, *rest)
            return _original(page, puzzle, *rest)

        setattr(driver, name, wrapped)
    return driver


def open_from_card(page, puzzle):
    """Find the study in the collection by title search and open its card."""
    key = f'{puzzle["id"]}@{puzzle["revision"]}'
    page.goto(URL + f'/#/library/{puzzle["type"]}')
    search = page.locator('input[type="search"]').first
    search.fill(puzzle['title'])
    card = page.locator(f'[id="library-card-{key}"]')
    expect(card).to_be_visible()
    card.click()
    page.wait_for_function(
        '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id', arg=puzzle['id']
    )


def unavailable_chunk(browser, puzzle, checks):
    """With the deferred chunk unreachable, opening creates no save and Retry recovers."""
    context = browser.new_context(
        viewport={'width': 390, 'height': 900}, service_workers='block', reduced_motion='reduce'
    )
    page = context.new_page()
    page.set_default_timeout(10000)
    blocked = {'on': True, 'hits': 0}

    def gate(route):
        blocked['hits'] += 1
        if blocked['on']:
            route.abort()
        else:
            route.continue_()

    page.route(re.compile(r'.*/assets/official-deferred\.[a-f0-9]{12}\.js$'), gate)
    try:
        page.goto(URL + '/#/library')
        page.wait_for_function('() => globalThis.AlibiDiagnostics')
        if page.evaluate('ALIBI_DEFERRED.ready'):
            raise AssertionError('deferred definitions loaded despite the blocked chunk')
        open_card = page.locator(
            f'[id="library-card-{puzzle["id"]}@{puzzle["revision"]}"]'
        )
        page.goto(URL + f'/#/library/{puzzle["type"]}')
        page.locator('input[type="search"]').first.fill(puzzle['title'])
        open_card.click()
        dialog = page.locator('dialog[open]')
        expect(dialog).to_contain_text('has not downloaded yet')
        counts = page.evaluate('AlibiDiagnostics.getCounts()')
        if counts['records'] != 0 or page.evaluate('AlibiDiagnostics.getCurrent()'):
            raise AssertionError(f'a save was created from a listing entry: {counts}')
        if page.evaluate('ALIBI_DEFERRED.ready'):
            raise AssertionError('a failed chunk was marked ready')
        blocked['on'] = False
        dialog.locator('[data-action="open"]').click()
        page.wait_for_function(
            '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id', arg=puzzle['id']
        )
        if not page.evaluate('ALIBI_DEFERRED.ready'):
            raise AssertionError('Retry opened a board without the full definitions')
        if blocked['hits'] < 2:
            raise AssertionError('Retry did not request the chunk again')
        checks.append(f'unavailable chunk: {puzzle["id"]} shows Retry, saves nothing, then opens')
    finally:
        context.close()


def run():
    puzzles = registered()
    driver = load_driver()
    OUT.mkdir(parents=True, exist_ok=True)
    checks, failures = [], []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            try:
                unavailable_chunk(browser, puzzles[0], checks)
            except Exception as error:
                failures.append({'scenario': 'unavailable-chunk', 'error': str(error),
                                 'traceback': traceback.format_exc()})
            for width in WIDTHS:
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
                page.wait_for_function('() => ALIBI_DEFERRED.ready', timeout=30000)
                for puzzle in puzzles:
                    puzzle_id = puzzle['id']
                    try:
                        open_from_card(page, puzzle)
                        driver.dismiss_lesson(page)
                        expect(page.locator('.board-card')).to_be_visible()
                        if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                            raise AssertionError('page has horizontal overflow')
                        opened = driver.current(page)['puzzle']
                        if opened != puzzle:
                            raise AssertionError('the opened run is not the full published definition')
                        driver.probe_geometry(page, puzzle, checks)
                        driver.assert_mutation_and_undo(page, puzzle, checks, width)
                        driver.solve(page, puzzle)
                        page.wait_for_function(
                            '() => Boolean(AlibiDiagnostics.getCurrent()?.completedAt)',
                            timeout=30000,
                        )
                        checks.append(f'{width}px actual controls open and complete {puzzle_id}')
                    except Exception as error:
                        screenshot = OUT / f'failure-{width}-{puzzle_id}.png'
                        page.screenshot(path=str(screenshot), full_page=True)
                        failures.append({'width': width, 'id': puzzle_id, 'error': str(error),
                                         'traceback': traceback.format_exc(),
                                         'screenshot': str(screenshot)})
                if errors:
                    failures.append({'width': width, 'pageErrors': errors})
                context.close()
        finally:
            browser.close()
    receipt = {
        'passed': not failures,
        'checks': checks,
        'failures': failures,
        'widths': list(WIDTHS),
        'puzzles': [puzzle['id'] for puzzle in puzzles],
        'scope': (
            'Every registered Vault study is opened from its collection card and completed '
            'through real Chromium DOM controls after a mutation/undo and pointer-hit test in '
            'simulated phone and desktop viewports, plus one unavailable-chunk Retry scenario. '
            'Not a physical-device or human difficulty calibration.'
        ),
        'url': URL,
    }
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    if failures:
        print(json.dumps(failures[:5], indent=2))
        raise SystemExit(1)
    print(f'PASS {len(checks)} Vault control checks over {len(puzzles)} studies', flush=True)


if __name__ == '__main__':
    run()
