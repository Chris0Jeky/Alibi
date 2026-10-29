"""In-app collection adding (#433): keyboard entry, verified download, refusal and play.

Real built origin, service worker and IndexedDB. Not physical Android or TalkBack acceptance.
CI runs it from tests/browser_workshop_discovery.py (Workshop collection discovery workflow).
"""
import importlib.util
import json
import os
import traceback
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/workshop-add'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787').rstrip('/')
POLICY = {entry['id']: entry for entry in json.loads((ROOT / 'content/workshop/catalogue.json').read_text())['collections']}
RUNS = """async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const rows=await new Promise((ok,no)=>{const q=db.transaction('runs').objectStore('runs').getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});db.close();
return rows.map(r=>JSON.stringify(r)).sort()}"""


def pack(entry_id):
    return json.loads((ROOT / 'content/workshop' / POLICY[entry_id]['source']).read_bytes())


def open_adder(page):
    page.goto(URL + '/#/workshop')
    page.get_by_role('button', name='Puzzle packs', exact=True).click()
    button = page.get_by_role('button', name='Add a curated collection', exact=True)
    button.focus()
    page.keyboard.press('Enter')
    dialog = page.locator('dialog.collections-add[open]')
    expect(dialog).to_be_visible()
    return button, dialog


def add(page, dialog, title):
    dialog.get_by_role('button', name=f'Add {title}', exact=True).click()


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('add_driver', ROOT / 'tests/browser_master_grandmaster_controls.py')
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    checks, failures = [], []
    launch = {'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('ALIBI_BROWSER_EXECUTABLE'):
        launch['executable_path'] = os.environ['ALIBI_BROWSER_EXECUTABLE']
    lattice, afterlight = pack('lattice'), pack('afterlight')
    with sync_playwright() as p:
        browser = p.chromium.launch(**launch)
        try:
            for width in (320, 1280):
                context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(20000)
                requests, errors = [], []
                context.on('request', lambda request: requests.append(request.url))
                page.on('pageerror', lambda error: errors.append(str(error)))
                try:
                    page.goto(URL + '/#/workshop')
                    page.wait_for_function('()=>navigator.serviceWorker.controller && globalThis.AlibiDiagnostics?.getStatus().offlineReady', timeout=45000)
                    page.get_by_role('button', name='Puzzle packs', exact=True).click()
                    expect(page.get_by_role('button', name='Add a curated collection', exact=True)).to_be_visible()
                    assert not any('/assets/workshop/' in url for url in requests), 'nothing is fetched before the player asks'
                    base = page.evaluate('AlibiDiagnostics.getCounts()')

                    # Keyboard entry, focus, phone layout and Escape return.
                    button, dialog = open_adder(page)
                    expect(page.locator('#collections-title')).to_be_focused()
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    for title in (lattice['title'], afterlight['title']):
                        box = dialog.get_by_role('button', name=f'Add {title}', exact=True).bounding_box()
                        assert box['height'] >= 44, box
                    dialog.screenshot(path=str(OUT / f'adder-{width}.png'))
                    page.keyboard.press('Escape')
                    expect(page.locator('dialog.collections-add')).to_have_count(0)
                    expect(button).to_be_focused()
                    assert page.evaluate('AlibiDiagnostics.getCounts()') == base
                    checks.append({'width': width, 'case': 'keyboard-entry-focus-escape-no-install'})

                    # Add Afterlight, then make a saved run that later failures must not touch.
                    _, dialog = open_adder(page)
                    add(page, dialog, afterlight['title'])
                    expect(page.locator('#dialog[open]')).to_contain_text(f"{len(afterlight['puzzles'])} verified puzzles", timeout=45000)
                    page.get_by_role('button', name='Play the first puzzle', exact=True).click()
                    first = afterlight['puzzles'][0]
                    page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=first['id'])
                    driver.dismiss_lesson(page)
                    driver.mutate_once(page, first)
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    counts = page.evaluate('AlibiDiagnostics.getCounts()')
                    assert counts['puzzles'] == base['puzzles'] + len(afterlight['puzzles'])
                    checks.append({'width': width, 'case': 'afterlight-added-played-saved'})

                    # Closing or navigating away cancels even a fetch implementation that
                    # ignores abort and supplies its response later. No importer may run.
                    for cancel in ('escape', 'close', 'navigation'):
                        button, dialog = open_adder(page)
                        page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                        before_cancel = page.evaluate(RUNS)
                        page.evaluate("""()=>{
                            const original = window.fetch;
                            window.__lateCollection = {original};
                            window.fetch = (url, options) => String(url).includes('/assets/workshop/lattice.')
                                ? new Promise(resolve => Object.assign(window.__lateCollection, {resolve, options}))
                                : original(url, options);
                        }""")
                        add(page, dialog, lattice['title'])
                        page.wait_for_function('()=>!!window.__lateCollection.resolve')
                        expect(dialog.locator('[role="status"]')).to_contain_text('Close to cancel')
                        if cancel == 'escape':
                            page.keyboard.press('Escape')
                        elif cancel == 'close':
                            dialog.get_by_role('button', name='Close', exact=True).click()
                        else:
                            page.evaluate("location.hash = '#/'")
                        expect(page.locator('dialog.collections-add')).to_have_count(0)
                        if cancel != 'navigation':
                            expect(button).to_be_focused()
                        assert page.evaluate('window.__lateCollection.options.signal?.aborted === true'), cancel
                        page.evaluate("""bytes=>{
                            const pending = window.__lateCollection;
                            window.fetch = pending.original;
                            pending.resolve(new Response(new ReadableStream({
                                start(stream) { stream.enqueue(new Uint8Array(bytes)); stream.close(); },
                                cancel() { pending.bodyCancelled = true; }
                            })));
                        }""", list((ROOT / 'content/workshop' / POLICY['lattice']['source']).read_bytes()))
                        page.wait_for_function('()=>window.__lateCollection.bodyCancelled === true')
                        expect(page.locator('#dialog[open]')).to_have_count(0)
                        assert page.evaluate('AlibiDiagnostics.getCounts()') == counts
                        assert page.evaluate(RUNS) == before_cancel, 'cancelled download preserves saved runs'
                        checks.append({'width': width, 'case': f'pending-{cancel}-late-response-discarded'})

                    # Tampered bytes, then an offline download: both refused, nothing changed.
                    hits = []

                    def tamper(route):
                        hits.append(route.request.url)
                        body = bytearray((ROOT / 'content/workshop' / POLICY['lattice']['source']).read_bytes())
                        body[40] ^= 1
                        route.fulfill(status=200, body=bytes(body), content_type='application/json')

                    context.route('**/assets/workshop/lattice.*.json', tamper)
                    _, dialog = open_adder(page)
                    # Leaving the board flushes its elapsed time; snapshot only the settled saves.
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    runs = page.evaluate(RUNS)
                    assert any(first['id'] in row for row in runs)
                    add(page, dialog, lattice['title'])
                    expect(dialog.locator('[role="status"]')).to_contain_text('does not match its listed size and fingerprint')
                    assert hits, 'the tampered response was served'
                    context.unroute('**/assets/workshop/lattice.*.json')
                    context.route('**/assets/workshop/lattice.*.json', lambda route: route.abort())
                    add(page, dialog, lattice['title'])
                    expect(dialog.locator('[role="status"]')).to_contain_text('needs a connection')
                    context.unroute('**/assets/workshop/lattice.*.json')
                    expect(dialog.get_by_role('button', name=f"Add {lattice['title']}", exact=True)).to_be_enabled()
                    assert page.evaluate('AlibiDiagnostics.getCounts()') == counts
                    assert page.evaluate(RUNS) == runs, 'refusals leave saved runs byte-identical'
                    checks.append({'width': width, 'case': 'tampered-and-offline-refused-runs-untouched'})

                    # The real download installs; prior runs are still byte-identical.
                    add(page, dialog, lattice['title'])
                    expect(page.locator('#dialog[open]')).to_contain_text(f"{len(lattice['puzzles'])} verified puzzles", timeout=45000)
                    page.get_by_role('button', name='Keep browsing', exact=True).click()
                    installed = page.evaluate('AlibiDiagnostics.getCounts()')
                    assert installed['puzzles'] == counts['puzzles'] + len(lattice['puzzles'])
                    assert page.evaluate(RUNS) == runs, 'adding leaves saved runs byte-identical'
                    _, dialog = open_adder(page)
                    add(page, dialog, lattice['title'])
                    expect(page.locator('#toasts')).to_contain_text('already installed', timeout=45000)
                    assert page.evaluate('AlibiDiagnostics.getCounts()') == installed
                    checks.append({'width': width, 'case': 'lattice-added-duplicate-refused'})

                    # Play an added puzzle with real controls, then resume it offline.
                    puzzle = lattice['puzzles'][-1]
                    page.goto(URL + f"/#/play/{puzzle['id']}@1")
                    page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=puzzle['id'])
                    driver.dismiss_lesson(page)
                    initial = driver.current(page)['state']
                    driver.mutate_once(page, puzzle)
                    changed = driver.current(page)['state']
                    assert changed != initial
                    driver.action(page, 'undo')
                    assert driver.current(page)['state'] == initial
                    driver.action(page, 'redo')
                    assert driver.current(page)['state'] == changed
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    saved = driver.current(page)
                    context.set_offline(True)
                    page.reload()
                    page.wait_for_function('(id)=>globalThis.AlibiDiagnostics?.getCurrent()?.puzzle.id===id', arg=puzzle['id'], timeout=30000)
                    restored = driver.current(page)
                    assert restored['state'] == saved['state'] and restored['moves'] == saved['moves']
                    context.set_offline(False)
                    checks.append({'width': width, 'case': 'lattice-played-undo-redo-offline-resume'})
                    assert not errors, errors
                except Exception as error:
                    failures.append({'width': width, 'error': str(error), 'traceback': traceback.format_exc()})
                    page.screenshot(path=str(OUT / f'failure-{width}.png'), full_page=True)
                finally:
                    context.close()
        finally:
            browser.close()
    if len(checks) != 16:
        failures.append({'coverage': len(checks), 'expected': 16})
    receipt = {'sourceHead': os.environ.get('EXPECTED_HEAD', 'local'), 'passed': not failures,
               'checks': checks, 'failures': failures,
               'scope': 'Built origin, service worker and IndexedDB; no physical device or screen reader.'}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt, indent=2), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
