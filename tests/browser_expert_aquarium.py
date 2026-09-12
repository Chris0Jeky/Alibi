"""Exercise Expert Aquarium revisions and waterline controls on a real origin."""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
V1 = json.loads((ROOT / 'tests/fixtures/expert-aquarium-01-v1.json').read_text())
V2 = next(
    puzzle
    for puzzle in json.loads((ROOT / 'content/extra/expert-families.json').read_text())['puzzles']
    if puzzle['id'] == 'expert-aquarium-01'
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
        'key': 'expert-aquarium-01@1',
        'rev': 0,
        'puzzle': V1,
        'state': {'levels': [0] * len(V1['solution']), 'notes': {}},
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


def cell_for(tank, level):
    rows = sorted(
        {index // V2['size'] for index, value in enumerate(V2['tanks']) if value == tank},
        reverse=True,
    )
    row = rows[level - 1]
    return next(
        index
        for index, value in enumerate(V2['tanks'])
        if value == tank and index // V2['size'] == row
    )


with sync_playwright() as pw:
    launch = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        launch['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = pw.chromium.launch(**launch)
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 950})
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(BASE)
        page.wait_for_function('()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        page.evaluate("location.hash='/play/expert-aquarium-01@1'")
        page.wait_for_timeout(250)
        check(
            page.evaluate("()=>AlibiDiagnostics.getCurrent()") is None,
            f'{width}: unsaved v1 URL does not invent a legacy definition',
        )
        seed_v1_run(page)
        page.reload()
        page.wait_for_function('()=>window.AlibiDiagnostics')
        route(page, 'expert-aquarium-01@1')
        check(
            page.locator('.play-title h1').inner_text() == V1['title'],
            f'{width}: saved v1 snapshot continues at its explicit route',
        )
        route(page, 'expert-aquarium-01@2')
        check(
            page.locator('.play-title h1').inner_text() == V2['title'],
            f'{width}: new collection route resolves revision 2',
        )
        guide = page.locator('.evidence-card').inner_text()
        check('seven connected reservoirs' in guide, f'{width}: revised story reports seven reservoirs')
        page.screenshot(path=str(ROOT / 'test-results' / f'expert-aquarium-{width}.png'), full_page=True)

        probe_tank = next(index for index, level in enumerate(V2['solution']) if level)
        probe_cell = cell_for(probe_tank, 1)
        page.locator(f'[data-action="cell"][data-cell="{probe_cell}"]').click()
        check(
            page.evaluate('(tank) => AlibiDiagnostics.getCurrent().state.levels[tank]', probe_tank) == 1,
            f'{width}: setting a waterline uses the clicked height',
        )
        page.locator(f'[data-action="cell"][data-cell="{probe_cell}"]').click()
        check(
            page.evaluate('(tank) => AlibiDiagnostics.getCurrent().state.levels[tank]', probe_tank) == 0,
            f'{width}: clicking the waterline lowers it',
        )
        page.locator(f'[data-action="cell"][data-cell="{probe_cell}"]').click()
        page.locator('[data-action="brush"][data-value="0"]').click()
        page.locator(f'[data-action="cell"][data-cell="{probe_cell}"]').click()
        check(
            page.evaluate('(tank) => AlibiDiagnostics.getCurrent().state.levels[tank]', probe_tank) == 0,
            f'{width}: Drain tank clears a selected waterline',
        )
        page.locator('[data-action="brush"][data-value="1"]').click()
        for tank, level in enumerate(V2['solution']):
            if level:
                page.locator(f'[data-action="cell"][data-cell="{cell_for(tank, level)}"]').click()
        page.wait_for_function('()=>Boolean(AlibiDiagnostics.getCurrent()?.completedAt)')
        check(
            page.evaluate('()=>AlibiDiagnostics.getCurrent().state.levels') == V2['solution'],
            f'{width}: Expert Aquarium completes through waterline controls',
        )
        check(page.locator('dialog[open]').count() == 1, f'{width}: completion is shown after the solved board')
        check(not errors, f'{width}: no browser errors')
        context.close()
    browser.close()

print('PASS', checks, 'Expert Aquarium browser assertions')
