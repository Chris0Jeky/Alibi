"""Click compiled Challenge recovery controls using synthetic real IndexedDB records."""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/challenge-recovery'
OUT.mkdir(parents=True, exist_ok=True)
ID = 'curated-classic-hanoi-01'

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = f'http://127.0.0.1:{server.server_port}'
results = []
try:
    with sync_playwright() as p:
        launch = {}
        executable = os.environ.get('ALIBI_CHROMIUM')
        if executable or Path('/usr/bin/chromium').exists():
            launch['executable_path'] = executable or '/usr/bin/chromium'
        browser = p.chromium.launch(**launch)
        for width in (390, 1280):
            for kind in ('valid', 'corrupt', 'future', 'foreign', 'falsy', 'oversized', 'nonjson'):
                context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
                page = context.new_page()
                errors, downloads = [], []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.on('download', lambda download: downloads.append(download.suggested_filename))
                page.on('dialog', lambda dialog: dialog.accept())
                page.goto(base + '/#/quiet/challenges/' + ID)
                page.locator('.challenge-status').wait_for(timeout=30000)
                good = page.evaluate('(id) => QWApp.challengeRegistry.begin(id)', ID)
                page.evaluate('''async ({id, kind}) => {
                  const run=QWApp.challengeRegistry.begin(kind==='foreign'?'curated-classic-hanoi-02':id);
                  run.log.push(kind==='corrupt'?{from:-1,to:0}:{from:1,to:2});
                  const record=kind==='falsy'?false:{schema:['valid','corrupt','foreign'].includes(kind)?1:2,revision:4,run,unknown:{text:'preserve 雨',flags:[false,null]}};
                  if(kind==='oversized')record.padding='x'.repeat(3*1024*1024);
                  if(kind==='nonjson')record.unknown.date=new Date(0);
                  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('alibi-challenges-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
                  await new Promise((resolve,reject)=>{const tx=db.transaction('runs','readwrite');tx.objectStore('runs').put(record,id);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error)});
                  db.close();
                }''', {'id': ID, 'kind': kind})
                page.reload()
                page.locator('.challenge-status').wait_for(timeout=30000)
                # The confirmation and input are the ordinary restore controls, not a patched store.
                page.locator('#challenge-file').set_input_files({'name': 'restore.json', 'mimeType': 'application/json', 'buffer': json.dumps(good).encode()})
                page.get_by_text('Challenge save restored. The previous save remains available for export.', exact=True).wait_for()
                page.locator('[data-action="peg"][data-value="1"]').click()
                page.locator('[data-action="peg"][data-value="2"]').click()
                page.evaluate('() => QWApp.challengeStore.flush()')
                before = page.evaluate('(id) => QWApp.challengeStore.read(id)', ID)
                assert len(before['log']) == 1
                raw = page.evaluate('''async id => {
                  const db=await new Promise(resolve=>{const r=indexedDB.open('alibi-challenges-v1',1);r.onsuccess=()=>resolve(r.result)});
                  const value=await new Promise(resolve=>{const r=db.transaction('runs').objectStore('runs').get('recovery:'+id);r.onsuccess=()=>resolve(r.result)});
                  db.close();return value;
                }''', ID) if kind not in ('oversized', 'nonjson') else None
                if kind in ('oversized', 'nonjson'):
                    page.locator('#challenge-recovery').click()
                    message = 'too large' if kind == 'oversized' else 'JSON cannot preserve'
                    page.get_by_text(message, exact=False).wait_for()
                    assert downloads == []
                    assert page.evaluate('''async id => {
                      const db=await new Promise(resolve=>{const r=indexedDB.open('alibi-challenges-v1',1);r.onsuccess=()=>resolve(r.result)});
                      const value=await new Promise(resolve=>{const r=db.transaction('runs').objectStore('runs').get('recovery:'+id);r.onsuccess=()=>resolve(r.result)});
                      db.close();return value.record.padding?.length===3*1024*1024||value.record.unknown.date instanceof Date;
                    }''', ID)
                else:
                    with page.expect_download() as caught:
                        page.locator('#challenge-recovery').click()
                    download = caught.value
                    target = OUT / f'{kind}-{width}.json'
                    download.save_as(target)
                    exported = json.loads(target.read_text(encoding='utf-8'))
                    if kind == 'valid':
                        assert download.suggested_filename == f'alibi-previous-{ID}.json'
                        assert exported == raw['record']['run']
                    else:
                        assert download.suggested_filename == f'alibi-raw-previous-{ID}.json'
                        assert exported['format'] == 'alibi-challenge-recovery'
                        assert exported['challengeId'] == ID and exported['recovery'] == raw
                        page.get_by_text('Raw recovery archive exported. It is not a playable challenge save.', exact=True).wait_for()
                        assert page.evaluate('''async text => {
                          try {await AlibiValidateImport({type:'challenge-run',text});return false}catch{return true}
                        }''', target.read_text(encoding='utf-8'))
                assert page.evaluate('(id) => QWApp.challengeStore.read(id)', ID) == before
                page.screenshot(path=str(OUT / f'{kind}-{width}.png'), full_page=True)
                page.reload()
                page.locator('.challenge-status').filter(has_text='1 move so far').wait_for(timeout=30000)
                assert page.evaluate('(id) => QWApp.challengeStore.read(id)', ID) == before
                assert not errors, errors
                results.append({'width': width, 'kind': kind, 'passed': True})
                print(json.dumps(results[-1]), flush=True)
                context.close()
        browser.close()
    (OUT / 'results.json').write_text(json.dumps({'physicalDevice': False, 'scenarios': results}, indent=2) + '\n')
finally:
    server.shutdown()
    server.server_close()
print(f'PASS {len(results)} actual Challenge recovery/restore/reload scenarios')
