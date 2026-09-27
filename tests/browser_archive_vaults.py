"""Archive Heist rooms 10-33 through actual controls on a local real origin.

Serves dist/ on 127.0.0.1 in a fresh Chromium context per viewport, so IndexedDB and reload are
real. No hosted, Android, TalkBack or human-difficulty claim. Set CHROMIUM_PATH (or ALIBI_CHROMIUM)
when Playwright's bundled browser is not installed. Evidence: test-results/archive-heist-vaults.
"""
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT / 'test-results' / 'archive-heist-vaults')))
OUT.mkdir(parents=True, exist_ok=True)
VAULTS = json.loads((ROOT / 'content/challenges/archive-vaults.json').read_text(encoding='utf-8'))[
    'challenges'
]
ROOM_09 = 'RRRRRULLULDULURUULLDRRRRR'  # a winning D-pad replay of room 09, as in browser_club.py
STEP = {'U': 'up', 'D': 'down', 'L': 'left', 'R': 'right'}
KEY = {'U': 'ArrowUp', 'D': 'ArrowDown', 'L': 'ArrowLeft', 'R': 'ArrowRight'}
checks = []


def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT / 'dist'), **kw)

    def log_message(self, *_):
        pass


def quiet_list(page):
    """Wait for the Quiet Wing challenge list and return (heading, card count)."""
    page.wait_for_function(
        """() => { const h = document.getElementById('quiet-host'), r = h && (h.shadowRoot || h);
        return !!r?.querySelector('#main [data-challenge-id]'); }""",
        timeout=30000,
    )
    return page.evaluate(
        """() => { const r = document.getElementById('quiet-host'), m = (r.shadowRoot || r).querySelector('#main');
        return [m.querySelector('h1,h2').textContent, m.querySelectorAll('[data-challenge-id]').length]; }"""
    )


