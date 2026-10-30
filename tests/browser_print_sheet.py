"""Print sheet (#830): a Picture logic puzzle prints title, revision, board and clues on one page.

Print-emulated screenshots and real PDFs at A4 and Letter; the printed DOM carries no solution.
"""
import json
import os
import re
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8797').rstrip('/')
PAGES = {'a4': (794, 1123, 'A4'), 'letter': (816, 1056, 'Letter')}
SIZES = {'A4': (595, 842), 'Letter': (612, 792)}
FURNITURE = [
    '.sidebar', '.topbar', '.mobile-nav', '.footer', '.board-heading', '.board-instruction',
    '.main-tools', '.play-secondary', '.evidence-column', '.back-btn', '#play-help',
]


def load(path, pid):
    puzzles = json.loads((ROOT / path).read_text(encoding='utf-8'))
    puzzles = puzzles['puzzles'] if isinstance(puzzles, dict) else puzzles
    return next(p for p in puzzles if p['id'] == pid)


def pdf_pages(data):
    return len(re.findall(rb'/Type\s*/Page(?![A-Za-z])', data))


def open_puzzle(browser, puzzle, ready='.nono-cell'):
    context = browser.new_context(viewport={'width': 1280, 'height': 900}, reduced_motion='reduce')
    page = context.new_page()
    page.goto(URL + '/#/play/' + puzzle['id'])
    page.wait_for_selector(ready)
    if page.locator('dialog[open] [data-action="close-dialog"]').count():
        page.locator('dialog[open] [data-action="close-dialog"]').click()
    return context, page


def check_sheet(page, puzzle, label, filled, height):
    n = puzzle['size']
    assert page.locator('h1').inner_text() == puzzle['title'], (label, 'title')
    stamp = page.locator('.print-only')
    assert stamp.is_visible(), (label, 'id/revision hidden')
    assert stamp.inner_text() == f"{puzzle['id']} · revision {puzzle['revision']}", (label, 'stamp')
    assert page.locator('.grid-shell').is_visible(), (label, 'board hidden')
    assert page.locator('.nono-cell').count() == n * n, (label, 'cells')
    assert page.locator('.nono-clue:visible').count() == 2 * n, (label, 'clue axes')
    for selector in FURNITURE:
        assert not page.locator(selector).first.is_visible(), (label, selector, 'still visible')
    assert page.locator('dialog[open]').count() == 0 or not page.locator('dialog[open]').is_visible()
    box = page.locator('.grid-shell').bounding_box()
    assert box and box['y'] >= 0 and box['y'] + box['height'] <= height, (label, 'board off page', box)
    assert page.evaluate('document.documentElement.scrollHeight') <= height, (label, 'taller than a page')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), (label, 'wider than a page')
    ink = page.evaluate(
        """() => ({
          bg: getComputedStyle(document.querySelector('.shell')).backgroundColor,
          clue: getComputedStyle(document.querySelector('.nono-clue span')).color,
          filled: [...document.querySelectorAll('.nono-cell.filled')]
            .map((cell) => getComputedStyle(cell).backgroundColor),
        })"""
    )
    assert ink['bg'] == 'rgb(255, 255, 255)' and ink['clue'] == 'rgb(0, 0, 0)', (label, ink)
    assert ink['filled'] == ['rgb(0, 0, 0)'] * filled, (label, 'filled cells', ink['filled'])


def check_no_solution(page, puzzle, label):
    # A fresh board has no filled cell although the solution fills many: no solved pattern is in the DOM.
    assert sum(puzzle['solution']) > 0
    assert page.locator('.nono-cell.filled').count() == 0, (label, 'filled cells on a fresh board')
    html = page.evaluate('document.documentElement.outerHTML')
    assert 'solution' not in html.lower(), (label, 'solution word in DOM')
    assert ','.join(map(str, puzzle['solution'])) not in html, (label, 'solution list in DOM')


def computed(page, selector, prop):
    return page.locator(selector).first.evaluate('(e, p) => getComputedStyle(e)[p]', prop)


