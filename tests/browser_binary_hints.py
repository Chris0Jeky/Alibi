"""Clue-only Sun & Moon reasoning, wrong-mark recovery and real board controls."""
import json
import os
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from browser_master_grandmaster_controls import action, cell, current, dismiss_lesson
from browser_tents_hints import unchanged_hint, undo_to

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'lightup-hints' / 'binary'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
# A prefix derived using public clues and the pure hint helper, not the stored answer.
STEPS = [(0, 0), (5, 0), (8, 0), (9, 0), (11, 0), (15, 0),
         (16, 0), (18, 0), (21, 1), (34, 0), (35, 1), (20, 0)]


def put(page, index, value):
    action(page, 'symbol', f'[data-value="{value}"]')
    cell(page, index)
    page.wait_for_function(
        '([i,v]) => AlibiDiagnostics.getCurrent().state.cells[i] === v', arg=[index, value]
    )


def close_hint(dialog):
    dialog.get_by_role('button', name='Keep thinking', exact=True).click()
    expect(dialog).not_to_be_visible()


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
                        page.goto(URL + '/#/play/curated-binary-01@1')
                        page.wait_for_function(
                            "() => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === 'curated-binary-01'"
                        )
                        dismiss_lesson(page)
                        for step, (index, value) in enumerate(STEPS):
                            before = current(page)
                            action(page, 'hint')
                            dialog = page.locator('dialog[open]')
                            rule = 'Compare two squares' if step == len(STEPS) - 1 else 'Only one symbol fits'
                            expect(dialog.locator('.deduction-title')).to_have_text(rule)
                            coordinate = chr(65 + index % 6) + str(index // 6 + 1)
                            expect(dialog.locator('.hint-box')).to_contain_text(coordinate)
                            expect(dialog).to_contain_text('does not look at the stored answer')
                            unchanged_hint(page, before)
                            if step == len(STEPS) - 1:
                                expect(dialog.locator('.hint-box')).to_contain_text('must be different')
                                page.screenshot(path=str(OUT / f'{width}-distinct-lines.png'))
                            close_hint(dialog)
                            put(page, index, value)
                            undo_to(page, before['state'])
                            put(page, index, value)
                            checks.append(f'{width}px {rule}, {coordinate}: pure Hint, move, undo')
                        page.goto(URL + '/#/play/binary-03@1')
                        page.wait_for_function(
                            "() => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === 'binary-03'"
                        )
                        dismiss_lesson(page)
                        before = current(page)
                        put(page, 14, 1)  # The wrong C3 leaves neither symbol valid at B3.
                        mistaken = current(page)
                        action(page, 'hint')
                        dialog = page.locator('dialog[open]')
                        expect(dialog.locator('.deduction-title')).to_have_text('Revisit a conflict')
                        expect(dialog.locator('.hint-box')).to_contain_text('B3')
                        expect(dialog.locator('.hint-box')).to_contain_text('marks')
                        unchanged_hint(page, mistaken)
                        page.screenshot(path=str(OUT / f'{width}-wrong-mark.png'))
                        close_hint(dialog)
                        undo_to(page, before['state'])
                        checks.append(f'{width}px wrong C3: pure conflict Hint and Undo recovery')
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
            'scope': 'Real Chromium Hint/symbol/cell/Undo controls; not physical-device '
                     'or human explanation-quality acceptance.',
        }, indent=2), encoding='utf-8')
    print(f'PASS {len(checks)} Sun & Moon reasoning interactions', flush=True)


if __name__ == '__main__':
    run()
