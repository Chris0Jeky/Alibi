"""Exercise the revised Expert Nonogram through real controls and a pinned v1 save."""
import json
import os
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'expert-nonogram'
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
V1 = json.loads((ROOT / 'tests/fixtures/expert-nonogram-01-v1.json').read_text())
V2 = next(
    puzzle
    for puzzle in json.loads((ROOT / 'content/extra/expert-families.json').read_text())['puzzles']
    if puzzle['id'] == 'expert-nonogram-01'
)
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS', label, flush=True)


def dismiss(page):
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')


def route(page, key):
    page.evaluate("(key) => { location.hash = '/play/' + key; }", key)
    page.wait_for_function(
        "(key) => window.AlibiDiagnostics?.getCurrent()?.puzzle.id + '@' + window.AlibiDiagnostics?.getCurrent()?.puzzle.revision === key",
        arg=key,
    )
    dismiss(page)


def seed_v1_run(page):
    run = {
        'schemaVersion': 1,
        'key': 'expert-nonogram-01@1',
        'rev': 0,
        'puzzle': V1,
        'state': {'cells': [-1] * (V1['size'] ** 2), 'notes': {}},
        'undo': [],
        'redo': [],
        'moves': 0,
        'hints': 0,
        'elapsed': 0,
        'completedAt': None,
        'firstCompletedAt': None,
        'updatedAt': '2026-09-12T00:00:00.000Z',
        'note': '',
    }
    page.evaluate(
        """(run) => new Promise((resolve, reject) => {
          const request = indexedDB.open('alibi-device');
          request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
          request.onsuccess = () => {
            const tx = request.result.transaction('runs', 'readwrite');
            tx.objectStore('runs').put({key: run.key, value: run});
            tx.oncomplete = () => { request.result.close(); resolve(); };
            tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
          };
        })""",
        run,
    )


with sync_playwright() as pw:
    launch = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        launch['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = pw.chromium.launch(**launch)
    OUT.mkdir(parents=True, exist_ok=True)
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 950}, reduced_motion='reduce')
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE)
        page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')

        page.evaluate("location.hash='/play/expert-nonogram-01@1'")
        page.wait_for_timeout(250)
        check(
            page.evaluate('()=>AlibiDiagnostics.getCurrent()') is None,
            f'{width}: unsaved v1 URL does not invent a legacy definition',
        )
        seed_v1_run(page)
        page.reload()
        page.wait_for_function('()=>window.AlibiDiagnostics')
        route(page, 'expert-nonogram-01@1')
        check(
            page.locator('.play-title h1').inner_text() == V1['title'],
            f'{width}: saved v1 snapshot continues at its explicit route',
        )
        v1_fill = next(index for index, value in enumerate(V1['solution']) if value)
        page.locator(f'#cell-{v1_fill}').click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', v1_fill) == 1,
            f'{width}: saved v1 snapshot accepts continued play',
        )

        route(page, 'expert-nonogram-01@2')
        check(
            page.locator('.play-title h1').inner_text() == V2['title'],
            f'{width}: new collection route resolves revision 2',
        )
        check('lighthouse' in page.locator('.evidence-card').inner_text().lower(), f'{width}: guide names the lighthouse')
        expect(page.locator('.nono-cell')).to_have_count(225)
        check(
            page.locator('.nono-cell').first.bounding_box()['width'] >= 44,
            f'{width}: 15x15 cells retain 44px targets',
        )
        check(
            page.evaluate('document.documentElement.scrollWidth <= innerWidth'),
            f'{width}: page has no horizontal overflow',
        )

        if width == 390:
            page.get_by_role('button', name='Move view right', exact=True).click()
            check(
                page.locator('.board-scroll').evaluate('(board) => board.scrollLeft') > 0,
                '390: pan button moves the enlarged board',
            )
            page.get_by_role('button', name='Move view left', exact=True).click()

        fill = next(index for index, value in enumerate(V2['solution']) if value)
        blank = next(index for index, value in enumerate(V2['solution']) if not value)
        page.locator(f'#cell-{fill}').click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', fill) == 1,
            f'{width}: Fill marks the selected lighthouse square',
        )
        page.wait_for_timeout(300)
        page.reload()
        page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()?.puzzle.revision === 2')
        dismiss(page)
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', fill) == 1,
            f'{width}: revised run persists after reload',
        )
        page.get_by_role('button', name='Cross', exact=True).click()
        page.locator(f'#cell-{blank}').click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', blank) == 0,
            f'{width}: Cross marks an empty square',
        )
        page.get_by_role('button', name='Erase', exact=True).click()
        page.locator(f'#cell-{blank}').click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', blank) == -1,
            f'{width}: Erase clears a marked square',
        )
        page.get_by_role('button', name='Fill', exact=True).click()
        page.locator(f'#cell-{fill}').click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', fill) == -1,
            f'{width}: Fill toggles an identical mark clear',
        )
        page.locator('[data-action="undo"]').first.click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', fill) == 1,
            f'{width}: Undo restores a filled square',
        )
        page.locator('[data-action="redo"]').first.click()
        check(
            page.evaluate('(index) => AlibiDiagnostics.getCurrent().state.cells[index]', fill) == -1,
            f'{width}: Redo clears the filled square again',
        )
        page.locator(f'#cell-{fill}').click()
        for index, value in enumerate(V2['solution']):
            if value and index != fill:
                page.locator(f'#cell-{index}').click()
        page.wait_for_function('()=>Boolean(AlibiDiagnostics.getCurrent()?.completedAt)')
        dismiss(page)
        check(
            page.evaluate(
                "(solution) => solution.every((value, index) => !value || AlibiDiagnostics.getCurrent().state.cells[index] === 1)",
                V2['solution'],
            ),
            f'{width}: revised beacon completes through player controls',
        )
        page.locator('.board-card').screenshot(path=str(OUT / f'beacon-{width}.png'))
        check(not errors, f'{width}: no browser errors')
        context.close()
    browser.close()

print('PASS', checks, 'Expert Nonogram browser assertions')
