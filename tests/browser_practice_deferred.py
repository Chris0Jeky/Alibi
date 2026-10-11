"""Emitted practice adapter and native IndexedDB across deferred delivery states.

A disposable local origin, not a physical-device or deployed-service test.
"""
import hashlib
import json
import os
import subprocess
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'practice-deferred'
FIXTURE = b'''<!doctype html><title>Synthetic practice seed</title>
<script src="/__source__/core.js"></script><script src="/__source__/engines.js"></script>'''


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__seed__':
            data, mime = FIXTURE, 'text/html'
        elif self.path in ('/__source__/core.js', '/__source__/engines.js'):
            data = (ROOT / 'src' / self.path.rsplit('/', 1)[1]).read_bytes()
            mime = 'text/javascript'
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass


def snapshot(page):
    value = page.evaluate('()=>AlibiDiagnostics.getPracticeSnapshot()')
    assert value['available'], value
    assert value['rooms']['observatory']['completed'] == 1, value['rooms']['observatory']
    assert len(value['rooms']) == 13
    return value['rooms']['observatory']


def stored(page, key):
    return page.evaluate('''key=>new Promise((resolve,reject)=>{
      const request=indexedDB.open('alibi-device',1);
      request.onerror=()=>reject(request.error);
      request.onsuccess=()=>{
        const db=request.result,tx=db.transaction('runs'),read=tx.objectStore('runs').get(key);
        let result;
        read.onsuccess=()=>result=read.result;
        tx.oncomplete=()=>{db.close();resolve(result);};
        tx.onabort=()=>{db.close();reject(tx.error);};
      };
    })''', key)


def scenario(browser, base, width, puzzle, report):
    context = browser.new_context(viewport={'width': width, 'height': 900},
                                  service_workers='block', reduced_motion='reduce')
    held = []
    pattern = '**/official-deferred.*.js'
    context.route(pattern, lambda route: held.append(route))
    try:
        page = context.new_page()
        page.set_default_timeout(15000)
        page.goto(base + '/__seed__')
        original = page.evaluate('''async puzzle=>{
          const value={schemaVersion:1,key:puzzle.id+'@'+puzzle.revision,rev:4,puzzle,
            state:AlibiCore.registry[puzzle.type].initial(puzzle),undo:[],redo:[],moves:0,
            hints:0,elapsed:0,completedAt:null,firstCompletedAt:'2026-09-01T10:00:00.000Z',
            updatedAt:'2026-09-01T10:00:00.000Z',note:'synthetic historical completion'};
          await new Promise((resolve,reject)=>{
            const request=indexedDB.open('alibi-device',1);
            request.onupgradeneeded=()=>{
              for(const name of ['runs','packs','meta'])request.result.createObjectStore(name,{keyPath:'key'});
            };
            request.onerror=()=>reject(request.error);
            request.onsuccess=()=>{
              const db=request.result,tx=db.transaction('runs','readwrite');
              tx.objectStore('runs').put({key:value.key,value});
              tx.oncomplete=()=>{db.close();resolve();};
              tx.onabort=()=>{db.close();reject(tx.error);};
            };
          });
          return {key:value.key,value};
        }''', puzzle)
        page.goto(base + '/#/home', wait_until='domcontentloaded')
        page.wait_for_function('()=>!!globalThis.AlibiDiagnostics?.getPracticeSnapshot')
        page.evaluate('''()=>{
          window.definitionResult=null;
          ALIBI_DEFERRED.ensure().then(()=>window.definitionResult='loaded',
            error=>window.definitionResult=error.message);
        }''')
        page.wait_for_function('()=>Array.from(document.scripts).some(s=>s.src.includes("official-deferred."))')
        assert held, 'the real deferred script request must be pending'
        assert page.evaluate('ALIBI_DEFERRED.ready') is False
        pending = snapshot(page)
        assert stored(page, original['key']) == original
        report['cases'].append({'width': width, 'phase': 'pending', 'room': pending})
        for route in held:
            route.abort('failed')
        held.clear()
        page.wait_for_function('()=>typeof window.definitionResult==="string"')
        assert page.evaluate('definitionResult') == 'Puzzle definitions did not load.'
        assert page.evaluate('ALIBI_DEFERRED.ready') is False
        failed = snapshot(page)
        assert failed == pending
        assert stored(page, original['key']) == original
        report['cases'].append({'width': width, 'phase': 'failed', 'room': failed})
        context.unroute(pattern)
        page.evaluate('async()=>await ALIBI_DEFERRED.ensure()')
        assert page.evaluate('ALIBI_DEFERRED.ready') is True
        loaded = snapshot(page)
        assert loaded == pending
        assert stored(page, original['key']) == original
        report['cases'].append({'width': width, 'phase': 'loaded', 'room': loaded})
        # The same app-owned snapshot survives a new page after definitions load.
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('()=>!!globalThis.AlibiDiagnostics?.getPracticeSnapshot')
        page.evaluate('async()=>await ALIBI_DEFERRED.ensure()')
        assert snapshot(page) == pending
        assert stored(page, original['key']) == original
        report['cases'].append({'width': width, 'phase': 'reload', 'room': pending})
    finally:
        context.close()


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'scope': 'emitted app-owned adapter, native IndexedDB, real deferred request',
              'cases': [], 'sourceSha256': {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
                for p in ('src/castle-practice.js', 'src/app.js', 'tools/build.cjs',
                          'tools/build-android.cjs', 'tools/check-android-artifact.cjs')}}
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        report['identity'] = json.loads((ROOT / 'build-info.json').read_text())['platformBuild']
        puzzle = json.loads(subprocess.check_output([
            'node', '-e', "console.log(JSON.stringify(require('./tools/official-catalogue.cjs').load(process.cwd()).puzzles.find(p=>p.id==='vault-binary-01')))"
        ], cwd=ROOT, text=True))
        assert puzzle['type'] == 'binary' and puzzle['solution']
        with sync_playwright() as pw:
            options = {'headless': True, 'args': ['--no-sandbox']}
            executable = os.environ.get('CHROMIUM_PATH')
            if not executable and Path('/usr/bin/chromium').exists():
                executable = '/usr/bin/chromium'
            if executable:
                options['executable_path'] = executable
            browser = pw.chromium.launch(**options)
            try:
                report['browserVersion'] = browser.version
                for width in (390, 1280):
                    scenario(browser, f'http://127.0.0.1:{server.server_port}', width, puzzle, report)
            finally:
                browser.close()
        assert len(report['cases']) == 8
        report['passed'] = True
    except Exception as error:
        report['failure'] = f'{type(error).__name__}: {error}'
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=5)
        (OUT / 'results.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report, indent=2), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(run())
