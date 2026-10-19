"""Real two-tab recovery-port admission; synthetic domain ports, no player import."""
import json
import os
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright
from browser_origin_transfer_open import FixturePage

ROOT = Path(__file__).resolve().parents[1]
READ = """() => new Promise((resolve, reject) => {
    const request = indexedDB.open('alibi-origin-recovery', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('copies', 'readonly');
        const value = tx.objectStore('copies').get('pending');
        tx.oncomplete = () => { db.close(); resolve(value.result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    };
})"""
COUNT = """() => new Promise((resolve, reject) => {
    const request = indexedDB.open('alibi-origin-recovery', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('copies', 'readonly');
        const count = tx.objectStore('copies').count('pending');
        tx.oncomplete = () => { db.close(); resolve(count.result); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    };
})"""
SEED = """value => new Promise((resolve, reject) => {
    const request = indexedDB.open('alibi-origin-recovery', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('copies', 'readwrite');
        tx.objectStore('copies').put(value, 'pending');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    };
})"""


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
            left, right = context.new_page(), context.new_page()
            source = (ROOT / 'src/origin-transfer.js').read_text()
            for page in (left, right):
                page.goto(f'http://127.0.0.1:{server.server_port}/')
                page.add_script_tag(content=source)
                page.evaluate("window.ports = AlibiOriginTransfer.createDevicePorts({})")
            original = {'cabinet': {'note': 'original recovery ☂'}, 'revision': 7}
            left.evaluate('value => ports.retain(value)', original)
            assert left.evaluate(READ) == original
            refused = right.evaluate("""async () => {
                const guarded = AlibiOriginTransfer.createDevicePorts({});
                let writes = 0, releases = 0;
                guarded.read = async () => ({current: true});
                guarded.write = async () => { writes++; };
                guarded.release = async () => { releases++; };
                let rejected = false;
                try {
                    await AlibiOriginTransfer.applyOriginTransfer({payload: {}}, guarded, {confirmed: true});
                } catch { rejected = true; }
                return {rejected, writes, releases};
            }""")
            assert refused == {'rejected': True, 'writes': 0, 'releases': 0}, refused
            assert left.evaluate(READ) == original
            left.evaluate('() => ports.release()')
            right.evaluate("() => ports.retain({owner: 'next successful admission'})")
            assert right.evaluate(READ) == {'owner': 'next successful admission'}
            right.evaluate('() => ports.release()')

            # Seed arbitrary existing values directly; admission must use key
            # presence. Explicit fixture release resets each disposable case.
            for pending in (None, '', False, 0, {'unknown': 'future recovery format'}):
                left.evaluate(SEED, pending)
                rejected = right.evaluate("""async () => {
                    try { await ports.retain({replacement: true}); return false; }
                    catch { return true; }
                }""")
                assert rejected, pending
                saved = left.evaluate(READ)
                assert type(saved) is type(pending) and saved == pending, (pending, saved)
                left.evaluate('() => ports.release()')

            # Arm both tabs before one broadcast starts their real IDB requests.
            for page, label in ((left, 'left'), (right, 'right')):
                page.evaluate("""label => {
                    window.outcome = null;
                    window.gate = new BroadcastChannel('recovery-admission-go');
                    gate.onmessage = () => ports.retain({owner: label}).then(
                        () => outcome = {status: 'fulfilled', label},
                        () => outcome = {status: 'rejected', label});
                }""", label)
            left.evaluate("""() => {
                const sender = new BroadcastChannel('recovery-admission-go');
                sender.postMessage('go'); sender.close();
            }""")
            for page in (left, right):
                page.wait_for_function('outcome !== null')
            outcomes = [left.evaluate('outcome'), right.evaluate('outcome')]
            winners = [item for item in outcomes if item['status'] == 'fulfilled']
            assert len(winners) == 1, outcomes
            assert left.evaluate(READ) == {'owner': winners[0]['label']}
            for page in (left, right):
                page.evaluate('gate.close()')
            (left if winners[0]['label'] == 'left' else right).evaluate('() => ports.release()')

            aborted = left.evaluate("""async () => {
                const original = IDBDatabase.prototype.transaction;
                IDBDatabase.prototype.transaction = function(...args) {
                    const tx = original.apply(this, args);
                    if (args[0] === 'copies' && args[1] === 'readwrite')
                        queueMicrotask(() => tx.abort());
                    return tx;
                };
                try {
                    await ports.retain({mustNotCommit: true}); return false;
                } catch { return true; }
                finally { IDBDatabase.prototype.transaction = original; }
            }""")
            assert aborted
            assert left.evaluate(COUNT) == 0
            print(json.dumps({'evidence': 'standalone-two-tab-recovery-port-fixture',
                              'browser': browser.version, 'firstRetention': True,
                              'pendingRefusedBeforeDomainWrites': True, 'originalSnapshotPreserved': True,
                              'presentFalsyAndUnknownControls': 5, 'concurrentAdmissions': 1,
                              'releasePermitsNextAdmission': True, 'abortedRetentionAdmitted': False,
                              'domainPorts': 'synthetic counters', 'playerImportAccepted': False}))
            context.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == '__main__':
    main()
