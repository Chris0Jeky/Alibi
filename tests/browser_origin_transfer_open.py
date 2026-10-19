"""Two-tab callback regression; no app build or destructive player import.

Current recovery callers request schema 1. A test-only IndexedDB facade raises
that request to 2 so a retained version-1 connection can block its upgrade.
The production transfer module itself is loaded unchanged from src/.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class FixturePage(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b'<!doctype html><title>Disposable IndexedDB callback fixture</title>'
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def main():
    server = ThreadingHTTPServer(('127.0.0.1', 0), FixturePage)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as p:
            options = {'headless': True}
            if os.environ.get('ALIBI_CHROMIUM_EXECUTABLE'):
                options['executable_path'] = os.environ['ALIBI_CHROMIUM_EXECUTABLE']
            browser = p.chromium.launch(**options)
            context = browser.new_context()
            blocker, importer = context.new_page(), context.new_page()
            url = f'http://127.0.0.1:{server.server_port}/'
            blocker.goto(url)
            importer.goto(url)
            blocker.evaluate("""() => new Promise((resolve, reject) => {
                const request = indexedDB.open('alibi-origin-recovery', 1);
                request.onupgradeneeded = () => request.result.createObjectStore('sentinel');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => { window.blocker = request.result; resolve(); };
            })""")
            importer.evaluate("""() => {
                const actual = window.indexedDB;
                window.probe = {events: [], requestedVersion: null, outcome: null};
                Object.defineProperty(window, 'indexedDB', {value: {
                    open(name, version) {
                        probe.requestedVersion = version;
                        const request = actual.open(name, version + 1);
                        for (const type of ['blocked', 'upgradeneeded', 'success', 'error'])
                            request.addEventListener(type, () => probe.events.push(type));
                        return request;
                    }
                }});
            }""")
            importer.add_script_tag(content=(ROOT / 'src/origin-transfer.js').read_text())
            importer.evaluate("""() => {
                AlibiOriginTransfer.createDevicePorts({}).retain({original: 'fixture'})
                    .then(() => probe.outcome = 'resolved', error => probe.outcome = error.message);
            }""")
            importer.wait_for_function("probe.outcome && probe.events.includes('blocked')")
            blocked = importer.evaluate('probe')
            assert blocked['requestedVersion'] == 1, blocked
            assert 'Another tab is blocking storage' in blocked['outcome'], blocked
            blocker.evaluate('window.blocker.close()')
            importer.wait_for_function("probe.events.includes('error') || probe.events.includes('success')")
            outcome = importer.evaluate('probe')
            assert outcome['events'] == ['blocked', 'upgradeneeded', 'error'], outcome
            assert outcome['outcome'] == blocked['outcome'], outcome
            stores = blocker.evaluate("""() => new Promise((resolve, reject) => {
                const request = indexedDB.open('alibi-origin-recovery');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const db = request.result;
                    const result = {version: db.version, stores: [...db.objectStoreNames]};
                    db.close(); resolve(result);
                };
            })""")
            assert stores == {'version': 1, 'stores': ['sentinel']}, stores
            deleted = blocker.evaluate("""() => new Promise((resolve, reject) => {
                const request = indexedDB.deleteDatabase('alibi-origin-recovery');
                request.onblocked = () => resolve('blocked');
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve('deleted');
            })""")
            assert deleted == 'deleted', deleted
            print(json.dumps({'evidence': 'standalone-two-tab-idb-callback-fixture',
                              'browser': browser.version, 'versionSeam': 'requested 1 opened as 2',
                              'events': outcome['events'], 'rejectedBeforeUnblock': True,
                              'abandonedUpgradePreservedVersionAndStores': True,
                              'deleteUnblocked': True, 'playerImportAccepted': False}))
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == '__main__':
    main()
