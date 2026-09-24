"""Check clue-only Tents hints, board actions and undo through real controls."""
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from browser_master_grandmaster_controls import action, cell, current, dismiss_lesson

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'lightup-hints' / 'tents'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
# Clue-derived prefix for tents-01. No answer lookup or injected player state.
STEPS = [
    *[('Each tent needs a tree', i, 0) for i in (3, 4, 10, 11, 15, 18, 24)],
    *[('This line has enough tents', i, 0) for i in (16, 17, 19)],
    *[('Fill the remaining tent sites', i, 1) for i in (20, 23, 5)],
    ('Leave a gap between tents', 1, 0),
]


def unchanged_hint(page, before):
    after = current(page)
    for field in ('state', 'undo', 'redo', 'hints', 'completedAt'):
        if after.get(field) != before.get(field):
            raise AssertionError(f'Reading a hint changed {field}')


def undo_to(page, state):
    action(page, 'undo')
    page.wait_for_function(
        '(state) => JSON.stringify(AlibiDiagnostics.getCurrent().state) === '
        'JSON.stringify(state)', arg=state,
    )


def wrong_cross(page, width):
    before = current(page)
    action(page, 'brush', '[data-value="0"]')
    cell(page, 2)  # Incorrect C1 cross, entered through the actual board.
    page.wait_for_function('() => AlibiDiagnostics.getCurrent().state.cells[2] === 0')
    mistaken = current(page)
    action(page, 'hint')
    dialog = page.locator('dialog[open]')
    expect(dialog.locator('.deduction-title')).to_have_text('Revisit a conflict')
    for detail in ('Row 1', 'Column B', 'crosses'):
        expect(dialog.locator('.hint-box')).to_contain_text(detail)
    unchanged_hint(page, mistaken)
    page.screenshot(path=str(OUT / f'{width}-wrong-cross.png'))
    dialog.get_by_role('button', name='Keep thinking', exact=True).click()
    expect(dialog).not_to_be_visible()
    undo_to(page, before['state'])
    # The caller continues the original correct route after undoing this mistake.


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
            try:
                for width in (390, 1440):
                    context = browser.new_context(
                        viewport={'width': width, 'height': 1000}, reduced_motion='reduce'
                    )
                    page = context.new_page()
                    page.set_default_timeout(10000)
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    try:
                        page.goto(URL + '/#/play/tents-01@1')
                        page.wait_for_function(
                            "() => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === 'tents-01'"
                        )
                        dismiss_lesson(page)
                        seen = set()
                        for rule, index, value in STEPS:
                            before = current(page)
                            action(page, 'hint')
                            dialog = page.locator('dialog[open]')
                            expect(dialog.locator('.deduction-title')).to_have_text(rule)
                            coordinate = chr(65 + index % 5) + str(index // 5 + 1)
                            expect(dialog.locator('.hint-box')).to_contain_text(coordinate)
                            expect(dialog).to_contain_text('does not look at the stored answer')
                            unchanged_hint(page, before)
                            if rule not in seen:
                                page.screenshot(path=str(OUT / f'{width}-{index}.png'))
                                seen.add(rule)
                            dialog.get_by_role('button', name='Keep thinking', exact=True).click()
                            expect(dialog).not_to_be_visible()
                            action(page, 'brush', f'[data-value="{value}"]')
                            cell(page, index)
                            page.wait_for_function(
                                '([i,v]) => AlibiDiagnostics.getCurrent().state.cells[i] === v',
                                arg=[index, value],
                            )
                            undo_to(page, before['state'])
                            cell(page, index)
                            page.wait_for_function(
                                '([i,v]) => AlibiDiagnostics.getCurrent().state.cells[i] === v',
                                arg=[index, value],
                            )
                            checks.append(f'{width}px {rule}, {coordinate}: pure Hint, move, undo')
                            if index == 24:
                                wrong_cross(page, width)
                                checks.append(f'{width}px incorrect C1: pure conflict Hint, undo, resume')
                        assert len(seen) == 4, 'exercise every rule at each width'
                    finally:
                        context.close()
            finally:
                browser.close()
        if errors:
            raise AssertionError(errors)
    except Exception as error:
        errors.append(str(error))
        raise
    finally:
        (OUT / 'receipt.json').write_text(json.dumps({
            'passed': not errors, 'checks': checks, 'errors': errors,
            'scope': 'Chromium Hint, brush, cell and Undo controls; not physical-device '
                     'or human explanation-quality acceptance.',
        }, indent=2), encoding='utf-8')
    print(f'PASS {len(checks)} Tents hint interactions', flush=True)


if __name__ == '__main__':
    run()
