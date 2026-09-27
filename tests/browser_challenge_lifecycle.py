"""Actual controls and persisted legacy Duel recovery, at phone and desktop sizes."""
import json
import os
import threading
import traceback
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/challenge-lifecycle'
WIDTHS = (390, 1280)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'dist'), **kwargs)

    def log_message(self, *_):
        pass


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    checks, failures = [], []
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f'http://127.0.0.1:{server.server_port}/'
    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(headless=True, args=['--no-sandbox'])
            try:
                for width in WIDTHS:
                    context = browser.new_context(
                        viewport={'width': width, 'height': 900}, reduced_motion='reduce'
                    )
                    page = context.new_page()
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    try:
                        page.goto(base + '#/quiet/challenges/curated-classic-hanoi-01')
                        expect(page.locator('.challenge-launcher')).to_be_visible(timeout=30000)
                        page.wait_for_function(
                            '() => navigator.serviceWorker.controller && globalThis.AlibiDiagnostics?.getStatus().offlineReady',
                            timeout=30000,
                        )
                        page.wait_for_function(
                            '() => globalThis.AlibiActivities?.diagnostics().offline', timeout=30000
                        )
                        actions = page.evaluate('''() => {
                          const registry = AlibiChallenges.create(ALIBI_CHALLENGE_DATA,
                            {quiet: QWEngine, club: AlibiClubEngines});
                          return registry.get('curated-classic-hanoi-01').solutionActions;
                        }''')
                        for action in actions:
                            for cell in (action['from'], action['to']):
                                page.locator(f'[data-action="peg"][data-value="{cell}"]').click()
                        expect(page.locator('.result')).to_contain_text('Challenge complete')
                        page.locator('[data-challenge="reset"]').click()
                        expect(page.locator('.challenge-launcher')).to_contain_text('Clear your finished route')
                        page.locator('[data-action="peg"][data-value="2"]').click()
                        expect(page.locator('.challenge-status')).to_contain_text('This challenge is complete.')
                        expect(page.locator('.challenge-launcher')).not_to_contain_text('Clear your finished route')
                        page.locator('[data-action="peg"][data-value="0"]').click()
                        expect(page.locator('.result')).to_contain_text('Challenge complete')
                        page.screenshot(path=str(OUT / f'{width}-completed-route-protected.png'))
                        # A new reset attempt needs fresh consent; explicit Undo remains available.
                        page.locator('[data-challenge="reset"]').click()
                        expect(page.locator('.result')).to_contain_text('Challenge complete')
                        page.locator('[data-challenge="keep"]').click()
                        page.locator('[data-challenge="undo"]').click()
                        expect(page.locator('.result')).to_have_count(0)
                        final = actions[-1]
                        for cell in (final['from'], final['to']):
                            page.locator(f'[data-action="peg"][data-value="{cell}"]').click()
                        expect(page.locator('.result')).to_contain_text('Challenge complete')
                        checks.append(f'{width}px: completed Hanoi resists stray moves; reset consent and Undo work')

                        # Seed a synthetic, valid old run directly in the real IndexedDB store.
                        # Its final Ink reply is intentionally absent, matching the legacy save defect.
                        page.goto(base + '#/quiet/challenges?family=reversi')
                        expect(page.locator('#challenge-family')).to_be_visible(timeout=30000)
                        legacy = page.evaluate('''async () => {
                          const registry = AlibiChallenges.create(ALIBI_CHALLENGE_DATA,
                            {quiet: QWEngine, club: AlibiClubEngines});
                          const c = registry.get('curated-duel-02'), run = registry.begin(c.id);
                          run.log = c.principalVariation.slice(0, -1);
                          const before = registry.replay(run);
                          if (before.state.turn !== -1 || before.complete) throw Error('Bad legacy fixture');
                          await new Promise((resolve, reject) => {
                            const req = indexedDB.open('alibi-challenges-v1', 1);
                            req.onerror = () => reject(req.error);
                            req.onsuccess = () => {
                              const db = req.result, tx = db.transaction('runs', 'readwrite');
                              tx.objectStore('runs').put({schema: 1, revision: 1, run}, c.id);
                              tx.oncomplete = () => {db.close(); resolve();};
                              tx.onerror = tx.onabort = () => {db.close(); reject(tx.error);};
                            };
                          });
                          return {id: c.id, expected: c.principalVariation};
                        }''')
                        page.goto(base + '#/quiet/challenges/' + legacy['id'])
                        expect(page.locator('.result')).to_contain_text('Challenge complete', timeout=30000)
                        # No board input: simply go back. The list must read the settled completion.
                        page.locator('#challenge-back').click()
                        card = page.locator(f'[data-challenge-id="{legacy["id"]}"] .pill')
                        expect(card).to_contain_text('Completed', timeout=15000)
                        page.screenshot(path=str(OUT / f'{width}-settled-duel-list.png'))
                        persisted = page.evaluate('''async (id) => new Promise((resolve, reject) => {
                          const req = indexedDB.open('alibi-challenges-v1', 1);
                          req.onerror = () => reject(req.error);
                          req.onsuccess = () => {
                            const db = req.result, tx = db.transaction('runs', 'readonly');
                            const read = tx.objectStore('runs').get(id);
                            tx.oncomplete = () => {db.close(); resolve(read.result);};
                            tx.onerror = tx.onabort = () => {db.close(); reject(tx.error);};
                          };
                        })''', legacy['id'])
                        assert persisted['run']['log'] == legacy['expected']
                        assert persisted['revision'] == 2, 'the settled reply must be persisted exactly once'
                        page.goto(base + '#/quiet/challenges/' + legacy['id'])
                        expect(page.locator('.result')).to_contain_text('Challenge complete', timeout=30000)
                        context.set_offline(True)
                        page.reload()
                        expect(page.locator('.result')).to_contain_text('Challenge complete', timeout=30000)
                        context.set_offline(False)
                        checks.append(f'{width}px: legacy Ink reply persists without a player move and reopens offline')
                        assert not errors, errors
                    except Exception as error:
                        failures.append({'width': width, 'error': str(error), 'traceback': traceback.format_exc()})
                        page.screenshot(path=str(OUT / f'{width}-failure.png'), full_page=True)
                    finally:
                        context.close()
            finally:
                browser.close()
    except Exception as error:
        failures.append({'scenario': 'setup', 'error': str(error), 'traceback': traceback.format_exc()})
    finally:
        server.shutdown()
    if len(checks) != 4:
        failures.append({'scenario': 'coverage', 'expected': 4, 'completed': len(checks)})
    receipt = {'passed': not failures, 'sourceHead': os.environ.get('EXPECTED_HEAD', 'unrecorded'),
               'checks': checks, 'failures': failures, 'widths': list(WIDTHS),
               'scope': 'Actual DOM controls and synthetic IndexedDB recovery; not physical Android or human calibration.'}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2), encoding='utf-8')
    print(json.dumps(receipt, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
