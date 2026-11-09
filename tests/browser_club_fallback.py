"""Real-browser Club open failures, session export and local fallback."""
import json
import os
from pathlib import Path
import socket
import subprocess
import time
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
KEY = 'alibi-afterhours-v1'
DATA = {'schema':1,'settings':{'zen':False,'assist':'off','pinned':None},'visit':37,'lastHero':-1,'runs':{},'records':[],'stamps':[]}
RAW = json.dumps({'rev':7,'data':DATA},separators=(',',':'))

def main():
    server = None
    url = os.environ.get('ALIBI_URL')
    if not url:
        sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close()
        server=subprocess.Popen(['node','tools/serve.cjs'],cwd=ROOT,env={**os.environ,'PORT':str(port)},stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        url=f'http://127.0.0.1:{port}/'
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1',port),timeout=.1): break
            except OSError: time.sleep(.05)
        else: raise RuntimeError('server did not start')
    try:
      with sync_playwright() as pw:
        args={'headless':True,'args':['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):args['executable_path']=os.environ['CHROMIUM_PATH']
        browser=pw.chromium.launch(**args)
        for failure,mode in [('UnknownError','session'),('SecurityError','local')]:
            context=browser.new_context(viewport={'width':390,'height':900},accept_downloads=True,service_workers='block')
            context.add_init_script('''(() => {const raw=RAW;localStorage.setItem('alibi-afterhours-v1',raw);const original=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,...args){if(name==='alibi-afterhours-v1')throw new DOMException('simulated open failure',NAME);return original.call(this,name,...args)}})()'''.replace('RAW',json.dumps(RAW)).replace('NAME',json.dumps(failure)))
            page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(url+'#/club');page.wait_for_function('() => window.AlibiClub?.diagnostics().storageMode === MODE'.replace('MODE',json.dumps(mode)))
            info=page.evaluate('() => AlibiClub.diagnostics()')
            if mode=='session':
                assert info['state']['visit']==1
                expect(page.locator('.club-warning')).to_contain_text('temporary')
                assert page.evaluate("() => localStorage.getItem('alibi-afterhours-v1')")==RAW
                with page.expect_download() as download: page.locator('.club-warning').get_by_role('button',name='Export Club save').click()
                exported=json.loads(Path(download.value.path()).read_text());assert exported['visit']==1
                page.evaluate('() => AlibiClub.save()');page.evaluate('() => AlibiClub.flush()')
                assert page.evaluate("() => localStorage.getItem('alibi-afterhours-v1')")==RAW
            else:
                assert info['state']['visit']==38
                assert json.loads(page.evaluate("() => localStorage.getItem('alibi-afterhours-v1')"))['rev']==8
            assert not errors,errors
            context.close()
        browser.close()
      print('Club fallback browser scenarios passed: unknown failure and security unavailability')
    finally:
      if server:server.terminate();server.wait(timeout=5)

if __name__=='__main__':main()
