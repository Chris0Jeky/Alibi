"""Play the six Picture Logic studies, then restore their completion offline."""
import json
import os
import traceback
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from browser_master_grandmaster_controls import (
    assert_mutation_and_undo,
    current,
    dismiss_lesson,
    probe_geometry,
    solve,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'picture-controls'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
PUZZLES = json.loads(
    (ROOT / 'content/extra/keepers-picture-studies.json').read_text(encoding='utf-8')
)['puzzles']


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
                page.set_default_timeout(10000)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(URL + '/#/library')
                    page.wait_for_function(
                        '() => navigator.serviceWorker.controller && '
                        'AlibiDiagnostics.getStatus().offlineReady', timeout=30000,
                    )
                    for puzzle in PUZZLES:
                        puzzle_id = puzzle['id']
                        try:
                            context.set_offline(False)
                            page.goto(URL + f'/#/play/{puzzle_id}@1')
                            page.wait_for_function(
                                '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id',
                                arg=puzzle_id,
                            )
                            dismiss_lesson(page)
                            expect(page.locator('.board-card')).to_be_visible()
                            if page.evaluate('document.documentElement.scrollWidth > innerWidth'):
                                raise AssertionError('horizontal page overflow')
                            probe_geometry(page, puzzle, checks)
                            assert_mutation_and_undo(page, puzzle, checks, width)
                            solve(page, puzzle)
                            page.wait_for_function(
                                '() => Boolean(AlibiDiagnostics.getCurrent()?.completedAt) && '
                                'AlibiDiagnostics.getStatus().pendingSaves === 0',
                                timeout=30000,
                            )
                            completed = current(page)['completedAt']
                            context.set_offline(True)
                            page.reload()
                            page.wait_for_function(
                                '(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id && '
                                'Boolean(AlibiDiagnostics.getCurrent()?.completedAt)',
                                arg=puzzle_id,
                            )
                            restored = current(page)
                            if restored['completedAt'] != completed:
                                raise AssertionError('offline reload changed completion identity')
                            checks.append(f'{width}px controls, undo and offline restore: {puzzle_id}')
                            page.screenshot(path=str(OUT / f'{puzzle_id}-{width}.png'), full_page=True)
                        except Exception as error:
                            page.screenshot(path=str(OUT / f'failure-{puzzle_id}-{width}.png'))
                            failures.append({'id': puzzle_id, 'width': width, 'error': str(error),
                                             'traceback': traceback.format_exc()})
                        finally:
                            context.set_offline(False)
                    if errors:
                        failures.append({'width': width, 'pageErrors': errors})
                finally:
                    context.close()
        finally:
            browser.close()
    (OUT / 'receipt.json').write_text(json.dumps({
        'passed': not failures, 'checks': checks, 'failures': failures,
        'puzzles': [puzzle['id'] for puzzle in PUZZLES], 'widths': [390, 1440],
        'scope': 'Chromium controls and IndexedDB/offline evidence, not physical-device '
                 'touch, TalkBack, human difficulty or enjoyment calibration.',
    }, indent=2), encoding='utf-8')
    if failures:
        raise SystemExit(1)
    print(f'PASS {len(checks)} Picture Logic control checks', flush=True)


if __name__ == '__main__':
    run()
