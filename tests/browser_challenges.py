"""Exercise the trusted launcher controls directly at phone and desktop widths."""
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DATA = [item for name in ('classics', 'warehouse', 'reversi', 'borough') for item in json.loads((ROOT / 'content' / 'challenges' / f'{name}.json').read_text())['challenges']]

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
        page.evaluate('() => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-classic-hanoi-01", window.persisted, () => {})')
        assert '1 moves' in page.locator('.challenge-status').inner_text()
        page.evaluate('(data) => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-classic-queens-01", null, () => {})', DATA)
        assert page.locator('[data-action="cell"][data-value="8"]').is_disabled()
        page.evaluate('() => AlibiChallengeLauncher.mount(document.querySelector("#host"), registry, "curated-archive-01", null, () => {})')
        assert page.locator('[data-action="walk"]').count() == 4
        assert page.evaluate('''async () => { const store = AlibiChallengeStore.create(registry); await store.open(); const run = registry.begin('curated-classic-hanoi-02'); run.log.push({from: 2, to: 0}); await store.write(run); return (await store.read(run.challengeId)).log.length; }''') == 1
        page.close()
    browser.close()
finally:
  server.shutdown()
  server.server_close()
print('PASS trusted challenge launcher controls and saved replay restore at phone and desktop widths.')
