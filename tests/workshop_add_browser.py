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
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8797').rstrip('/')
POLICY = {entry['id']: entry for entry in json.loads((ROOT / 'content/workshop/catalogue.json').read_text())['collections']}
RUNS = """async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
const rows=await new Promise((ok,no)=>{const q=db.transaction('runs').objectStore('runs').getAll();q.onsuccess=()=>ok(q.result);q.onerror=()=>no(q.error)});db.close();
return rows.map(r=>JSON.stringify(r)).sort()}"""
CATALOGUE = """()=>{const {puzzles,customPacks}=AlibiDiagnostics.getCounts();return {puzzles,customPacks}}"""
ROWS = """async()=>{const db=await new Promise((ok,no)=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
try{return await new Promise((ok,no)=>{const tx=db.transaction(['runs','packs','meta']);
const entries=['runs','packs','meta'].map(name=>[name,tx.objectStore(name).getAll()]);
tx.oncomplete=()=>ok(Object.fromEntries(entries.map(([name,q])=>[name,q.result.map(row=>JSON.stringify(row)).sort()])));
tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||Error('snapshot aborted'))})}finally{db.close()}}"""


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


def open_current_adder(page):
    page.get_by_role('button', name='Add a curated collection', exact=True).click()
    dialog = page.locator('dialog.collections-add[open]')
    expect(dialog).to_be_visible()
    return dialog


def add(page, dialog, title):
    dialog.get_by_role('button', name=f'Add {title}', exact=True).click()


