"""Player-feedback regressions via real controls in a disposable browser context."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'player-qa'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8792')
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + '/#/library')
        expect(page.locator('.family-card')).to_have_count(13)
        page.screenshot(path=str(OUT / f'families-{width}.png'), full_page=True)
        page.locator('.family-card[data-id="sudoku"]').click()
        expect(page.locator('.puzzle-card')).to_have_count(23)
        for index in range(1, 5):
            page.locator('.curation-collections > summary').click()
            page.locator('.curation-collections [data-action="curation-venue"]').nth(index).click()
            expect(page.locator('.puzzle-card')).to_have_count(4)
            # Escape is outside the collapsed disclosure and available on a phone.
            page.get_by_role('button', name='Show all collections', exact=True).click()
            expect(page.locator('.puzzle-card')).to_have_count(23)
        page.locator('.curation-collections > summary').click()
        page.locator('.curation-collections [data-action="curation-venue"]').nth(1).click()
        page.get_by_role('button', name='All puzzles', exact=True).click()
        expect(page.locator('.family-card')).to_have_count(13)
        page.locator('.family-card[data-id="sudoku"]').click()
        expect(page.locator('.puzzle-card')).to_have_count(23)
        page.locator('.puzzle-card [data-action="open"]').first.click()
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        puzzle = page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
        blank = next(i for i, value in enumerate(puzzle['givens']) if not value)
        page.locator(f'[data-action="cell"][data-cell="{blank}"]').click()
        page.locator('[data-action="pencil"]').click()
        page.locator('[data-action="value"][data-value="1"]').click()
        assert page.evaluate(f'AlibiDiagnostics.getCurrent().state.notes[{blank}].includes(1)')
        page.locator('[data-action="pencil"]').click()
        for i, value in enumerate(puzzle['solution']):
            if value == 1 and not puzzle['givens'][i]:
                page.locator(f'[data-action="cell"][data-cell="{i}"]').click()
                page.locator('[data-action="value"][data-value="1"]').click()
        expect(page.locator('.number-key[data-value="1"]')).to_have_class('number-key digit-placed')
        page.locator('[data-action="erase"]').click()
        expect(page.locator('.number-key[data-value="1"]')).not_to_have_class('number-key digit-placed')
        page.screenshot(path=str(OUT / f'sudoku-{width}.png'), full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
        assert not errors, errors
        context.close()
    browser.close()
print('Player feedback checks pass at phone and desktop widths.')

