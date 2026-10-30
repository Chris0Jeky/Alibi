"""Print route (#830): a clean one-page pen-and-paper sheet, with no answer and no chrome."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright
from browser_master_grandmaster_controls import dismiss_lesson

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'print-sheet'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8797').rstrip('/')
CHROME = ['.sidebar', '.topbar', '.mobile-nav', '.footer', '.evidence-column', '.main-tools',
          '.board-heading', '.board-instruction', '.play-secondary', '.skip-link']


def pages(pdf):
    return len(re.findall(rb'/Type\s*/Page[^s]', pdf))


def open_print(page, puzzle_id, lesson_open=False):
    page.emulate_media(media='screen')
    page.goto(f'{URL}/#/play/{puzzle_id}@1')
    page.wait_for_function(
        f"() => globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id === '{puzzle_id}'"
    )
    if not lesson_open:
        dismiss_lesson(page)
    page.emulate_media(media='print')


def assert_clean(page, puzzle):
    """Title, board and clues are visible; every control and every piece of chrome is not."""
    expect(page.locator('.play-title h1')).to_have_text(puzzle['title'])
    expect(page.locator('.play-title .eyebrow')).to_be_visible()
    expect(page.locator('.board-wrap .grid-shell')).to_be_visible()
    for selector in CHROME:
        for node in page.locator(selector).all():
            assert not node.is_visible(), f'{selector} is printed'
    for node in page.locator('#app button:not(.cell), dialog, #toasts, [role=status]').all():
        assert not node.is_visible(), 'A control or notice is printed'
    assert page.evaluate('getComputedStyle(document.body).backgroundColor') == 'rgb(255, 255, 255)'


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks, errors = [], []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
            try:
                context = browser.new_context(viewport={'width': 1280, 'height': 900})
                page = context.new_page()
                page.set_default_timeout(10000)
                page.on('pageerror', lambda error: errors.append(str(error)))
                # Picture logic, with any first-visit lesson dialog still open.
                open_print(page, 'nonogram-01', lesson_open=True)
                puzzle = page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
                assert_clean(page, puzzle)
                assert page.locator('.nono-clue').count() == 2 * puzzle['size']
                assert page.locator('.nono-clue:visible').count() == 2 * puzzle['size'], (
                    'Every row and column clue prints'
                )
                checks.append('nonogram-01 prints title, board and clues; dialog hidden')
                # Progress is not printed, and the answer was never rendered.
                page.emulate_media(media='screen')
                dismiss_lesson(page)
                page.locator('[data-action="cell"][data-cell="0"]').click()
                page.emulate_media(media='print')
                assert page.locator('.nono-cell.filled').count() >= 1
                mark = page.locator('.nono-cell.filled').first
                assert mark.evaluate('e => getComputedStyle(e).backgroundColor') == 'rgb(255, 255, 255)'
                html = page.evaluate('document.documentElement.outerHTML')
                assert 'solution' not in html.lower(), 'The solution is in the print DOM'
                assert json.dumps(puzzle['solution']) not in html
                checks.append('nonogram-01 progress blanked; no solution in DOM')
                page.screenshot(path=str(OUT / 'nonogram-01-print.png'), full_page=True)
                for paper in ('A4', 'Letter'):
                    pdf = page.pdf(format=paper)
                    (OUT / f'nonogram-01-{paper}.pdf').write_bytes(pdf)
                    assert pages(pdf) == 1, f'nonogram-01 prints on {pages(pdf)} {paper} pages'
                    checks.append(f'nonogram-01 prints on one {paper} page')
                # Other families: no crash and the same chrome is hidden. They may print imperfectly.
                for family in ('sudoku-01', 'tents-01'):
                    open_print(page, family)
                    puzzle = page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
                    assert_clean(page, puzzle)
                    html = page.evaluate('document.documentElement.outerHTML')
                    assert json.dumps(puzzle['solution']) not in html
                    pdf = page.pdf(format='A4')
                    (OUT / f'{family}-A4.pdf').write_bytes(pdf)
                    checks.append(f'{family} prints {pages(pdf)} A4 page(s), chrome hidden')
                # Night theme on screen still prints black ink on white paper.
                open_print(page, 'sudoku-01')
                page.emulate_media(media='screen')
                page.evaluate("document.documentElement.dataset.theme = 'night'")
                page.emulate_media(media='print')
                given = page.locator('.cell.given').first
                assert given.evaluate('e => getComputedStyle(e).color') == 'rgb(0, 0, 0)', (
                    'Night-theme givens print black'
                )
                page.evaluate("document.documentElement.dataset.theme = 'light'")
                checks.append('night theme prints black givens on white')
                # Crime scenes and Alibi files print their clue list beside the board.
                for family in ('scene-01', 'dossier-01'):
                    open_print(page, family)
                    puzzle = page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
                    expect(page.locator('.play-title h1')).to_have_text(puzzle['title'])
                    expect(page.locator('.evidence-list')).to_be_visible()
                    assert page.locator('.evidence-list .clue-text:visible').count() == len(
                        puzzle['clues']
                    ), f'{family}: every clue prints'
                    for selector in ('.evidence-tabs', '.sidebar', '.main-tools'):
                        assert not page.locator(selector).first.is_visible(), selector
                    if family == 'dossier-01':
                        assert page.locator('.logic-cell:visible').count() > 0, 'Grid cells print'
                    html = page.evaluate('document.documentElement.outerHTML')
                    assert json.dumps(puzzle['solution']) not in html
                    checks.append(f'{family} prints its clues and board')
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
            'scope': 'Chromium print emulation and PDF page count; not a physical printer.',
        }, indent=2), encoding='utf-8')
    print(f'PASS {len(checks)} print-sheet checks', flush=True)


if __name__ == '__main__':
    run()
