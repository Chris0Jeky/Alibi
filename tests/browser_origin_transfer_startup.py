"""Full-app recovery startup/export on disposable origins; no automatic restore claim."""
import json
import os
import time
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'test-results/origin-transfer-safety'
DOMAINS = ['alibi-device', 'alibi-afterhours-v1', 'alibi-quiet-wing-v1',
           'alibi-castle-v1', 'alibi-challenges-v1']
INSTRUMENT = """() => {
  window.domainOpens = []; window.domainWrites = [];
  const names = new Set(['alibi-device', 'alibi-afterhours-v1', 'alibi-quiet-wing-v1',
    'alibi-castle-v1', 'alibi-challenges-v1']);
  const open = indexedDB.open.bind(indexedDB);
  indexedDB.open = (name, ...args) => {
    if (names.has(name)) domainOpens.push(name);
    return open(name, ...args);
  };
  const transaction = IDBDatabase.prototype.transaction;
  IDBDatabase.prototype.transaction = function (stores, mode, ...args) {
    if (names.has(this.name) && mode === 'readwrite') domainWrites.push(this.name);
    return transaction.call(this, stores, mode, ...args);
  };
  for (const method of ['setItem', 'removeItem']) {
    const original = Storage.prototype[method];
    Storage.prototype[method] = function (key, ...args) {
      if ([...names].some(name => String(key).startsWith(name))) domainWrites.push(key);
      return original.call(this, key, ...args);
    };
  }
}"""
SEED = """async ({phase, pending, special}) => {
  const names = ['alibi-device', 'alibi-afterhours-v1', 'alibi-quiet-wing-v1',
    'alibi-castle-v1', 'alibi-challenges-v1'];
  const stores = ['runs', 'club', 'saves', 'records', 'runs'];
  const write = (name, store, value, key) => new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(store);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
  });
  for (let i = 0; i < names.length; i++)
    await write(names[i], stores[i], {side: i < phase ? 'imported' : 'original', domain: i}, 'sentinel');
  if (special === 'undefined') pending = undefined;
  if (special === 'map') pending = new Map([['private', 'retained raw map']]);
  await write('alibi-origin-recovery', 'copies', pending, 'pending');
}"""
READ_DOMAINS = """async () => {
  const names = ['alibi-device', 'alibi-afterhours-v1', 'alibi-quiet-wing-v1',
    'alibi-castle-v1', 'alibi-challenges-v1'];
  const result = [], existing = new Set((await indexedDB.databases()).map(row => row.name));
  for (const name of names) {
    if (!existing.has(name)) { result.push(null); continue; }
    result.push(await new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, stores = [...db.objectStoreNames], rows = {};
      if (!stores.length) { db.close(); resolve(rows); return; }
      const tx = db.transaction(stores, 'readonly');
      for (const store of stores) {
        const values = tx.objectStore(store).getAll();
        values.onsuccess = () => { rows[store] = values.result; };
      }
      tx.oncomplete = () => { db.close(); resolve(rows); };
      tx.onabort = () => { db.close(); reject(tx.error); };
    };
    }));
  }
  return result;
}"""


