"""Real IndexedDB and cross-tab regressions for pack-removal follow-ups."""
import json
import os
from pathlib import Path
import socket
import subprocess
import time
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
PACK = json.loads((ROOT / 'content/workshop/afterlight-pictures.json').read_text())

def main():
    server = None
    base = os.environ.get('ALIBI_URL')
    if not base:
        sock = socket.socket(); sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]; sock.close()
        server = subprocess.Popen(['node', 'tools/serve.cjs'], cwd=ROOT, env={**os.environ, 'PORT':str(port)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        base = f'http://127.0.0.1:{port}/'
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=.1): break
            except OSError: time.sleep(.05)
        else: raise RuntimeError('server failed')
    try:
      with sync_playwright() as pw:
        launch={'headless':True,'args':['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'): launch['executable_path']=os.environ['CHROMIUM_PATH']
        browser=pw.chromium.launch(**launch)
        context=browser.new_context(viewport={'width':390,'height':900}, service_workers='block')
        errors=[]
        def open_page():
            page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(base+'#/workshop');page.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"')
            page.get_by_role('button',name='Puzzle packs',exact=True).click();return page
        a=open_page()
        def put(page, key, value):
            page.evaluate('''async ([key,value]) => {const db=await new Promise((ok,no)=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});await new Promise((ok,no)=>{const tx=db.transaction('packs','readwrite');tx.objectStore('packs').put({key,value});tx.oncomplete=ok;tx.onabort=()=>no(tx.error)});db.close()}''',[key,value])
        def rows(page):
            return page.evaluate('''async()=>{const db=await new Promise(ok=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result)});return await new Promise(ok=>{const q=db.transaction('packs').objectStore('packs').getAll();q.onsuccess=()=>{db.close();ok(q.result)}})}''')
        put(a, PACK['id'], PACK);a.reload();a.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"');a.get_by_role('button',name='Puzzle packs',exact=True).click()
        b=open_page()
        expect(b.get_by_role('button',name='Remove '+PACK['title'])).to_be_visible()
        b.get_by_role('button',name='Scene maker',exact=True).click()
        b.locator('#draft-seed').fill('7');b.locator('#scene-form button[type=submit]').click()
        b.locator('[data-action="add-draft"]:enabled').wait_for(timeout=30000)
        b.locator('#clue-kind').select_option('row');b.locator('#clue-kind').focus()
        b.evaluate("() => window.testFocusedClue = document.querySelector('#clue-kind')")
        a.get_by_role('button',name='Remove '+PACK['title']).click();a.get_by_role('button',name='Remove pack',exact=True).click()
        b.wait_for_function('() => AlibiDiagnostics.getCounts().customPacks === 0')
        assert b.evaluate("() => document.querySelector('#clue-kind') === window.testFocusedClue && document.activeElement === window.testFocusedClue && window.testFocusedClue.value === 'row'")
        b.get_by_role('button',name='Puzzle packs',exact=True).click()
        expect(b.get_by_role('button',name='Remove '+PACK['title'])).to_have_count(0,timeout=10000)
        assert rows(a)==[]
        # A real import in one tab becomes visible in the other without a reload.
        a.locator('#pack-input').set_input_files({'name':'pack.json','mimeType':'application/json','buffer':json.dumps(PACK).encode()})
        expect(a.get_by_role('button',name='Keep browsing',exact=True)).to_be_visible(timeout=45000)
        b.wait_for_function('() => AlibiDiagnostics.getCounts().customPacks === 1')
        expect(b.get_by_role('button',name='Remove '+PACK['title'])).to_be_visible()
        a.get_by_role('button',name='Keep browsing',exact=True).click()
        # A delayed removal notice must not hide a newer replacement under the same key.
        put(a, PACK['id'], PACK);b.reload();b.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"');b.get_by_role('button',name='Puzzle packs',exact=True).click()
        replacement={**PACK,'title':'Replacement collection'};put(a,PACK['id'],replacement)
        b.get_by_role('button',name='Settings',exact=True).first.click()
        with b.expect_download() as download: b.get_by_role('button',name='Export backup',exact=True).click()
        backup=json.loads(Path(download.value.path()).read_text())
        assert backup['packs'][0]['title']=='Replacement collection'
        saved_backup = json.dumps(backup).encode()
        b.locator('#backup-input').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':saved_backup})
        b.get_by_role('button',name='Replace device data',exact=True).click()
        with b.expect_navigation(wait_until='domcontentloaded'):
            b.get_by_role('button',name='Replace with backup',exact=True).click()
        b.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"')
        assert rows(a)[0]['value']['title']=='Replacement collection'
        a.reload();a.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"');a.get_by_role('button',name='Puzzle packs',exact=True).click()
        put(a,PACK['id'],PACK)
        b.goto(base+'#/workshop');b.get_by_role('button',name='Puzzle packs',exact=True).click()
        put(a,PACK['id'],replacement)
        a.evaluate("id => {const c=new BroadcastChannel('alibi-saves');c.postMessage({type:'pack-removed',id});setTimeout(()=>c.close(),50)}",PACK['id'])
        expect(b.get_by_role('button',name='Remove Replacement collection')).to_be_visible()
        assert rows(a)[0]['value']['title']=='Replacement collection'
        # Change the pack while another tab's initial getAll is completing.
        put(a,PACK['id'],PACK)
        race=context.new_page()
        race.add_init_script('''(() => { const replacement=REPLACEMENT; const native=IDBObjectStore.prototype.getAll; let done=false; IDBObjectStore.prototype.getAll=function(...args) {const req=native.apply(this,args); if(this.name==='packs' && !done){done=true;const db=this.transaction.db;req.addEventListener('success',()=>{const tx=db.transaction('packs','readwrite');tx.objectStore('packs').put({key:replacement.id,value:replacement});tx.oncomplete=()=>{const channel=new BroadcastChannel('alibi-saves');channel.postMessage({type:'pack-added',id:replacement.id});setTimeout(()=>channel.close(),100)}})}return req}})()'''.replace('REPLACEMENT',json.dumps(replacement)))
        race.goto(base+'#/workshop');race.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"')
        race.get_by_role('button',name='Puzzle packs',exact=True).click()
        expect(race.get_by_role('button',name='Remove Replacement collection')).to_be_visible(timeout=10000)
        race.close()
        # A mismatched key is quarantined at startup and its exact raw row is preserved.
        corrupt={**PACK,'id':'mismatch-value'};put(a,PACK['id'],corrupt)
        a.reload();a.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"');a.get_by_role('button',name='Puzzle packs',exact=True).click()
        assert a.evaluate('AlibiDiagnostics.getCounts().quarantined')==1
        expect(a.get_by_role('button',name='Remove '+corrupt['title'])).to_have_count(0)
        assert rows(a)==[{'key':PACK['id'],'value':corrupt}]
        with a.expect_download() as download: a.get_by_role('button',name='Export raw backup',exact=True).click()
        backup=json.loads(Path(download.value.path()).read_text())
        assert backup['packs']==[] and backup['damaged']['packRows']==[{'key':PACK['id'],'value':corrupt}]
        a.locator('#backup-input').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':saved_backup})
        a.get_by_role('button',name='Replace device data',exact=True).click()
        a.get_by_role('button',name='Replace with backup',exact=True).click()
        expect(a.locator('#toasts')).to_contain_text('manual recovery')
        assert rows(a)==[{'key':PACK['id'],'value':corrupt}]
        # The same rejected module import has honest online and offline descriptions.
        context.route('**/assets/workshop/add.*.js',lambda route: route.abort())
        a.get_by_role('button',name='Add a curated collection',exact=True).click()
        expect(a.locator('#toasts')).to_contain_text('Collection tools could not load')
        offline=open_page();context.set_offline(True)
        offline.get_by_role('button',name='Add a curated collection',exact=True).click()
        expect(offline.locator('#toasts')).to_contain_text('Collection tools need a connection')
        context.set_offline(False)
        assert not errors, errors
        context.close()
        # A removal confirmation must retain the definition the player reviewed.
        context=browser.new_context(viewport={'width':390,'height':900}, service_workers='block')
        first=open_page();put(first,PACK['id'],PACK)
        first.reload();first.wait_for_function('() => window.AlibiDiagnostics?.getStatus().mode === "indexeddb"');first.get_by_role('button',name='Puzzle packs',exact=True).click()
        second=open_page()
        first.get_by_role('button',name='Remove '+PACK['title']).click()
        second.get_by_role('button',name='Remove '+PACK['title']).click();second.get_by_role('button',name='Remove pack',exact=True).click()
        newpack={**PACK,'title':'Reinstalled replacement'}
        second.locator('#pack-input').set_input_files({'name':'pack.json','mimeType':'application/json','buffer':json.dumps(newpack).encode()})
        expect(second.get_by_role('button',name='Keep browsing',exact=True)).to_be_visible(timeout=45000)
        expect(first.locator('.pack-row',has_text='Reinstalled replacement')).to_have_count(1,timeout=10000)
        first.get_by_role('button',name='Remove pack',exact=True).click()
        expect(first.locator('#toasts')).to_contain_text('changed in another tab')
        assert rows(first)[0]['value']['title']=='Reinstalled replacement'
        # Reverse cross-sender notices after replacing A with B, sharing puzzle IDs.
        nextpack={**newpack,'id':'another-pack','title':'New collection B'}
        second.evaluate('''async ([oldId,next])=>{const db=await new Promise(ok=>{const r=indexedDB.open('alibi-device');r.onsuccess=()=>ok(r.result)});await new Promise((ok,no)=>{const tx=db.transaction('packs','readwrite'),s=tx.objectStore('packs');s.delete(oldId);s.put({key:next.id,value:next});tx.oncomplete=ok;tx.onabort=()=>no(tx.error)});db.close()}''',[PACK['id'],nextpack])
        second.evaluate('''([a,b])=>{const x=new BroadcastChannel('alibi-saves'),y=new BroadcastChannel('alibi-saves');x.postMessage({type:'pack-added',id:b});y.postMessage({type:'pack-removed',id:a});setTimeout(()=>{x.close();y.close()},100)}''',[PACK['id'],nextpack['id']])
        expect(first.get_by_role('button',name='Remove New collection B')).to_be_visible(timeout=10000)
        expect(first.get_by_role('button',name='Remove Reinstalled replacement')).to_have_count(0)
        assert rows(first)[0]['value']['id']=='another-pack'
        assert not errors, errors
        context.close();browser.close()
      print('Pack follow-ups: two tabs, replacement, quarantined raw row and import failures passed')
    finally:
      if server: server.terminate();server.wait(timeout=5)

if __name__=='__main__':main()
