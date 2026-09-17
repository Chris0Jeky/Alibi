"""Exercise Expert Aquarium revisions, journal identity counts and waterline controls."""
import json
import os
from pathlib import Path

from playwright.sync_api import sync_playwright
from revision_route import (
    UNAVAILABLE_HEADING,
    UNAVAILABLE_NOTICE,
    unavailable_route_complete,
    wait_for_unavailable_revision,
)

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
V1 = json.loads((ROOT / 'tests/fixtures/expert-aquarium-01-v1.json').read_text())
V2 = next(
    puzzle
    for puzzle in json.loads((ROOT / 'content/extra/expert-families.json').read_text())['puzzles']
    if puzzle['id'] == 'expert-aquarium-01'
)
DISTINCT = next(
    puzzle
    for puzzle in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles']
    if puzzle['type'] == 'aquarium' and puzzle['id'] != V1['id']
)
checks = 0


def check(value, label):
    global checks
    assert value, label
    checks += 1
    print('PASS', label, flush=True)


settled_unavailable = {
    'currentKey': None,
    'heading': UNAVAILABLE_HEADING,
    'notice': UNAVAILABLE_NOTICE,
}
check(
    not unavailable_route_complete({'currentKey': None, 'heading': '', 'notice': ''}),
    'unavailable-revision probe ignores a pre-navigation null run',
)
check(
    unavailable_route_complete(settled_unavailable),
    'unavailable-revision probe accepts the settled Library fallback',
)
check(
    not unavailable_route_complete(
        {**settled_unavailable, 'currentKey': 'expert-aquarium-01@2'}
    ),
    'unavailable-revision probe rejects an incorrectly loaded newer revision',
)


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


def completed_run(puzzle, completed_at):
    return {
        'schemaVersion': 1,
        'key': f"{puzzle['id']}@{puzzle['revision']}",
        'rev': 0,
        'puzzle': puzzle,
        'state': {'levels': list(puzzle['solution']), 'notes': {}},
        'undo': [],
        'redo': [],
        'moves': 1,
        'hints': 0,
        'elapsed': 1,
        'completedAt': completed_at,
        'firstCompletedAt': completed_at,
        'updatedAt': completed_at,
        'note': '',
    }


def seed_completed_runs(page):
    runs = [
        completed_run(V1, '2026-09-12T00:00:00.000Z'),
        completed_run(DISTINCT, '2026-09-12T00:01:00.000Z'),
    ]
    page.evaluate(
        """(runs) => new Promise((resolve, reject) => {
          const request = indexedDB.open('alibi-device');
          request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
          request.onsuccess = () => {
            const tx = request.result.transaction('runs', 'readwrite');
            const store = tx.objectStore('runs');
            for (const run of runs) store.put({key: run.key, value: run});
            tx.oncomplete = () => { request.result.close(); resolve(); };
            tx.onerror = () => reject(tx.error || new Error('IndexedDB write failed'));
          };
        })""",
        runs,
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
        page.evaluate(
            "(key) => setTimeout(() => { location.hash = '/play/' + key; }, 350)",
            'expert-aquarium-01@1',
        )
        snapshot = wait_for_unavailable_revision(page)
        check(
            snapshot['currentKey'] is None,
            f'{width}: unsaved v1 URL does not invent a legacy definition',
        )
        seed_completed_runs(page)
        page.reload()
        page.wait_for_function('()=>window.AlibiDiagnostics')
        route(page, 'expert-aquarium-01@1')
        check(
            page.locator('.play-title h1').inner_text() == V1['title'],
            f'{width}: completed v1 snapshot remains reopenable at its explicit route',
        )
        check(
            page.evaluate('()=>AlibiDiagnostics.getCurrent().completedAt') is not None,
            f'{width}: completed v1 history remains intact',
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
        dismiss(page)

        page.evaluate("location.hash='/journal'")
        page.get_by_role('heading', name='Your journal.').wait_for()
        solved_total = (
            page.locator('.stat-card')
            .filter(has_text='Puzzles solved')
            .locator('strong')
            .inner_text()
            .strip()
        )
        check(
            solved_total == '2',
            f'{width}: journal counts two unique puzzle IDs across three completed revision records',
        )
        check(
            page.evaluate('()=>AlibiDiagnostics.getCounts().records') == 3,
            f'{width}: both Aquarium revisions and the distinct completed puzzle remain stored',
        )
        check(not errors, f'{width}: no browser errors')
        context.close()
    browser.close()

print('PASS', checks, 'Expert Aquarium browser assertions')