def check_other_families(browser):
    """Review fixes: night theme, Lantern walls, and the scene and Alibi-file clue lists."""
    done = []
    # Night theme on screen still prints dark ink on white paper, scene text included.
    for pid, ready, inks in (
        ('sudoku-01', '.cell.given', ['.cell.given']),
        ('scene-01', '.scene-cell', ['.scene-cell', '.scene-cell .furniture', '.room-label i']),
    ):
        puzzle = load('content/catalog.json', pid)
        context, page = open_puzzle(browser, puzzle, ready)
        try:
            page.evaluate("document.documentElement.dataset.theme = 'night'")
            page.emulate_media(media='print')
            assert computed(page, '.shell', 'backgroundColor') == 'rgb(255, 255, 255)', (pid, 'night paper')
            for selector in inks:
                assert computed(page, selector, 'color') == 'rgb(0, 0, 0)', (pid, selector, 'night ink')
            page.screenshot(path=str(OUT / f'print-night-{pid}.png'))
            done.append(f'{pid} prints dark ink on white in the night theme')
        finally:
            context.close()
    # Lantern walls stay solid black with white numbers; selection tint is cleared.
    puzzle = load('content/catalog.json', 'lightup-01')
    context, page = open_puzzle(browser, puzzle, '.light-wall')
    try:
        page.emulate_media(media='print')
        assert computed(page, '.light-wall', 'backgroundColor') == 'rgb(0, 0, 0)', 'wall fill'
        assert computed(page, '.light-wall', 'color') == 'rgb(255, 255, 255)', 'wall number'
        assert computed(page, '.light-wall', 'printColorAdjust') == 'exact', 'wall keeps its fill'
        page.screenshot(path=str(OUT / 'print-lightup-01.png'))
        done.append('lightup-01 prints black walls with white numbers')
    finally:
        context.close()
    puzzle = load('content/catalog.json', 'sudoku-01')
    context, page = open_puzzle(browser, puzzle, '.cell')
    try:
        page.locator('.cell:not(.given)').first.click()
        assert page.locator('.cell.selected').count() == 1
        page.emulate_media(media='print')
        cell = page.locator('.cell.selected').first
        assert cell.evaluate('e => getComputedStyle(e).backgroundColor') == 'rgb(255, 255, 255)', 'tint'
        ring = cell.evaluate('e => getComputedStyle(e).boxShadow')
        assert ring == 'rgb(85, 85, 85) -1px -1px 0px 0px inset', ('selection ring', ring)
        done.append('selected cell prints without its tint or ring')
    finally:
        context.close()
    # Crime scenes and Alibi files print the clue list and nothing else from the evidence column.
    for pid in ('scene-01', 'dossier-01'):
        puzzle = load('content/catalog.json', pid)
        context, page = open_puzzle(browser, puzzle, '.evidence-list')
        try:
            page.locator('.clue').first.click()
            page.emulate_media(media='print')
            assert page.locator('.evidence-list .clue-text:visible').count() == len(puzzle['clues']), pid
            assert page.locator('.evidence-body h2:visible').count() == 1, (pid, 'heading')
            assert page.locator('.case-intro:visible').count() == 1, (pid, 'intro')
            for selector in ('.evidence-tabs', '.play-context', '.info-note', '.checkbox', '.main-tools'):
                assert not page.locator(selector).first.is_visible(), (pid, selector)
            assert computed(page, '.clue-text', 'textDecorationLine') == 'none', (pid, 'struck clue')
            if pid == 'dossier-01':
                assert page.locator('.logic-cell:visible').count() > 0, 'grid cells print'
            html = page.evaluate('document.documentElement.outerHTML')
            assert json.dumps(puzzle['solution']) not in html, (pid, 'solution in DOM')
            page.screenshot(path=str(OUT / f'print-{pid}.png'), full_page=True)
            done.append(f'{pid} prints its clue list and board')
        finally:
            context.close()
    return done


def run():
    OUT.mkdir(exist_ok=True)
    cases = [
        ('catalog', load('content/catalog.json', 'nonogram-01')),
        ('large', load('content/extra/nonogram-large.json', 'nonogram-large-01')),
    ]
    failures = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            for tag, puzzle in cases:
                context, page = open_puzzle(browser, puzzle)
                try:
                    errors = []
                    page.on('pageerror', lambda e: errors.append(str(e)))
                    screen_nav = page.locator('.sidebar').is_visible()
                    assert screen_nav, (tag, 'screen layout lost its sidebar')
                    assert not page.locator('.print-only').is_visible(), (tag, 'stamp shows on screen')
                    page.emulate_media(media='print')
                    for key, (width, height, fmt) in PAGES.items():
                        label = f'{tag}-{key}'
                        page.set_viewport_size({'width': width, 'height': height})
                        check_sheet(page, puzzle, label + '-fresh', 0, height)
                        check_no_solution(page, puzzle, label)
                        page.screenshot(path=str(OUT / f'print-{label}-fresh.png'))
                        pdf = page.pdf(format=fmt, prefer_css_page_size=True)
                        assert pdf_pages(pdf) == 1, (label, 'pdf pages', pdf_pages(pdf))
                        box = re.search(rb'/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)', pdf)
                        assert box and abs(float(box[1]) - SIZES[fmt][0]) < 2, (label, 'paper', box)
                        assert abs(float(box[2]) - SIZES[fmt][1]) < 2, (label, 'paper height', box)
                    # In-progress board: the player's marks print, nothing else.
                    page.emulate_media(media='screen')
                    page.set_viewport_size({'width': 1280, 'height': 900})
                    cells = page.locator('.nono-cell')
                    for index in (0, 1, puzzle['size'] + 1):
                        cells.nth(index).click()
                    marked = page.locator('.nono-cell.filled').count()
                    assert marked > 0, (tag, 'clicks filled nothing')
                    page.emulate_media(media='print')
                    for key, (width, height, fmt) in PAGES.items():
                        label = f'{tag}-{key}'
                        page.set_viewport_size({'width': width, 'height': height})
                        check_sheet(page, puzzle, label + '-marked', marked, height)
                        page.screenshot(path=str(OUT / f'print-{label}-marked.png'))
                        pdf = page.pdf(format=fmt, prefer_css_page_size=True)
                        assert pdf_pages(pdf) == 1, (label, 'marked pdf pages', pdf_pages(pdf))
                    assert not errors, (tag, errors)
                except AssertionError as error:
                    failures.append(repr(error))
                finally:
                    context.close()
            try:
                extras = check_other_families(browser)
            except AssertionError as error:
                failures.append(repr(error))
                extras = []
        finally:
            browser.close()
    if failures:
        raise AssertionError('\n'.join(failures))
    print('print sheet ok: A4 and Letter, fresh and marked, one page each')
    for line in extras:
        print('  ' + line)


if __name__ == '__main__':
    run()