def choose_pack(page, data):
    page.locator('#pack-input').set_input_files({
        'name': data['id'] + '.json', 'mimeType': 'application/json',
        'buffer': json.dumps(data).encode(),
    })


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    spec = importlib.util.spec_from_file_location('add_driver', ROOT / 'tests/browser_master_grandmaster_controls.py')
    driver = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(driver)
    checks, failures = [], []
    launch = {'headless': True, 'args': ['--no-sandbox', '--disable-gpu']}
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
                    # Load a second actual app before either collection is installed.
                    # Its in-memory catalogue deliberately remains stale throughout play.
                    stale = context.new_page()
                    stale.set_default_timeout(20000)
                    stale.on('pageerror', lambda error: errors.append(str(error)))
                    stale.goto(URL + '/#/workshop')
                    stale.wait_for_function('()=>globalThis.AlibiDiagnostics?.getStatus().mode==="indexeddb"')
                    stale.get_by_role('button', name='Puzzle packs', exact=True).click()
                    assert stale.evaluate('AlibiDiagnostics.getCounts()') == base

                    # The optional adder chunk cannot load (#887): a plain message, not the module error.
                    probe = context.new_page()
                    probe.set_default_timeout(20000)
                    probe.goto(URL + '/#/workshop')
                    probe.wait_for_function('()=>globalThis.AlibiDiagnostics?.getStatus().mode==="indexeddb"')
                    probe.get_by_role('button', name='Puzzle packs', exact=True).click()
                    context.route('**/assets/workshop/add.*.js', lambda route: route.abort())
                    probe.get_by_role('button', name='Add a curated collection', exact=True).click()
                    expect(probe.locator('#toasts')).to_contain_text('Adding a collection needs a connection', timeout=20000)
                    expect(probe.locator('#toasts')).not_to_contain_text('dynamically imported')
                    expect(probe.locator('dialog.collections-add')).to_have_count(0)
                    context.unroute('**/assets/workshop/add.*.js')
                    probe.close()
                    checks.append({'width': width, 'case': 'adder-chunk-offline-plain-message'})

                    # Keyboard entry, focus, phone layout and Escape return.
                    button, dialog = open_adder(page)
                    expect(page.locator('#collections-title')).to_be_focused()
                    expect(dialog.locator('[data-pack-status="lattice"]')).to_have_text('No matching pack ID found.')
                    expect(dialog.locator('[data-pack-status="afterlight"]')).to_have_text('No matching pack ID found.')
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
                    expect(dialog.locator('[data-pack-status="lattice"]')).to_contain_text('Pack ID present')
                    expect(dialog.locator('[data-pack-status="afterlight"]')).to_contain_text('contents unverified')
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

                    # Remove an imported pack (#887) through the real confirmation. Its saved run is kept,
                    # still opens and still exports, and the same pack can be imported again.
                    page.goto(URL + '/#/workshop')
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    page.get_by_role('button', name='Puzzle packs', exact=True).click()
                    twelve = json.loads((ROOT / 'examples/twelve-families.json').read_text())
                    mine = next(p for p in twelve['puzzles'] if p['type'] == 'binary')
                    pre_removal = page.evaluate(CATALOGUE)
                    choose_pack(page, twelve)
                    expect(page.locator('#dialog[open]')).to_contain_text(f"{len(twelve['puzzles'])} verified puzzles", timeout=45000)
                    page.get_by_role('button', name='Keep browsing', exact=True).click()
                    page.goto(URL + f"/#/play/{mine['id']}@{mine['revision']}")
                    page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=mine['id'])
                    driver.dismiss_lesson(page)
                    driver.mutate_once(page, mine)
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    played = driver.current(page)
                    page.goto(URL + '/#/workshop')
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    page.get_by_role('button', name='Puzzle packs', exact=True).click()
                    runs_kept = page.evaluate(RUNS)
                    assert any(mine['id'] in row for row in runs_kept)
                    assert page.locator('.pack-row [data-action="remove-pack"]').count() == page.locator('.pack-row').count()
                    remove = page.get_by_role('button', name=f"Remove {twelve['title']}", exact=True)
                    assert remove.bounding_box()['height'] >= 36
                    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                    page.locator('.pack-row', has_text=twelve['title']).screenshot(path=str(OUT / f'pack-row-{width}.png'))
                    remove.click()
                    confirm = page.locator('#dialog[open]')
                    expect(confirm).to_contain_text(f"Remove {twelve['title']}?")
                    expect(confirm).to_contain_text(f"{len(twelve['puzzles'])} puzzles")
                    expect(confirm).to_contain_text('Saved progress for them is kept')
                    confirm.screenshot(path=str(OUT / f'remove-dialog-{width}.png'))
                    confirm.get_by_role('button', name='Keep it', exact=True).click()
                    expect(page.locator('#dialog[open]')).to_have_count(0)
                    expect(remove).to_be_focused()
                    assert page.evaluate(CATALOGUE)['customPacks'] == pre_removal['customPacks'] + 1
                    remove.click()
                    confirm.get_by_role('button', name='Remove pack', exact=True).click()
                    expect(page.locator('#dialog[open]')).to_have_count(0)
                    expect(page.locator('.pack-row', has_text=twelve['title'])).to_have_count(0)
                    expect(page.locator('#toasts')).to_contain_text('Pack removed')
                    expect(page.locator('.pack-row [data-action="remove-pack"]').first).to_be_focused()
                    assert page.evaluate(CATALOGUE) == pre_removal, 'only the removed pack left the catalogue'
                    assert page.evaluate(RUNS) == runs_kept, 'removal leaves saved runs byte-identical'
                    assert twelve['id'] not in ''.join(page.evaluate(ROWS)['packs'])
                    # The saved run still opens from its own pinned definition; the backup still carries it.
                    page.goto(URL + f"/#/play/{mine['id']}@{mine['revision']}")
                    page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id', arg=mine['id'])
                    assert driver.current(page)['state'] == played['state']
                    page.goto(URL + '/#/settings')
                    with page.expect_download() as download:
                        page.locator('[data-action="export"]').first.click()
                    backup = json.loads(Path(download.value.path()).read_text())
                    assert any(run['puzzle']['id'] == mine['id'] for run in backup['runs'])
                    assert all(pack['id'] != twelve['id'] for pack in backup['packs'])
                    # Adding the same pack again is not refused. Opening the run refreshed its clock; snapshot afresh.
                    page.goto(URL + '/#/workshop')
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    runs_kept = page.evaluate(RUNS)
                    page.get_by_role('button', name='Puzzle packs', exact=True).click()
                    # A removed pack's saved identity is still reserved (#889).
                    # Use the actual import worker and admission path, with unchanged puzzle rules.
                    identity_before = page.evaluate(ROWS)
                    replacement = json.loads(json.dumps(twelve))
                    replacement['id'] = 'retained-identity-replacement'
                    replacement['title'] = 'Replacement identity study'
                    replacement['puzzles'] = [json.loads(json.dumps(mine))]
                    replacement['puzzles'][0]['title'] = 'Changed definition under a retained identity'
                    choose_pack(page, replacement)
                    expect(page.locator('#toasts')).to_contain_text('A saved puzzle already uses this ID and revision', timeout=45000)
                    expect(page.locator('#dialog[open]')).to_have_count(0)
                    assert page.evaluate(ROWS) == identity_before, 'identity refusal preserves all stored rows'
                    assert page.evaluate(CATALOGUE) == pre_removal
                    page.locator('#toasts').screenshot(path=str(OUT / f'saved-identity-refused-{width}.png'))
                    (OUT / f'saved-identity-refused-{width}.aria.txt').write_text(page.locator('#toasts').aria_snapshot(), encoding='utf-8')
                    checks.append({'width': width, 'case': 'retained-identity-changed-definition-refused'})

                    choose_pack(page, twelve)
                    expect(page.locator('#dialog[open]')).to_contain_text(f"{len(twelve['puzzles'])} verified puzzles", timeout=45000)
                    page.get_by_role('button', name='Keep browsing', exact=True).click()
                    assert page.evaluate(CATALOGUE)['customPacks'] == pre_removal['customPacks'] + 1
                    page.get_by_role('button', name=f"Remove {twelve['title']}", exact=True).click()
                    confirm.get_by_role('button', name='Remove pack', exact=True).click()
                    expect(page.locator('.pack-row', has_text=twelve['title'])).to_have_count(0)
                    assert page.evaluate(CATALOGUE) == pre_removal
                    assert page.evaluate(RUNS) == runs_kept
                    checks.append({'width': width, 'case': 'pack-removal-confirmed-runs-kept-readded'})

                    replacement['puzzles'][0]['revision'] += 1
                    choose_pack(page, replacement)
                    expect(page.locator('#dialog[open]')).to_contain_text('1 verified puzzle', timeout=45000)
                    page.get_by_role('button', name='Keep browsing', exact=True).click()
                    assert page.evaluate(CATALOGUE)['customPacks'] == pre_removal['customPacks'] + 1
                    assert page.evaluate(RUNS) == runs_kept, 'a new revision preserves the old pinned run'
                    page.get_by_role('button', name=f"Remove {replacement['title']}", exact=True).click()
                    confirm.get_by_role('button', name='Remove pack', exact=True).click()
                    expect(page.locator('.pack-row', has_text=replacement['title'])).to_have_count(0)
                    assert page.evaluate(ROWS) == identity_before
                    checks.append({'width': width, 'case': 'retained-identity-new-revision-accepted'})

                    # Duplicate checks must use the current database in the write
                    # transaction, not the stale tab's original empty catalogue.
                    page.goto(URL + '/#/workshop')
                    page.wait_for_function('()=>AlibiDiagnostics.getStatus().pendingSaves===0')
                    before = page.evaluate(ROWS)
                    # Saved-run broadcasts legitimately update the other tab's
                    # record count. Only its pack catalogue must remain stale.
                    status_dialog = open_current_adder(stale)
                    expect(status_dialog.locator('[data-pack-status="lattice"]')).to_contain_text('Pack ID present')
                    status_dialog.get_by_role('button', name='Close', exact=True).click()
                    context.set_offline(True)
                    status_dialog = open_current_adder(stale)
                    expect(status_dialog.locator('[data-pack-status="afterlight"]')).to_contain_text('Pack ID present')
                    status_dialog.get_by_role('button', name='Close', exact=True).click()
                    context.set_offline(False)
                    stale_catalogue = stale.evaluate(CATALOGUE)
                    assert stale_catalogue == {'puzzles': base['puzzles'], 'customPacks': base['customPacks']}, stale_catalogue
                    duplicate = json.loads(json.dumps(afterlight))
                    duplicate['title'] = 'Stale replacement must never be written'
                    choose_pack(stale, duplicate)
                    expect(stale.locator('#toasts')).to_contain_text('already installed', timeout=45000)
                    expect(stale.locator('#dialog[open]')).to_have_count(0)
                    assert stale.evaluate(CATALOGUE) == stale_catalogue
                    assert page.evaluate(ROWS) == before, 'stale pack ID preserves complete stored rows'
                    checks.append({'width': width, 'case': 'two-tabs-stale-pack-id-refused'})

                    duplicate['id'] = 'stale-overlapping-pack'
                    choose_pack(stale, duplicate)
                    expect(stale.locator('#toasts')).to_contain_text('puzzle ID', timeout=45000)
                    expect(stale.locator('#dialog[open]')).to_have_count(0)
                    assert page.evaluate(ROWS) == before, 'overlapping puzzle IDs preserve complete stored rows'
                    checks.append({'width': width, 'case': 'two-tabs-stale-puzzle-id-refused'})

                    # An unrelated valid pack remains admissible from that same stale
                    # tab. Reload reads all committed packs, with prior runs unchanged.
                    distinct = json.loads(json.dumps(afterlight))
                    distinct['id'] = 'independent-tab-pack'
                    distinct['title'] = 'Independent tab study'
                    distinct['puzzles'] = [distinct['puzzles'][0]]
                    distinct['puzzles'][0]['id'] = 'independent-tab-picture'
                    choose_pack(stale, distinct)
                    expect(stale.locator('#dialog[open]')).to_contain_text('1 verified puzzle', timeout=45000)
                    stale.get_by_role('button', name='Keep browsing', exact=True).click()
                    after = page.evaluate(ROWS)
                    assert after['runs'] == before['runs'] and after['meta'] == before['meta']
                    assert all(row in after['packs'] for row in before['packs'])
                    assert len(after['packs']) == len(before['packs']) + 1
                    context.set_offline(True)
                    stale.reload()
                    stale.wait_for_function('()=>globalThis.AlibiDiagnostics?.getStatus().mode==="indexeddb"')
                    assert stale.evaluate('AlibiDiagnostics.getCounts().customPacks') == 3
                    assert stale.evaluate('AlibiDiagnostics.getCounts().puzzles') == base['puzzles'] + 35
                    context.set_offline(False)
                    stale.get_by_role('button', name='Puzzle packs', exact=True).click()
                    checks.append({'width': width, 'case': 'stale-tab-distinct-install-all-packs-offline-reload'})

                    # An unsupported record injected after the app loaded cannot be
                    # ignored to admit content into an unverified identity namespace.
                    stale.evaluate("""async()=>{
                        const db=await new Promise((ok,no)=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
                        try{await new Promise((ok,no)=>{const tx=db.transaction('packs','readwrite');
                            tx.objectStore('packs').add({key:'future-pack',value:{schemaVersion:99,opaque:'preserve exactly'}});
                            tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error)})}finally{db.close()}
                    }""")
                    before = stale.evaluate(ROWS)
                    status_dialog = open_current_adder(stale)
                    expect(status_dialog.locator('[data-pack-status="lattice"]')).to_have_text('Status unavailable.')
                    expect(status_dialog.get_by_role('button', name=f"Add {lattice['title']}", exact=True)).to_be_enabled()
                    status_dialog.get_by_role('button', name='Close', exact=True).click()
                    distinct['id'] = 'blocked-by-future-pack'
                    distinct['puzzles'][0]['id'] = 'blocked-by-future-picture'
                    choose_pack(stale, distinct)
                    expect(stale.locator('#toasts')).to_contain_text('stored pack', timeout=45000)
                    expect(stale.locator('#dialog[open]')).to_have_count(0)
                    assert stale.evaluate(ROWS) == before, 'unsupported stored pack and saves remain byte-identical'
                    checks.append({'width': width, 'case': 'unsupported-pack-preserved-admission-refused'})
                    assert not errors, errors
                except Exception as error:
                    failures.append({'width': width, 'error': str(error), 'traceback': traceback.format_exc()})
                    page.screenshot(path=str(OUT / f'failure-{width}.png'), full_page=True)
                finally:
                    context.close()
        finally:
            browser.close()
    if len(checks) != 32:
        failures.append({'coverage': len(checks), 'expected': 32})
    receipt = {'sourceHead': os.environ.get('EXPECTED_HEAD', 'local'), 'passed': not failures,
               'checks': checks, 'failures': failures,
               'scope': 'Built origin, service worker and IndexedDB; no physical device or screen reader.'}
    (OUT / 'receipt.json').write_text(json.dumps(receipt, indent=2))
    print(json.dumps(receipt, indent=2), flush=True)
    if failures:
        raise SystemExit(1)


if __name__ == '__main__':
    run()
