"""The curated challenge library as a player meets it in the built Quiet Wing, at phone and desktop widths."""
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT / 'test-results' / 'challenge-library')))
OUT.mkdir(parents=True, exist_ok=True)
PACKS = json.loads((ROOT / 'content/challenges/registry.json').read_text())['packs']
BY_ID = {c['id']: c for name in PACKS for c in json.loads((ROOT / 'content/challenges' / name).read_text())['challenges']}
STEP = {'U': 'up', 'R': 'right', 'D': 'down', 'L': 'left'}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT / 'dist'), **kw)

    def log_message(self, *_):
        pass


def status(page):
    return page.locator('.challenge-status').inner_text()


def run():
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as p:
            launch = {'executable_path': os.environ['ALIBI_CHROMIUM']} if os.environ.get('ALIBI_CHROMIUM') else {}
            browser = p.chromium.launch(**launch)
            for width, height in ((390, 844), (1280, 800)):
                context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce', has_touch=width < 600)
                context.route('**/assets/pulseboard.*.js', lambda r: r.abort())
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda e: errors.append(str(e)))
                shot = lambda name: page.screenshot(path=str(OUT / f'{width}-{name}.png'), full_page=True)

                # Classics offer a real button into the library.
                page.goto(base + '#/quiet/classics')
                entry = page.locator('#classics-challenges')
                entry.wait_for(timeout=20000)
                assert entry.bounding_box()['height'] >= 44
                entry.click()
                page.locator('.challenge-family').first.wait_for(timeout=15000)
                assert page.locator('.challenge-family summary:visible').count() == 10
                assert page.locator('[data-challenge-id]:visible').count() == 0
                names = page.locator('#challenge-family option').all_inner_texts()
                assert 'Archive Heist (36)' in names and 'Lantern Duel endgames (8)' in names, names
                assert not any(n.startswith(('hanoi', 'warehouse', 'reversi')) for n in names)
                list_height = page.evaluate('document.scrollingElement.scrollHeight')
                assert list_height < 3000, list_height
                shot('list-collapsed')

                # A family deep link opens only that family, with difficulty chips.
                page.goto(base + '#/quiet/challenges?family=warehouse')
                page.locator('[data-challenge-id]:visible').first.wait_for(timeout=15000)
                assert page.locator('#challenge-family').input_value() == 'warehouse'
                assert page.locator('[data-challenge-id]:visible').count() == 36
                vault = BY_ID['curated-archive-vault-01']
                card = page.locator(f'[data-challenge-id="{vault["id"]}"]')
                assert 'ARCHIVE HEIST' in card.inner_text().upper() and vault['difficulty'].upper() in card.inner_text().upper()
                shot('list-warehouse')
                card.click()
                page.locator('.challenge-launcher').wait_for(timeout=15000)
                assert page.locator('.pagehead .eyebrow').inner_text().upper() == '05 / ARCHIVE HEIST'
                assert 'brass plate' in page.locator('.challenge-legend').inner_text()
                shot('vault-start')
                for i, move in enumerate(vault['solutionPath']):
                    d = STEP[move]
                    if i % 3 == 0:
                        page.locator(f'[data-action="step"][data-value="{d}"]').click()
                    elif i % 3 == 1:
                        page.locator(f'[data-action="walk"][data-value="{d}"]').click()
                    else:
                        page.keyboard.press('Arrow' + d.capitalize())
                assert 'Complete in' in status(page)
                card = page.locator('.result')
                assert vault['difficulty'].upper() in card.inner_text().upper()
                shot('vault-complete')
                page.locator('[data-challenge="next"]').click()
                page.wait_for_function("() => location.hash.endsWith('curated-archive-vault-02')")
                page.locator('.pagehead h1').filter(has_text=BY_ID['curated-archive-vault-02']['title']).wait_for(timeout=15000)
                page.locator('.challenge-status').filter(has_text='0 moves').wait_for(timeout=15000)
                page.locator('#challenge-back').click()
                page.wait_for_function("() => location.hash.endsWith('challenges?family=warehouse')")
                done = page.locator(f'[data-challenge-id="{vault["id"]}"] .pill')
                done.filter(has_text='Completed').wait_for(timeout=15000)
                page.locator('.challenge-family[data-family="warehouse"] summary').filter(has_text='1 of 36 completed').wait_for(timeout=5000)
                shot('list-marked')

                # Lantern Duel endgame: Gold only, Ink replies by itself, then a guarded restart.
                duel = BY_ID['curated-duel-01']
                page.goto(base + '#/quiet/challenges/curated-duel-01')
                page.locator('.challenge-launcher').wait_for(timeout=15000)
                assert 'Gold to move' in status(page)
                shot('duel-start')
                # Ink may pass inside the recorded line, so pick out the moves that are Gold's.
                gold = page.evaluate('''(c) => { const R = AlibiClubEngines.reversi; let s = c.startState;
                  return c.principalVariation.filter((m) => { const mine = s.turn > 0; s = R.move(s, m); return mine; }); }''', duel)
                for move in gold:
                    page.locator(f'[data-action="cell"][data-value="{move}"]').click()
                assert 'Complete in' in status(page)
                shot('duel-complete')
                page.locator('[data-challenge="reset"]').click()
                assert 'Complete in' in status(page)
                assert 'start again?' in page.locator('.challenge-launcher').inner_text()
                shot('duel-confirm-restart')
                page.locator('[data-challenge="keep"]').click()
                assert 'Complete in' in status(page)
                page.locator('[data-challenge="reset"]').click()
                page.locator('[data-challenge="reset"]').click()
                assert 'Gold to move' in status(page) and page.locator('[data-challenge="undo"]').is_disabled()

                legal = page.locator('[data-action="cell"]:enabled').evaluate_all('es => es.map(e => +e.dataset.value)')
                wrong = next(m for m in legal if m != duel['solutionFirstMove'])
                page.locator(f'[data-action="cell"][data-value="{wrong}"]').click()
                assert 'can no longer force a win' in status(page)
                page.locator('.challenge-hint summary').click()
                assert duel['hint'] in page.locator('.challenge-hint').inner_text()
                shot('duel-lost-hint')

                # Pocket Borough contract: named buildings, their scoring, and a visible selection.
                page.goto(base + '#/quiet/challenges/curated-borough-vault-01')
                page.locator('.challenge-launcher').wait_for(timeout=15000)
                page.locator('[data-action="plot"]:enabled').first.click()
                assert 'Choose a plan first.' in status(page)
                page.locator('[data-action="slot"]').first.click()
                chosen = page.locator('[data-action="slot"][aria-pressed="true"]').evaluate('e=>getComputedStyle(e).backgroundColor')
                other = page.locator('[data-action="slot"][aria-pressed="false"]').first.evaluate('e=>getComputedStyle(e).backgroundColor')
                assert chosen != other
                assert 'points' in page.locator('.challenge-offers').inner_text()
                shot('borough-selected')

                page.goto(base + '#/quiet/challenges/curated-classic-hanoi-01')
                page.locator('.challenge-pegs i').first.wait_for(timeout=15000)
                shot('hanoi-discs')
                assert not errors, errors
                context.close()
                print(width, 'PASS', flush=True)
            browser.close()
    finally:
        server.shutdown()
    print('PASS challenge library: deep link, grouped list, completion marks, vault walking, Duel replies, guarded restart.')


if __name__ == '__main__':
    run()
