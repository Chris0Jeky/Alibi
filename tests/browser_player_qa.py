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
            if page.locator('.curation-collections').get_attribute('open') is None:
                page.locator('.curation-collections > summary').click()
            page.locator('.curation-collections [data-action="curation-venue"]').nth(index).click()
            expect(page.locator('.puzzle-card')).to_have_count(4)
            # Escape is outside the collapsed disclosure and available on a phone.
            page.get_by_role('button', name='Show all collections', exact=True).click()
            expect(page.locator('.puzzle-card')).to_have_count(23)
        if page.locator('.curation-collections').get_attribute('open') is None:
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
        scene = next(p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'scene')
        page.goto(URL + '/#/play/' + scene['id'])
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        free = next(i for i in range(scene['size'] ** 2) if all(o['cell'] != i for o in scene['objects']))
        cell = page.locator(f'[data-action="cell"][data-cell="{free}"]')
        page.locator('[data-action="scene-mode"][data-value="candidate"]').click()
        cell.click()
        first_person = scene['people'][0]
        expect(cell).to_have_attribute('aria-label', __import__('re').compile('candidates: ' + first_person['name']))
        page.locator('[data-action="scene-mode"][data-value="board-cross"]').click()
        cell.click()
        assert page.evaluate('Object.keys(AlibiDiagnostics.getCurrent().state.placements).length') == 0
        page.locator('.main-tools [data-action="undo"]').click()
        expect(cell).not_to_have_attribute('aria-label', __import__('re').compile('board cross'))
        page.locator('.main-tools [data-action="redo"]').click()
        expect(page.locator("#save-state")).to_contain_text("Saved on this device")
        page.reload()
        expect(cell).to_have_attribute('aria-label', __import__('re').compile('board cross.*candidates: ' + first_person['name']))
        page.screenshot(path=str(OUT / f'scene-{width}.png'), full_page=True)
        cell.click()  # Place selected person after reload resets to Place people.
        moves = page.evaluate('AlibiDiagnostics.getCurrent().moves')
        page.locator('[data-action="scene-mode"][data-value="candidate"]').click()
        cell.click()
        assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == moves, 'occupied-cell notes do not create invisible edits'
        cell.press('n')
        expect(page.locator('[data-action="scene-mode"][data-value="exclude"]')).to_have_attribute('aria-pressed', 'true')
        expect(page.locator('#save-state')).to_contain_text('Saved on this device')
        context.set_offline(True)
        page.reload()
        expect(cell).to_have_attribute('aria-label', __import__('re').compile('candidates: ' + first_person['name']))
        context.set_offline(False)
        for puzzle in json.loads((ROOT / 'content/extra/binary-large.json').read_text())['puzzles']:
            page.goto(URL + '/#/play/' + puzzle['id'])
            if page.locator('dialog[open]').count():
                page.locator('dialog[open] [data-action="close-dialog"]').click()
            for value in [0, 1]:
                page.locator(f'[data-action="symbol"][data-value="{value}"]').click()
                for i, answer in enumerate(puzzle['solution']):
                    if answer == value and puzzle['givens'][i] == -1:
                        page.locator(f'[data-action="cell"][data-cell="{i}"]').click()
            expect(page.locator('dialog[open]')).to_be_visible()
            assert page.evaluate('Boolean(AlibiDiagnostics.getCurrent().completedAt)')
            page.locator('dialog[open] [data-action="close-dialog"]').click()
            page.screenshot(path=str(OUT / f'{puzzle["id"]}-{width}.png'), full_page=True)
        book = json.loads((ROOT / 'content/casebooks.json').read_text())[0]
        page.goto(URL + '/#/casebooks/' + book['id'])
        page.locator('.chapter[data-action="open"]').nth(2).click()
        expect(page.locator('.story-page')).to_contain_text(book['chapters'][2]['brief'])
        assert book['ending'] not in page.locator('.story-page').inner_text(), 'out-of-order opening has no epilogue spoiler'
        page.screenshot(path=str(OUT / f'story-{width}.png'), full_page=True)
        page.get_by_role('button', name='Continue to puzzle', exact=True).click()
        expect(page.locator('.play-title')).to_be_visible()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
        assert not errors, errors
        context.close()
    browser.close()
print('Player feedback checks pass at phone and desktop widths.')


