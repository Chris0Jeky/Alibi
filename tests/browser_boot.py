"""Exercise recovery with a missing main script, preserving actual browser storage."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/').rstrip('/')+'/'
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844})
 page=ctx.new_page();page.goto(BASE+'manifest.webmanifest')
 page.evaluate("""async()=>{localStorage.setItem('boot-proof','keep'); await caches.open('unrelated-test');await caches.open('alibi-shell-test');await new Promise((resolve,reject)=>{const r=indexedDB.open('alibi-device',1);r.onupgradeneeded=()=>{for(const n of ['runs','packs','meta'])r.result.createObjectStore(n,{keyPath:'key'});};r.onsuccess=()=>{const db=r.result,tx=db.transaction('meta','readwrite');tx.objectStore('meta').put({key:'boot-proof',value:'keep'});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});}""")
 page.route('**/assets/alibi.*.js',lambda r:r.abort())
 page.goto(BASE);page.locator('#boot-recovery').wait_for(timeout=16000)
 assert page.get_by_role('button',name='Retry opening').is_visible()
 page.unroute('**/assets/alibi.*.js')
 page.get_by_role('button',name='Refresh app files').click()
 page.wait_for_function('() => !!globalThis.AlibiDiagnostics')
 assert page.evaluate("localStorage.getItem('boot-proof')")=='keep'
 assert page.evaluate("() => caches.has('unrelated-test')")
 assert not page.evaluate("() => caches.has('alibi-shell-test')")
 assert page.evaluate("""()=>new Promise(resolve=>{const r=indexedDB.open('alibi-device',1);r.onsuccess=()=>{const db=r.result,q=db.transaction('meta').objectStore('meta').get('boot-proof');q.onsuccess=()=>{resolve(q.result.value);db.close();};};})""")=='keep'
 browser.close()
out=Path(__file__).resolve().parents[1]/'test-results'/'browser-boot';out.mkdir(parents=True,exist_ok=True)
(out/'results.json').write_text(json.dumps({'passed':True,'checks':6,'url':BASE,'scope':'Blocked main JS; recovery retains IndexedDB, localStorage and unrelated cache; disposable Chromium profile'}))
print('PASS 6 startup recovery checks',flush=True)
