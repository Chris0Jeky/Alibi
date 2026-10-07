"""Real localStorage/Web Locks concurrency using synthetic saves on a local origin.

Source-library integration, not emitted-app or physical-device acceptance.
"""
import hashlib
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'fallback-cas'
HTML = b'''<!doctype html><meta charset="utf-8"><title>Alibi storage fixture</title>
<script>Object.defineProperty(globalThis,'indexedDB',{value:undefined});</script>
<script src="/core.js"></script><script src="/storage.js"></script>
<body>Source-library storage fixture, not the Alibi application.</body>'''


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            content, mime = HTML, 'text/html; charset=utf-8'
        elif self.path in ('/core.js', '/storage.js'):
            content = (ROOT / 'src' / self.path[1:]).read_bytes()
            mime = 'text/javascript; charset=utf-8'
        else:
            self.send_error(404)
            return
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, *_):
        pass


def hold(page, key):
    page.evaluate('''key => {
      window.held = false;
      window.lease = navigator.locks.request('alibi.v1.runs.' + key, () =>
        new Promise(resolve => { window.release = resolve; window.held = true; }));
    }''', key)
    page.wait_for_function('() => window.held')


def start(page, key, note, expected=0):
    page.evaluate('''({key,note,expected}) => {
      window.outcome = null;
      window.record = {key, note, rev: expected, schemaVersion: 1};
      store.saveRun(record, expected).then(
        value => window.outcome = {ok:true,value},
        error => window.outcome = {ok:false,name:error.name,message:error.message});
    }''', {'key': key, 'note': note, 'expected': expected})


def outcome(page):
    page.wait_for_function('() => window.outcome !== null', timeout=20000)
    return page.evaluate('window.outcome')


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'scope': 'source Store; native cross-page Web Locks and localStorage',
              'cases': [], 'sourceSha256': {name: hashlib.sha256((ROOT / 'src' / name).read_bytes()).hexdigest()
                                           for name in ('core.js', 'storage.js')}}
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as pw:
            options = {'headless': True, 'args': ['--no-sandbox']}
            executable = os.environ.get('CHROMIUM_PATH')
            if not executable and Path('/usr/bin/chromium').exists():
                executable = '/usr/bin/chromium'
            if executable:
                options['executable_path'] = executable
            browser = pw.chromium.launch(**options)
            try:
                for width in (390, 1280):
                    context = browser.new_context(viewport={'width': width, 'height': 900})
                    try:
                        a, b = context.new_page(), context.new_page()
                        for page in (a, b):
                            page.goto(f'http://127.0.0.1:{server.server_port}/')
                            assert page.evaluate('async () => { window.store = await new AlibiStorage.Store().init(); return store.mode; }') == 'local'
                        for index in range(20):
                            key = f'race-{index}@1'
                            hold(a, key)
                            if index == 0:
                                other = b.evaluate("async () => (await store.saveRun({key:'independent@1', rev:0, schemaVersion:1},0)).rev")
                                assert other == 1
                                report['cases'].append({'width': width, 'case': 'independent key while other key is held'})
                            start(a, key, 'A')
                            start(b, key, 'B')
                            a.wait_for_function('''async key => (await navigator.locks.query()).pending
                              .filter(lock => lock.name === 'alibi.v1.runs.' + key).length === 2''', arg=key, timeout=3000)
                            assert a.evaluate('(key) => localStorage.getItem("alibi.v1.runs."+key)', key) is None
                            a.evaluate('window.release()')
                            results = [outcome(a), outcome(b)]
                            assert sum(result['ok'] for result in results) == 1, results
                            assert next(result for result in results if not result['ok'])['name'] == 'ConflictError'
                            saved = a.evaluate('(key) => JSON.parse(localStorage.getItem("alibi.v1.runs."+key))', key)
                            assert saved == next(result['value'] for result in results if result['ok'])
                            assert saved['rev'] == 1
                            report['cases'].append({'width': width, 'case': f'two-page one-winner {index}'})
                        key = 'captured@1'
                        hold(a, key)
                        start(b, key, 'captured')
                        b.evaluate("() => { record.key='changed@1'; record.note='changed'; }")
                        a.evaluate('window.release()')
                        result = outcome(b)
                        assert result['ok'] and result['value']['key'] == key and result['value']['note'] == 'captured'
                        report['cases'].append({'width': width, 'case': 'queued caller mutation cannot retarget save'})
                        if width == 390:
                            key = 'deadline@1'
                            hold(a, key)
                            started = time.monotonic()
                            start(b, key, 'must not write')
                            result = outcome(b)
                            assert not result['ok'] and 'timed out' in result['message']
                            a.evaluate('window.release()')
                            a.wait_for_function('async () => (await navigator.locks.query()).pending.length === 0')
                            assert b.evaluate('(key) => localStorage.getItem("alibi.v1.runs."+key)', key) is None
                            report['cases'].append({'width': width, 'case': 'real deadline cancels queued write',
                                                    'elapsedSeconds': round(time.monotonic() - started, 3)})
                        b.evaluate("Object.defineProperty(navigator,'locks',{value:undefined})")
                        start(b, 'race-0@1', 'must not replace', 1)
                        result = outcome(b)
                        assert not result['ok'] and 'safely save' in result['message']
                        assert b.evaluate("async () => (await store.export()).runs.find(r=>r.key==='race-0@1').rev") == 1
                        report['cases'].append({'width': width, 'case': 'no-lock refusal preserves export'})
                        result = b.evaluate('''async () => {
                          Object.defineProperty(globalThis,'localStorage',{get(){throw Error('denied')}});
                          const session=await new AlibiStorage.Store().init();
                          const run={key:'session@1',schemaVersion:1,rev:0};
                          const results=await Promise.allSettled([session.saveRun(run,0),session.saveRun(run,0)]);
                          return {mode:session.mode,results:results.map(r=>r.status==='fulfilled'?'saved':r.reason.name)};
                        }''')
                        assert result == {'mode': 'session', 'results': ['saved', 'ConflictError']}
                        report['cases'].append({'width': width, 'case': 'denied storage retains synchronous session CAS'})
                    finally:
                        context.close()
            finally:
                browser.close()
        assert len(report['cases']) == 49, 'All native browser cases must finish'
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
