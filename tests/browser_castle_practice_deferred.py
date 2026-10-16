"""Real completed games and IndexedDB with failed then retried definition delivery.

Service workers are blocked only to prevent cached definitions masking this network
scenario. The existing Castle/full-origin suites own offline and update acceptance.
"""
import importlib.util
import json
import os
import re
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/castle-practice-deferred'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
PATTERN = re.compile(r'.*/assets/official-deferred\.[a-f0-9]{12}\.js$')
PUZZLES = [json.loads((ROOT / f'content/extra/vault-{family}.json').read_text())['puzzles'][0]
           for family in ('binary', 'lightup')]


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location(
        'practice_controls', ROOT / 'tests/browser_master_grandmaster_controls.py')
    controls = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(controls)
    checks = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        try:
            for width in (390, 1280):
                context = browser.new_context(viewport={'width': width, 'height': 900},
                                              service_workers='block', reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(30000)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    for puzzle in PUZZLES:
                        page.goto(URL + '/#/play/' + puzzle['id'] + '@1')
                        page.wait_for_function(
                            '(id)=>globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id===id',
                            arg=puzzle['id'])
                        controls.dismiss_lesson(page)
                        controls.solve(page, puzzle)
                        page.wait_for_function('()=>!!AlibiDiagnostics.getCurrent().completedAt')
                        controls.dismiss_lesson(page)
                        page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    snapshot = page.evaluate('()=>AlibiDiagnostics.getPracticeSnapshot()')
                    for room in ('observatory', 'orangery'):
                        assert snapshot['rooms'][room]['completed'] == 1
                        assert snapshot['rooms'][room]['pending'] is False
                    checks.append({'width': width, 'case': 'two-real-solves-retained-in-committed-saves'})

                    page.route(PATTERN, lambda route: route.abort())
                    page.goto(URL + '/?practice-check=1#/quiet/castle/directory')
                    expect(page.locator('#castle-main h1')).to_have_text('Room directory')
                    assert page.evaluate('ALIBI_DEFERRED.ready') is False
                    assert page.evaluate('AlibiDiagnostics.getStatus().mode') == 'indexeddb'
                    for room in ('observatory', 'orangery'):
                        panel = page.locator(f'[data-practice-room="{room}"]')
                        expect(panel).to_contain_text('At least 0 /')
                        expect(panel).to_contain_text('Some saved completions await puzzle definitions.')
                        expect(panel.locator('[data-do="practice"]').first).to_be_visible()
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                    page.locator('[data-practice-room="observatory"]').screenshot(
                        path=str(OUT / f'pending-{width}.png'))
                    checks.append({'width': width, 'case': 'failed-definition-load-discloses-lower-bound-with-play-controls'})

                    page.unroute(PATTERN)
                    page.evaluate('()=>ALIBI_DEFERRED.ensure()')
                    page.evaluate("location.hash='#/home'")
                    page.wait_for_function('()=>AlibiActivities.diagnostics().active===false')
                    page.evaluate("location.hash='#/quiet/castle/directory'")
                    expect(page.locator('#castle-main h1')).to_have_text('Room directory')
                    for room in ('observatory', 'orangery'):
                        panel = page.locator(f'[data-practice-room="{room}"]')
                        expect(panel).to_contain_text('1 /')
                        expect(panel).not_to_contain_text('At least')
                        expect(panel).not_to_contain_text('await puzzle definitions')
                    page.locator('[data-practice-room="observatory"]').screenshot(
                        path=str(OUT / f'verified-{width}.png'))
                    checks.append({'width': width, 'case': 'validated-retry-restores-exact-counts-without-new-solves'})
                    assert not errors, errors
                except Exception:
                    page.screenshot(path=str(OUT / f'failure-{width}.png'), full_page=True)
                    raise
                finally:
                    context.close()
        finally:
            browser.close()
    assert len(checks) == 6
    (OUT / 'results.json').write_text(json.dumps({
        'checks': checks, 'passed': True, 'physicalDevice': False,
        'serviceWorkers': 'blocked only for controlled definition-network failure',
    }, indent=2) + '\n')
    print(json.dumps(checks), flush=True)


if __name__ == '__main__':
    run()
