"""Built-origin challenge controls with delayed real IndexedDB and worker completions.
The probe wraps existing APIs only in the test page. It does not replace validation,
engines or storage. Browser emulation does not prove physical-device acceptance.
"""
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(os.environ.get('ALIBI_EVIDENCE', str(ROOT / 'test-results/challenge-ownership')))
OUT.mkdir(parents=True, exist_ok=True)
A, B = 'curated-classic-hanoi-01', 'curated-classic-sliding-01'
PROBE = r'''(() => {
  const p = globalThis.ownershipProbe = {reads:[],validations:[],restores:[],mounts:[],writes:0};
  const hold = (list,value) => new Promise(resolve=>list.push(()=>resolve(value)));
  const watch = (key,wrap) => {
    let current;
    Object.defineProperty(globalThis,key,{configurable:true,get:()=>current,set:value=>{current=wrap(value);}});
  };
  watch('AlibiChallengeStore',api=>{
    const create=api.create;
    api.create=(...args)=>{
      const store=create(...args), read=store.read, restore=store.restore;
      p.store=store;
      store.read=async(...args)=>{const value=await read(...args);return p.holdReads?hold(p.reads,value):value;};
      store.restore=async(...args)=>{p.writes++;const value=await restore(...args);return p.holdRestores?hold(p.restores,value):value;};
      return store;
    };
    return api;
  });
  watch('AlibiValidateImport',validate=>async(...args)=>{
    const value=await validate(...args);return p.holdValidation?hold(p.validations,value):value;
  });
  watch('AlibiChallengeLauncher',api=>{
    const mount=api.mount;
    api.mount=(...args)=>{
      const handle=mount(...args), dispose=handle.dispose;
      handle.dispose=()=>{handle.wasDisposed=true;return dispose();};
      p.current=handle;p.mounts.push(handle);
      return handle;
    };
    return api;
  });
})();'''

class Handler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
threading.Thread(target=server.serve_forever, daemon=True).start()
base = os.environ.get('ALIBI_URL', f'http://127.0.0.1:{server.server_port}')
results = []
try:
    with sync_playwright() as p:
        launch = {}
        executable = os.environ.get('ALIBI_CHROMIUM')
        if executable or Path('/usr/bin/chromium').exists():
            launch['executable_path'] = executable or '/usr/bin/chromium'
        browser = p.chromium.launch(**launch)
        for width in (390,1280):
            context = browser.new_context(viewport={'width':width,'height':900})
            context.add_init_script(PROBE)
            page = context.new_page()
            errors, downloads = [], []
            page.on('pageerror',lambda error:errors.append(str(error)))
            page.on('download',lambda download:downloads.append(download.suggested_filename))
            page.goto(base+'/#/quiet/challenges/'+A)
            page.locator('.challenge-status').wait_for(timeout=30000)
            assert page.evaluate('ownershipProbe.store.info().mode') == 'indexeddb'

            def route(id):
                page.evaluate("id=>location.hash='/quiet/challenges/'+id", id)
                page.wait_for_function('(id)=>location.hash.endsWith(id)', arg=id)
                page.locator('#challenge-export').wait_for()
                page.wait_for_function('(id)=>ownershipProbe.holdReads || (ownershipProbe.current?.save().challengeId===id && !ownershipProbe.current.wasDisposed)',arg=id)

            # Export B during its pending read may not export the old A handle.
            page.evaluate('ownershipProbe.holdReads=true;ownershipProbe.old=ownershipProbe.current')
            route(B)
            page.wait_for_function('ownershipProbe.reads.length===1')
            page.locator('#challenge-export').click()
            page.get_by_text('Finish opening this challenge before exporting it.',exact=True).wait_for()
            assert page.evaluate('ownershipProbe.old.wasDisposed') is True
            assert not downloads, downloads
            results.append({'width':width,'case':'export-cannot-use-previous-handle'})

            # Hold A/B/A reads and complete only the newest A first.
            for id,n in ((A,2),(B,3),(A,4)):
                route(id)
                page.wait_for_function('(n)=>ownershipProbe.reads.length===n',arg=n)
            page.evaluate('ownershipProbe.reads[3]()')
            page.locator('.challenge-status').wait_for()
            page.evaluate('ownershipProbe.kept=ownershipProbe.current;ownershipProbe.count=ownershipProbe.mounts.length')
            page.evaluate('ownershipProbe.reads.slice(0,3).forEach(release=>release())')
            page.evaluate('async()=>{for(let i=0;i<20;i++)await Promise.resolve();}')
            assert page.evaluate('ownershipProbe.current===ownershipProbe.kept && ownershipProbe.mounts.length===ownershipProbe.count')
            results.append({'width':width,'case':'same-id-return-rejects-old-loads'})

            # Validate real files in the real worker, delaying only successful replies.
            page.evaluate('ownershipProbe.holdReads=false;ownershipProbe.holdValidation=true')
            run_a = page.evaluate('JSON.stringify(ownershipProbe.current.save())')
            page.locator('#challenge-file').set_input_files({'name':'A.json','mimeType':'application/json','buffer':run_a.encode()})
            page.wait_for_function('ownershipProbe.validations.length===1')
            route(B)
            page.locator('.challenge-status').wait_for()
            run_b = page.evaluate('JSON.stringify(ownershipProbe.current.save())')
            page.locator('#challenge-file').set_input_files({'name':'B.json','mimeType':'application/json','buffer':run_b.encode()})
            page.wait_for_function('ownershipProbe.validations.length===2')
            page.evaluate('ownershipProbe.validations[0]()')
            page.evaluate('async()=>{for(let i=0;i<20;i++)await Promise.resolve();}')
            assert page.evaluate('ownershipProbe.writes') == 0
            assert page.locator('#challenge-file').evaluate('input=>input.files[0]?.name') == 'B.json'
            page.evaluate('ownershipProbe.validations[1]()')
            page.get_by_text('Challenge save restored. The previous save remains available for export.',exact=True).wait_for()
            assert page.evaluate('ownershipProbe.writes') == 1
            results.append({'width':width,'case':'stale-validation-never-writes-or-clears-new-input'})

            # A real admitted restore can finish, but cannot replace a later view.
            page.evaluate('ownershipProbe.holdValidation=false;ownershipProbe.holdRestores=true')
            route(A)
            page.locator('.challenge-status').wait_for()
            page.locator('#challenge-file').set_input_files({'name':'A.json','mimeType':'application/json','buffer':run_a.encode()})
            page.wait_for_function('ownershipProbe.restores.length===1')
            route(B)
            page.locator('.challenge-status').wait_for()
            page.evaluate('ownershipProbe.kept=ownershipProbe.current;ownershipProbe.count=ownershipProbe.mounts.length;ownershipProbe.restores[0]()')
            page.evaluate('async()=>{for(let i=0;i<20;i++)await Promise.resolve();}')
            assert page.evaluate('ownershipProbe.current===ownershipProbe.kept && !ownershipProbe.current.wasDisposed && ownershipProbe.mounts.length===ownershipProbe.count')
            assert page.evaluate('ownershipProbe.writes') == 2
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
            results.append({'width':width,'case':'admitted-restore-cannot-replace-new-view'})
            page.screenshot(path=str(OUT/f'challenge-{width}.png'),full_page=True)
            assert not errors, errors
            context.close()
        browser.close()
    (OUT/'results.json').write_text(json.dumps({'mode':'built-origin-real-storage-and-worker-with-controlled-completion','physicalDevice':False,'scenarios':results},indent=2)+'\n')
    print(f'{len(results)} built-origin challenge ownership scenarios passed',flush=True)
finally:
    server.shutdown()
