"""Exercise the trusted launcher controls directly at phone and desktop widths."""
import json
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DATA = [item for name in ('classics', 'warehouse', 'reversi', 'borough') for item in json.loads((ROOT / 'content' / 'challenges' / f'{name}.json').read_text())['challenges']]
BY_ID = {item['id']: item for item in DATA}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
thread = threading.Thread(target=server.serve_forever, daemon=True)
thread.start()
try:
  with sync_playwright() as p:
    browser = p.chromium.launch()
    for width in (390, 1280):
        page = browser.new_page(viewport={'width': width, 'height': 900})
        page.goto(f'http://127.0.0.1:{server.server_port}/')
        page.set_content('<main id="host"></main>')
        for source in ('src/quiet-wing/engine.js', 'src/club-engines.js', 'src/challenges.js', 'src/challenge-storage.js', 'src/challenge-launcher.js'):
            page.add_script_tag(path=str(ROOT / source))
        page.evaluate('(data) => { window.registry = AlibiChallenges.create(data, {quiet: QWEngine, club: AlibiClubEngines}); window.persisted = null; AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-classic-hanoi-01", null, run => window.persisted = run); }', DATA)
        page.locator('[data-action="peg"][data-value="1"]').click()
        page.locator('[data-action="peg"][data-value="2"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()
        page.locator('[data-challenge="undo"]').click()
        assert '0 moves' in page.locator('.challenge-status').inner_text()
        page.locator('[data-action="peg"][data-value="1"]').click()
        page.locator('[data-action="peg"][data-value="2"]').click()
        page.evaluate('() => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-classic-hanoi-01", window.persisted, () => {})')
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        def mount(challenge_id):
            page.evaluate('(id) => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, id, null, () => {})', challenge_id)

        sliding = BY_ID['curated-classic-sliding-01']['solutionActions'][0]
        mount('curated-classic-sliding-01')
        page.locator(f'[data-action="cell"][data-value="{sliding["cell"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        river = BY_ID['curated-classic-river-01']['solutionActions'][0]
        mount('curated-classic-river-01')
        page.locator(f'[data-action="item"][data-value="{river["item"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        jugs = BY_ID['curated-classic-jugs-01']['solutionActions'][0]
        mount('curated-classic-jugs-01')
        page.locator(f'[data-action="jug"][data-value="{jugs["i"]}"][data-kind="{jugs["kind"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        queens = BY_ID['curated-classic-queens-01']['solutionActions'][0]
        mount('curated-classic-queens-01')
        assert page.locator('[data-action="cell"][data-value="8"]').is_disabled()
        page.locator(f'[data-action="cell"][data-value="{queens["cell"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        magic = BY_ID['curated-classic-magic-01']['solutionActions'][0]
        mount('curated-classic-magic-01')
        page.locator(f'[data-action="magic"][data-value="{magic["from"]}"]').click()
        page.locator(f'[data-action="magic"][data-value="{magic["to"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        knight = BY_ID['curated-classic-knight-01']['solutionActions'][0]
        mount('curated-classic-knight-01')
        assert page.locator('[data-action="cell"][data-value="0"]').is_disabled()
        page.locator(f'[data-action="cell"][data-value="{knight["cell"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        mount('curated-archive-01')
        assert page.locator('[data-action="walk"]').count() == 4
        warehouse = BY_ID['curated-archive-01']['solutionPath'][0]
        direction = {'U': 'up', 'R': 'right', 'D': 'down', 'L': 'left'}[warehouse]
        page.locator(f'[data-action="walk"][data-value="{direction}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        duel = BY_ID['curated-duel-01']['principalVariation'][0]
        mount('curated-duel-01')
        page.locator(f'[data-action="cell"][data-value="{duel}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        borough = BY_ID['curated-borough-01']['solutionActions'][0]
        mount('curated-borough-01')
        page.locator(f'[data-action="slot"][data-value="{borough["slot"]}"]').click()
        page.locator(f'[data-action="plot"][data-value="{borough["cell"]}"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()

        assert page.evaluate('''async () => { const store = AlibiChallengeStore.create(registry); await store.open(); const run = registry.begin('curated-classic-hanoi-02'); run.log.push({from: 2, to: 0}); await store.write(run); return (await store.read(run.challengeId)).log.length; }''') == 1
        assert page.evaluate('''async () => {
          const db = await new Promise((resolve,reject)=>{const r=indexedDB.open('alibi-challenges-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
          for (const readFirst of [true,false]) {
            const id=registry.entries()[readFirst?0:1].id, future={schema:2,revision:0,unrecognised:'keep exactly'};
            await new Promise((resolve,reject)=>{const tx=db.transaction('runs','readwrite');tx.objectStore('runs').put(future,id);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
            const store=AlibiChallengeStore.create(registry);await store.open();
            if(readFirst){let refused=false;try{await store.read(id)}catch{refused=true}if(!refused)throw Error('Future read accepted')}
            let refused=false;try{await store.write(registry.begin(id))}catch{refused=true}if(!refused)throw Error('Future write accepted');
            const after=await new Promise(resolve=>{const r=db.transaction('runs').objectStore('runs').get(id);r.onsuccess=()=>resolve(r.result)});
            if(JSON.stringify(after)!==JSON.stringify(future))throw Error('Future record changed');
          }
          db.close(); return true;
        }''')
        page.close()
    browser.close()

    production_url = os.environ.get('ALIBI_URL8795')
    if production_url:
        page = p.chromium.launch().new_page(viewport={'width': 390, 'height': 900})
        page.goto(production_url.rstrip('/') + '#/quiet/challenges')
        page.locator('[data-challenge-id]').first.wait_for()
        assert page.locator('[data-challenge-id]').count() == 59
        page.locator('[data-challenge-id="curated-classic-hanoi-01"]').click()
        page.locator('[data-action="peg"][data-value="1"]').click()
        page.locator('[data-action="peg"][data-value="2"]').click()
        assert '1 moves' in page.locator('.challenge-status').inner_text()
        page.context.browser.close()
finally:
  server.shutdown()
  server.server_close()
print('PASS trusted challenge launcher controls and saved replay restore at phone and desktop widths.')