def viewport(browser, base, width, name):
    context = browser.new_context(
        viewport={'width': width, 'height': 900 if width < 768 else 1000}, reduced_motion='reduce'
    )
    page = context.new_page()
    page.set_default_timeout(10000)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))

    def dismiss():
        if page.locator('dialog[open]').count():
            for sel in ('[data-action="lesson-finish"]', '[data-action="close-dialog"]'):
                if page.locator('dialog[open] ' + sel).count():
                    page.locator('dialog[open] ' + sel).first.click()
                    return

    def open_archive():
        page.goto(base + '#/salon/archive')
        page.wait_for_selector('.archive-grid')
        dismiss()

    def diag():
        return page.evaluate('AlibiClub.diagnostics()')

    def run():
        return diag()['state']['runs']['archive']

    def status():
        return page.locator('.archive-status').inner_text()

    def pad(level):
        return page.locator(f'.archive-levels [data-value="{level}"]')

    def walk(path, keyboard=False):
        for ch in path:
            if keyboard:
                page.keyboard.press(KEY[ch])
            else:
                page.locator(f'[data-action="club-walk"][data-value="{STEP[ch]}"]').click()

    def settle():
        # Club saves are queued; wait until the revision stops moving before reloading.
        page.wait_for_function('!AlibiClub.diagnostics().saveError')
        last = -1
        while last != diag()['revision']:
            last = diag()['revision']
            page.wait_for_timeout(400)

    def shot(label):
        page.evaluate('document.activeElement?.blur()')
        page.screenshot(path=str(OUT / f'{name}-{label}.png'), full_page=True)

    open_archive()
    check('ROOM 01 / 33' in page.locator('.archive-header').inner_text(), f'{name}: header counts 33 rooms')
    groups = page.locator('.archive-levels details')
    check(groups.count() == 2, f'{name}: rooms and vaults are two groups')
    check(
        'Rooms 01–09 · 0/9 solved' in groups.nth(0).locator('summary').inner_text()
        and 'Vaults 10–33 · Expert and Master · 0/24 solved' in groups.nth(1).locator('summary').inner_text(),
        f'{name}: group summaries name the sets and solved counts',
    )
    check(
        groups.nth(0).get_attribute('open') is not None and groups.nth(1).get_attribute('open') is None,
        f'{name}: only the group holding the current room starts open',
    )
    check(page.locator('.archive-levels [data-action="club-archive-level"]').count() == 33, f'{name}: 33 room buttons')
    nav, panel = page.locator('.archive-levels').bounding_box(), page.locator('.archive-panel').bounding_box()
    if width < 768:
        check(nav['y'] >= panel['y'] + panel['height'], f'{name}: room navigation sits under the board, not above it')
        check(nav['height'] < 360, f'{name}: room navigation stays compact ({round(nav["height"])}px)')
    else:
        check(nav['x'] >= panel['x'] + panel['width'], f'{name}: room navigation sits beside the board')
    check(not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), f'{name}: no horizontal overflow')
    shot('start')

    pad(8).click()
    check(run()['level'] == 8, f'{name}: room 09 opens from the room grid')
    walk(ROOM_09)
    check('Every record in its place' in status(), f'{name}: room 09 solved through the D-pad')
    card = page.locator('.archive-panel .town-finished')
    check(card.locator('h2').inner_text() == 'The nine rooms end here.', f'{name}: room 09 shows the end-of-set card')
    check('24 vaults' in card.inner_text(), f'{name}: the end card names the vaults as the next step')
    shot('room-09-end')
    card.get_by_role('button', name='Enter the vaults →').click()
    check(run()['level'] == 9 and run()['log'] == [], f'{name}: the end card enters vault room 10')
    check('ROOM 10 / 33' in page.locator('.archive-header').inner_text(), f'{name}: header shows room 10 of 33')
    check(page.locator('.archive-header h2').inner_text() == VAULTS[0]['title'], f'{name}: room 10 is the first vault')
    check('Expert vault · three crates' in status(), f'{name}: room 10 names its difficulty and crates')
    check(groups.nth(1).get_attribute('open') is not None, f'{name}: the vault group opens for a vault room')
    check(
        'active' in pad(9).get_attribute('class') and pad(9).get_attribute('aria-current') == 'true',
        f'{name}: the current room is marked in the grid',
    )
    shot('vault-10-start')

    walk(VAULTS[0]['solutionPath'])
    check('Every record in its place' in status(), f'{name}: vault room 10 solved through the D-pad')
    check(
        '18 pushes' in page.locator('.archive-header').inner_text(),
        f'{name}: the recorded vault solution takes its 18 minimum pushes',
    )
    check(pad(9).inner_text().strip() == '10 ✓', f'{name}: room 10 shows a solved marker')
    check(pad(9).get_attribute('aria-label').endswith(', solved'), f'{name}: the solved marker is announced')
    check('1/24 solved' in groups.nth(1).locator('summary').inner_text(), f'{name}: the vault count updates')
    check(
        any(r['id'].startswith('archive:9:') for r in diag()['state']['records']),
        f'{name}: the journal records the vault room',
    )
    check(
        page.locator('.archive-panel [data-action="club-archive-level"]').inner_text() == 'Next room →',
        f'{name}: vault 10 offers the next room',
    )
    shot('vault-10-solved')

    before = run()
    for value in ('33', '-1', '1.5', 'x'):
        page.evaluate(
            """(v) => { const b = document.createElement('button'); b.dataset.action = 'club-archive-level';
            b.dataset.value = v; b.id = 'probe'; document.querySelector('.archive-panel').append(b); }""",
            value,
        )
        page.locator('#probe').click()
        check(run() == before and not page.locator('dialog[open]').count(), f'{name}: room action ignores {value}')
        page.evaluate("document.getElementById('probe')?.remove()")

    settle()
    check(diag()['storageMode'] != 'session', f'{name}: Club progress uses durable storage')
    page.reload()
    page.wait_for_selector('.archive-grid')
    dismiss()
    after = run()
    check(
        after['level'] == 9 and len(after['log']) == len(VAULTS[0]['solutionPath']),
        f'{name}: reload keeps vault room 10 and its replay',
    )
    check('Every record in its place' in status(), f'{name}: reload keeps vault room 10 solved')
    check(
        [pad(8).text_content(), pad(9).text_content()] == ['09 ✓', '10 ✓'],
        f'{name}: reload keeps the solved markers',
    )
    shot('after-reload')

    if width >= 768:
        pad(32).click()
        walk(VAULTS[23]['solutionPath'])
        check('Every record in its place' in status(), f'{name}: vault room 33 solved through the D-pad')
        card = page.locator('.archive-panel .town-finished')
        check(card.locator('h2').inner_text() == 'The last vault is done.', f'{name}: room 33 shows its end card')
        check('Vaults still open: 22.' in card.inner_text(), f'{name}: the room 33 card counts open vaults')
        shot('room-33-end')
        card.get_by_role('button', name='Room 11 →').click()
        for index in range(1, 23):
            check(run()['level'] == 9 + index, f'{name}: room {10 + index} is open')
            walk(VAULTS[index]['solutionPath'], keyboard=True)
            check('Every record in its place' in status(), f'{name}: vault room {10 + index} solved by keyboard')
            page.locator('.archive-panel [data-action="club-archive-level"]').click()
        check(run()['level'] == 32 and not run()['log'], f'{name}: the next room after 32 is room 33')
        check('24/24 solved' in groups.nth(1).locator('summary').inner_text(), f'{name}: every vault is marked solved')
        walk(VAULTS[23]['solutionPath'], keyboard=True)
        card = page.locator('.archive-panel .town-finished')
        check(card.locator('h2').inner_text() == 'Every vault cleared.', f'{name}: the final card says every vault is cleared')
        check(card.get_by_role('button', name='Curated challenges →').count() == 1, f'{name}: the final card offers a next step')
        shot('every-vault-cleared')

    page.goto(base + '#/salon')
    page.wait_for_selector('.club-challenge-entry')
    dismiss()
    check(
        page.locator('.club-gamecard', has_text='Archive Heist').inner_text().count('SPATIAL · 9 ROOMS + 24 VAULTS') == 1,
        f'{name}: the Games Room card names the vaults',
    )
    link = page.locator('.club-challenge-entry a', has_text='Borough contracts')
    check(link.get_attribute('href') == '#/quiet/challenges', f'{name}: the Borough contracts link targets the list')
    shot('games-room')
    link.click()
    heading, cards = quiet_list(page)
    check(heading == 'Fixed starts. Your own route.' and cards > 0, f'{name}: the Borough contracts link lands on the challenge list')
    page.go_back()
    page.wait_for_selector('.club-challenge-entry')
    check(page.evaluate('location.hash') == '#/salon', f'{name}: Back returns from the challenge list to the Games Room')
    page.goto(base + '#/salon')
    page.wait_for_selector('.club-challenge-entry')
    page.locator('.club-challenge-entry button', has_text='Curated challenges').click()
    heading, cards = quiet_list(page)
    check(heading == 'Fixed starts. Your own route.' and cards > 0, f'{name}: the Curated challenges entry opens the list')
    page.goto(base + '#/salon/borough')
    page.wait_for_selector('.borough-grid')
    dismiss()
    check(
        page.locator('.club-playtools a', has_text='12 planning contracts').get_attribute('href')
        == '#/quiet/challenges',
        f'{name}: the Pocket Borough page links the planning contracts',
    )
    shot('borough')
    check(not errors, f'{name}: no unhandled page errors')
    context.close()


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            launch = {}
            executable = os.environ.get('CHROMIUM_PATH') or os.environ.get('ALIBI_CHROMIUM')
            if executable or Path('/usr/bin/chromium').exists():
                launch['executable_path'] = executable or '/usr/bin/chromium'
            browser = p.chromium.launch(**launch)
            for width, name in ((390, 'phone'), (1280, 'desktop')):
                viewport(browser, base, width, name)
            browser.close()
    finally:
        server.shutdown()
    (OUT / 'results.json').write_text(
        json.dumps(
            {
                'passed': True,
                'assertions': len(checks),
                'scope': 'Local real origin (IndexedDB, reload) at 390px and 1280px. Not hosted, Android or TalkBack.',
                'checks': checks,
            },
            indent=2,
        ),
        encoding='utf-8',
    )


if __name__ == '__main__':
    main()
