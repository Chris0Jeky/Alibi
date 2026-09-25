"""Exercise reasoning hints through the shipped Lanterns dialog and board controls."""
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright
from browser_master_grandmaster_controls import action, cell, current, dismiss_lesson

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'lightup-hints'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
# These are deductions from the public clues, not stored answers or solver calls.
CASES = {
    'lightup-01': [
        ('Only one way to light this square', 'A3', 10, 1),
        ('Only one way to light this square', 'C3', 12, 1),
        ('This wall has enough lanterns', 'C1', 2, 0),
    ],
    'lightup-02': [
        ('Fill the remaining neighbours', 'D3', 13, 1),
        ('No facing lanterns', 'D1', 3, 0),
        ('No facing lanterns', 'D2', 8, 0),
    ],
}


def wrong_mark_recovery(page, width, checks):
    # Continue the three clue-derived lightup-02 steps above, using actual controls.
    if current(page)['puzzle']['id'] != 'lightup-02':
        raise AssertionError('The wrong-mark witness must follow lightup-02')
    for index, value in ((18, 0), (4, 1), (7, 1)):
        action(page, 'brush', f'[data-value="{value}"]')
        cell(page, index)
        page.wait_for_function(
            '([i,v]) => AlibiDiagnostics.getCurrent().state.cells[i] === v',
            arg=[index, value],
        )
    before = current(page)
    action(page, 'brush', '[data-value="0"]')
    cell(page, 21)  # Wrong B5 leaves C4 as the only remaining site for the C5 wall.
    page.wait_for_function('() => AlibiDiagnostics.getCurrent().state.cells[21] === 0')
    mistaken = current(page)
    action(page, 'hint')
    dialog = page.locator('dialog[open]')
    expect(dialog.locator('.deduction-title')).to_have_text('Revisit a conflict')
    expect(dialog.locator('.hint-box')).to_contain_text('With your marks')
    after = current(page)
    for field in ('state', 'undo', 'redo', 'hints', 'completedAt'):
        if after.get(field) != mistaken.get(field):
            raise AssertionError(f'Conflict Hint changed {field}')
    page.screenshot(path=str(OUT / f'lightup-02-{width}-wrong-mark.png'))
    dialog.get_by_role('button', name='Keep thinking', exact=True).click()
    expect(dialog).not_to_be_visible()
    action(page, 'undo')
    page.wait_for_function(
        '(state) => JSON.stringify(AlibiDiagnostics.getCurrent().state) === '
        'JSON.stringify(state)', arg=before['state'],
    )
    # Undoing the mistake must restore ordinary clue-based advice, not a stale conflict.
    action(page, 'hint')
    dialog = page.locator('dialog[open]')
    expect(dialog.locator('.deduction-title')).to_have_text('This wall has enough lanterns')
    expect(dialog.locator('.hint-box')).to_contain_text('C4')
    dialog.get_by_role('button', name='Keep thinking', exact=True).click()
    expect(dialog).not_to_be_visible()
    checks.append(f'{width}px lightup-02: pure conflict Hint, Undo and restored C4 advice')


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
                        for puzzle_id, steps in CASES.items():
                            page.goto(URL + f'/#/play/{puzzle_id}@1')
                            page.wait_for_function(
                                '(id) => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === id',
                                arg=puzzle_id,
                            )
                            dismiss_lesson(page)
                            for step, (rule, coordinate, index, value) in enumerate(steps):
                                before = current(page)
                                action(page, 'hint')
                                dialog = page.locator('dialog[open]')
                                expect(dialog.locator('.deduction-title')).to_have_text(rule)
                                expect(dialog.locator('.hint-box')).to_contain_text(coordinate)
                                expect(dialog).to_contain_text('does not look at the stored answer')
                                after = current(page)
                                for field in ('state', 'undo', 'redo', 'hints', 'completedAt'):
                                    if after.get(field) != before.get(field):
                                        raise AssertionError(f'Hint changed {field}')
                                page.screenshot(path=str(OUT / f'{puzzle_id}-{width}-{step}.png'))
                                dialog.get_by_role('button', name='Keep thinking', exact=True).click()
                                expect(dialog).not_to_be_visible()
                                action(page, 'brush', f'[data-value="{value}"]')
                                cell(page, index)
                                page.wait_for_function(
                                    '([i, v]) => AlibiDiagnostics.getCurrent().state.cells[i] === v',
                                    arg=[index, value],
                                )
                                action(page, 'undo')
                                page.wait_for_function(
                                    '(state) => JSON.stringify(AlibiDiagnostics.getCurrent().state) === '
                                    'JSON.stringify(state)', arg=before['state'],
                                )
                                # Reapply through controls so the next hint sees exactly this mark.
                                cell(page, index)
                                page.wait_for_function(
                                    '([i, v]) => AlibiDiagnostics.getCurrent().state.cells[i] === v',
                                    arg=[index, value],
                                )
                                checks.append(f'{width}px {puzzle_id}: {rule}, {coordinate}, undo')
                        wrong_mark_recovery(page, width, checks)
                    finally:
                        context.close()
            finally:
                browser.close()
        if errors:
            raise AssertionError(f'Browser page errors: {errors}')
    except Exception as error:
        errors.append(str(error))
        raise
    finally:
        (OUT / 'receipt.json').write_text(json.dumps({
            'passed': not errors, 'checks': checks, 'errors': errors,
            'scope': 'Real Chromium hint dialogs and board/undo controls; not physical-device '
                     'or human explanation-quality acceptance.',
        }, indent=2), encoding='utf-8')
    print(f'PASS {len(checks)} Lantern hint interactions', flush=True)


if __name__ == '__main__':
    run()
