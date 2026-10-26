"""Ordinary transfer downloads and non-JSON preimage refusal on disposable real origins."""
import hashlib
import json
import os
from functools import partial
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import expect, sync_playwright
from browser_origin_transfer_startup import PageServer, wait

ROOT = Path(__file__).resolve().parents[1]
RESULTS = ROOT / 'test-results/origin-transfer-safety'
QUIET_KEY = 'alibi-quiet-wing-v1:fallback'
SEED = """async ({name, store, key, value, map}) => {
  if (map) value = new Map([['private', 'preserve the original Map']]);
  await new Promise((resolve, reject) => {
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
}"""
NO_RECOVERY = "indexedDB.databases().then(rows => !rows.some(row => row.name === 'alibi-origin-recovery'))"


class FixtureServer(PageServer):
    def copyfile(self, source, output):
        try:
            super().copyfile(source, output)
        except (BrokenPipeError, ConnectionResetError):
            pass  # Disposable profiles can close while their service worker is caching assets.


def settings(page, base):
    page.goto(base + '#/settings')
    wait(page, '() => Boolean(window.AlibiDiagnostics)')
    expect(page.get_by_role('button', name='Download save transfer', exact=True)).to_be_visible()


def download(page):
    with page.expect_download() as event:
        page.get_by_role('button', name='Download save transfer', exact=True).click()
    envelope = json.loads(Path(event.value.path()).read_text())
    assert envelope['format'] == 'alibi-origin-transfer' and envelope['version'] == 1
    assert hashlib.sha256(envelope['payload'].encode()).hexdigest() == envelope['checksum']
    payload = json.loads(envelope['payload'])
    assert set(payload) == {'cabinet', 'club', 'quiet', 'castle', 'challenges'}
    assert set(payload['quiet']) == {'kind', 'schema', 'state'}
    return payload


def main():
    RESULTS.mkdir(parents=True, exist_ok=True)
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(FixtureServer, directory=ROOT / 'dist'))
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f'http://127.0.0.1:{server.server_port}/'
    errors = []
    quiet = {'revision': 1, 'unknown': {'private': 'fallback JSON retained ☂'}}
    castle = {'revision': 1, 'notes': {'private': 'Castle JSON retained ☂'}}
    raw_fallback = '  ' + json.dumps(quiet, ensure_ascii=False) + '\n'
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('ALIBI_CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['ALIBI_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            for width in (390, 1280):
                context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                settings(page, base)
                healthy = download(page)
                assert page.evaluate(NO_RECOVERY)

                # Seed JSON data through real fallback/IDB storage while normal writers are absent.
                page.goto(base + 'manifest.webmanifest')
                page.evaluate('([key, value]) => localStorage.setItem(key, value)', [QUIET_KEY, raw_fallback])
                page.evaluate(SEED, {'name': 'alibi-castle-v1', 'store': 'records',
                                     'key': 'chapter-one', 'value': {'schema': 1, 'revision': 1, 'state': castle}, 'map': False})
                settings(page, base)
                exported = download(page)
                assert exported['quiet']['state'] == quiet
                assert exported['castle']['state'] == castle
                assert exported['castle']['record']['state'] == castle
                assert page.evaluate('key => localStorage.getItem(key)', QUIET_KEY) == raw_fallback
                assert page.evaluate(NO_RECOVERY)

                # A real structured-clone Map must not silently become {} in an ordinary download.
                page.goto(base + 'manifest.webmanifest')
                page.evaluate(SEED, {'name': 'alibi-quiet-wing-v1', 'store': 'saves',
                                     'key': 'state', 'value': None, 'map': True})
                settings(page, base)
                refused_downloads = []
                page.on('download', lambda event: refused_downloads.append(event.suggested_filename))
                page.get_by_role('button', name='Download save transfer', exact=True).click()
                expect(page.get_by_text('These saves contain values a JSON transfer cannot preserve.', exact=False)).to_be_visible()
                assert refused_downloads == []

                # Cabinet/Club are synthetic ports; Quiet/Castle/Challenge reads and retention are real.
                # A confirmed API attempt must refuse before admitting recovery or writing any domain.
                outcome = page.evaluate('''async clean => {
                    let retains = 0, writes = 0, releases = 0;
                    const ports = AlibiOriginTransfer.createDevicePorts({
                        readCabinet: async () => clean.cabinet,
                        readClub: async () => clean.club,
                        writeCabinet: async () => {}, writeClub: async () => {}
                    });
                    const retain = ports.retain, write = ports.write, release = ports.release;
                    ports.retain = async value => { retains++; return retain(value); };
                    ports.write = async (...args) => { writes++; return write(...args); };
                    ports.release = async () => { releases++; return release(); };
                    let message = '';
                    try { await AlibiOriginTransfer.applyOriginTransfer({payload: clean}, ports, {confirmed: true}); }
                    catch (error) { message = error.message; }
                    const original = await ports.read('quiet');
                    return {message, retains, writes, releases, retained: original.state.get('private')};
                }''', healthy)
                assert 'JSON recovery copy cannot preserve' in outcome['message'], outcome
                assert 'Existing saves were not changed.' in outcome['message'], outcome
                assert {key: outcome[key] for key in ('retains', 'writes', 'releases')} == {'retains': 0, 'writes': 0, 'releases': 0}
                assert outcome['retained'] == 'preserve the original Map'
                assert page.evaluate(NO_RECOVERY)
                assert page.evaluate('key => localStorage.getItem(key)', QUIET_KEY) == raw_fallback
                context.close()
            assert errors == [], errors
            info = json.loads((ROOT / 'build-info.json').read_text())
            receipt = {
                'browser': browser.version, 'widths': [390, 1280],
                'actualOrdinaryDownloads': ['fresh', 'fallback-and-Castle'],
                'unknownJsonValuesPreserved': True, 'fallbackBytesUnchanged': True,
                'nonJsonDownloadRefused': True, 'preimageRetainWriteReleaseCounts': [0, 0, 0],
                'structuredCloneMapRetained': True, 'fiveDomainDestructiveImportAccepted': False,
                'errors': errors, 'build': info['build'], 'source': info['platformBuild'],
            }
            (RESULTS / 'json-preflight-receipt.json').write_text(json.dumps(receipt, indent=2))
            print(json.dumps(receipt))
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == '__main__':
    main()