class PageServer(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def held(page):
    expect(page.get_by_role('heading', name='Save transfer needs attention')).to_be_visible()
    assert page.evaluate('typeof AlibiDiagnostics') == 'undefined'
    assert page.evaluate('domainOpens') == [], 'normal domain opens must wait for recovery'
    assert page.evaluate('domainWrites') == [], 'normal domain writes must wait for recovery'


def wait(page, expression, timeout=15):
    end = time.monotonic() + timeout
    while time.monotonic() < end:
        if page.evaluate(expression):
            return
        page.wait_for_timeout(50)
    raise AssertionError("Browser condition did not settle: " + expression)


def new_page(context, errors):
    page = context.new_page()
    page.on('pageerror', lambda error: errors.append(str(error)))
    return page


def main():
    RESULTS.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(PageServer, directory=ROOT / 'dist'))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}/'
    pending = {
        'cabinet': {'format': 'alibi-backup', 'schemaVersion': 1, 'runs': [], 'packs': []},
        'club': {'schema': 1, 'settings': {}, 'runs': {}, 'records': []},
        'quiet': {'kind': 'alibi-quiet-wing-backup', 'schema': 1, 'state': None},
        'castle': {'format': 'alibi-castle', 'version': 1, 'scope': 'fixture', 'state': None},
        'challenges': {'format': 'alibi-challenges', 'schema': 1, 'runs': []},
        'unknown': {'private-note': 'keep <script> & ☂ exactly as data'},
    }
    errors = []
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('ALIBI_CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['ALIBI_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            for width in (390, 1280):
                for phase in range(6):
                    context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
                    context.add_init_script('(' + INSTRUMENT + ')()')
                    page = new_page(context, errors)
                    page.goto(base + 'manifest.webmanifest')
                    page.evaluate(SEED, {'phase': phase, 'pending': pending, 'special': None})
                    before = page.evaluate(READ_DOMAINS)
                    page.goto(base + '#/quiet/castle/map')
                    held(page)
                    expect(page.locator('#origin-recovery-sections li')).to_have_count(5)
                    assert page.evaluate('document.activeElement.id') == 'main'
                    if phase == 3:
                        page.screenshot(path=str(RESULTS / f'startup-{width}.png'), full_page=True)
                        with page.expect_download() as event:
                            page.get_by_role('button', name='Download recovery copy').click()
                        exported = json.loads(Path(event.value.path()).read_text())
                        assert exported == {'format': 'alibi-origin-recovery-export', 'version': 1, 'pending': pending}
                        assert page.evaluate('AlibiOriginTransfer.inspectPendingRecovery().then(r => r.value)') == pending
                        page.evaluate("location.hash = '#/not-a-room'")
                        held(page)
                        page.wait_for_timeout(13000)  # Cross the independent boot watchdog's real deadline.
                        assert page.locator('#boot-recovery, #route-not-found').count() == 0
                        page.get_by_role('button', name='Retry opening').click()
                        page.wait_for_load_state('domcontentloaded')
                        held(page)
                    assert page.evaluate(READ_DOMAINS) == before
                    context.close()

            # Present undefined and non-JSON structured-clone copies remain held and retained.
            for special in ('undefined', 'map'):
                context = browser.new_context()
                context.add_init_script('(' + INSTRUMENT + ')()')
                page = new_page(context, errors)
                page.goto(base + 'manifest.webmanifest')
                page.evaluate(SEED, {'phase': 2, 'pending': None, 'special': special})
                page.goto(base)
                held(page)
                page.get_by_role('button', name='Download recovery copy').click()
                expect(page.locator('#origin-recovery-status')).to_contain_text('remains on this device')
                assert page.evaluate('AlibiOriginTransfer.inspectPendingRecovery().then(r => r.present)')
                if special == 'map':
                    assert page.evaluate('AlibiOriginTransfer.inspectPendingRecovery().then(r => r.value.get("private"))') == 'retained raw map'
                context.close()

            # A fresh origin starts normally and the noncreating probe leaves no recovery DB.
            context = browser.new_context()
            page = new_page(context, errors)
            page.goto(base)
            wait(page, '() => Boolean(window.AlibiDiagnostics)')
            assert 'alibi-origin-recovery' not in page.evaluate('indexedDB.databases().then(rows => rows.map(r => r.name))')
            wait(page, '() => Boolean(AlibiDiagnostics.getStatus().offlineReady)', timeout=45)
            page.reload(wait_until='domcontentloaded')
            wait(page, '() => Boolean(window.AlibiDiagnostics)')
            assert page.evaluate('() => Boolean(navigator.serviceWorker.controller)')
            page.goto(base + 'manifest.webmanifest')
            # Retain a copy without mutating the real, normally initialized domains.
            page.add_script_tag(content=(ROOT / 'src/origin-transfer.js').read_text())
            # readCastle legitimately aliases state and record.state when its loader is absent.
            # Exercise the actual read/retain path, then export its structured-clone alias offline.
            retained = page.evaluate('''async value => {
                const state = {revision: 1, note: 'retain both Castle views'};
                await new Promise((resolve, reject) => {
                    const request = indexedDB.open('alibi-castle-v1', 1);
                    request.onupgradeneeded = () => request.result.createObjectStore('records');
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => {
                        const db = request.result, tx = db.transaction('records', 'readwrite');
                        tx.objectStore('records').put({schema: 1, revision: 1, state}, 'chapter-one');
                        tx.oncomplete = () => { db.close(); resolve(); };
                        tx.onabort = () => { db.close(); reject(tx.error); };
                    };
                });
                const ports = AlibiOriginTransfer.createDevicePorts({});
                value.castle = await ports.read('castle');
                if (value.castle.state !== value.castle.record.state) throw Error('Castle alias missing');
                await ports.retain(value);
                return value;
            }''', pending)
            before = page.evaluate(READ_DOMAINS)
            context.add_init_script('(' + INSTRUMENT + ')()')
            context.set_offline(True)
            page.goto(base)
            held(page)
            assert page.evaluate(READ_DOMAINS) == before
            assert page.evaluate('AlibiOriginTransfer.inspectPendingRecovery().then(r => r.value.castle.state === r.value.castle.record.state)')
            with page.expect_download() as event:
                page.get_by_role('button', name='Download recovery copy').click()
            assert json.loads(Path(event.value.path()).read_text())['pending'] == retained
            context.close()

            context = browser.new_context()
            context.add_init_script('(' + INSTRUMENT + ')()')
            context.add_init_script("""const original = indexedDB.open.bind(indexedDB);
                indexedDB.open = (name, ...args) => {
                  if (name === 'alibi-origin-recovery') throw new DOMException('Denied', 'SecurityError');
                  return original(name, ...args);
                };""")
            page = new_page(context, errors)
            page.goto(base)
            held(page)
            expect(page.locator('#origin-recovery-summary')).to_contain_text('could not be checked')
            expect(page.get_by_role('button', name='Download recovery copy')).not_to_be_visible()
            context.close()

            context = browser.new_context()
            context.add_init_script('Object.defineProperty(window, "indexedDB", {value: undefined})')
            page = new_page(context, errors)
            page.goto(base)
            wait(page, '() => Boolean(window.AlibiDiagnostics)')
            assert page.evaluate('AlibiDiagnostics.storage') in ('local', 'session')
            context.close()
            assert errors == [], errors
            info = json.loads((ROOT / 'build-info.json').read_text())
            report = {
                'browser': browser.version, 'widths': [390, 1280],
                'interruptedBeforeOrAmongWrites': list(range(5)),
                'allCommittedBeforeCleanup': 5,
                'normalDomainWritersHeld': True, 'recoveryExportRoundTrip': True,
                'retainedUnknownValues': True, 'freshOriginStarts': True,
                'offlineRecoveryExport': True, 'unreadableRecoveryHeld': True,
                'aliasedCastleRecoveryExport': True,
                'unavailableIDBFallbackStarts': True,
                'automaticRestoreAccepted': False,
                'fiveDomainDestructiveImportAccepted': False, 'errors': errors,
                'build': info['build'], 'source': info['platformBuild'],
            }
            (RESULTS / 'startup-receipt.json').write_text(json.dumps(report, indent=2))
            print(json.dumps(report))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == '__main__':
    main()
