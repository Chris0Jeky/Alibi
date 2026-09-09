"""Responsive player controls and overflow regression for narrow large-text layouts."""

import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'edge-layout'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8796')


def set_toggle(page, selector, enabled):
    control = page.locator(selector)
    if control.is_checked() != enabled:
        control.check() if enabled else control.uncheck()


def close_lesson(page):
    dialog = page.locator('dialog[open]')
    if dialog.count():
        dialog.locator('[data-action="close-dialog"]').click()


def measurements(page):
    return page.evaluate(
        """() => {
          const rect = (selector) => {
            const node = document.querySelector(selector);
            if (!node) return null;
            const box = node.getBoundingClientRect();
            return {left: box.left, right: box.right, width: box.width};
          };
          return {
            innerWidth: window.innerWidth,
            scrollWidth: document.documentElement.scrollWidth,
            boardColumn: rect('.board-column'),
            evidenceColumn: rect('.evidence-column'),
            secondary: rect('.play-secondary'),
          };
        }"""
    )


def open_puzzle(page, puzzle_id):
    page.goto(f'{URL}/#/play/{puzzle_id}@1')
    page.wait_for_function(
        '(id) => window.AlibiDiagnostics?.getCurrent()?.puzzle?.id === id',
        arg=puzzle_id,
    )
    close_lesson(page)


with sync_playwright() as playwright:
    launch = {'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('CHROMIUM_PATH'):
        launch['executable_path'] = os.environ['CHROMIUM_PATH']
    elif Path('/usr/bin/chromium').exists():
        launch['executable_path'] = '/usr/bin/chromium'
    browser = playwright.chromium.launch(**launch)
    context = browser.new_context(viewport={'width': 320, 'height': 640}, reduced_motion='reduce')
    page = context.new_page()
    page.set_default_timeout(5000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    page.goto(f'{URL}/#/settings')
    page.wait_for_selector('#setting-largeText')
    set_toggle(page, '#setting-contrast', False)
    set_toggle(page, '#setting-largeText', False)
    open_puzzle(page, 'sudoku-01')
    normal_320 = measurements(page)
    page.goto(f'{URL}/#/settings')
    page.wait_for_selector('#setting-largeText')
    set_toggle(page, '#setting-largeText', True)
    open_puzzle(page, 'sudoku-01')
    large_320 = measurements(page)
    page.screenshot(path=str(OUT / '320-sudoku.png'), full_page=True)

    # Exercise a real board control after the settings transition.
    sudoku = page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
    blank = next(index for index, value in enumerate(sudoku['givens']) if not value)
    page.locator(f'[data-action="cell"][data-cell="{blank}"]').click()
    value = sudoku['solution'][blank]
    page.locator(f'[data-action="value"][data-value="{value}"]').click()
    control_state = page.evaluate('AlibiDiagnostics.getCurrent().state')
    control_applied = control_state['cells'][blank] == value

    all_measurements = {'normal320': normal_320, 'large320': large_320}
    for width, height in [(390, 900), (640, 360), (1440, 900)]:
        page.set_viewport_size({'width': width, 'height': height})
        for puzzle_id in ['sudoku-01', 'scene-01', 'aquarium-01']:
            open_puzzle(page, puzzle_id)
            all_measurements[f'{width}-{puzzle_id}'] = measurements(page)

    def fits(values):
        return values['scrollWidth'] <= values['innerWidth'] and all(
            values[key] is None or values[key]['right'] <= values['innerWidth'] + 0.5
            for key in ['boardColumn', 'evidenceColumn', 'secondary']
        )

    report = {
        'passed': not errors and control_applied and all(fits(values) for values in all_measurements.values()),
        'scope': 'Real Chromium controls at 320/390/640/1440px with normal and large text',
        'measurements': all_measurements,
        'controlApplied': control_applied,
        'pageErrors': errors,
    }
    (OUT / 'narrow-layout-results.json').write_text(json.dumps(report, indent=2) + '\n')
    browser.close()

if not report['passed']:
    raise SystemExit(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
