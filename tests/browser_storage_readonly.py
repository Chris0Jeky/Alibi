"""Native fallback policy and emitted-app error/export controls on disposable origins.

--source-only is a narrower local probe, never emitted-app acceptance.
"""
import argparse
import hashlib
import json
import os
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'storage-readonly'
PREFIX = 'alibi.v1.runs.'
FIXTURE = b'''<!doctype html><meta charset="utf-8"><title>Synthetic storage fixture</title>
<script src="/__source__/core.js"></script><script src="/__source__/engines.js"></script>
<script src="/__source__/storage.js"></script><body>Source-library fixture.</body>'''


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/__fixture__':
            data = FIXTURE
        elif self.path in ('/__source__/core.js', '/__source__/engines.js', '/__source__/storage.js'):
            data = (ROOT / 'src' / self.path.rsplit('/', 1)[1]).read_bytes()
        else:
            return super().do_GET()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html' if self.path == '/__fixture__' else 'text/javascript')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_):
        pass


def record(key, note='old', rev=1):
    return {'key': key, 'note': note, 'rev': rev, 'schemaVersion': 1,
            'state': {'placements': {}}}


def begin(page, value, expected):
    page.evaluate('''({value,expected}) => {
      window.result = null;
      store.saveRun(value,expected).then(
        value => window.result={ok:true,value},
        error => window.result={ok:false,name:error.name,message:error.message});
    }''', {'value': value, 'expected': expected})


def result(page):
    page.wait_for_function('() => window.result !== null')
    return page.evaluate('window.result')


def native_policy(browser, base, width, report):
    context = browser.new_context(viewport={'width': width, 'height': 900})
    context.add_init_script("Object.defineProperty(globalThis,'indexedDB',{value:undefined})")
    try:
        a, b = context.new_page(), context.new_page()
        for page in (a, b):
            page.set_default_timeout(10000)
            page.goto(base + '/__fixture__')
            assert page.evaluate('async () => {window.store=await new AlibiStorage.Store().init();return store.mode}') == 'local'
        for index in range(20):
            key = f'race-{index}@1'
            raw = json.dumps(record(key)) if index % 2 else None
            if raw is not None:
                a.evaluate('({key,raw})=>localStorage.setItem(key,raw)', {'key': PREFIX + key, 'raw': raw})
                b.wait_for_function('(key)=>localStorage.getItem(key)!==null', arg=PREFIX + key)
            begin(a, record(key, 'A'), 1 if raw else 0)
            begin(b, record(key, 'B'), 1 if raw else 0)
            outcomes = [result(a), result(b)]
            assert all(not r['ok'] and 'read-only' in r['message'] for r in outcomes), outcomes
            for page in (a, b):
                assert page.evaluate('(key)=>localStorage.getItem(key)', PREFIX + key) == raw
            report['cases'].append({'width': width, 'case': f'both local writes refused {index}'})
        b.evaluate("Object.defineProperty(navigator,'locks',{value:undefined})")
        begin(b, record('no-lock@1'), 0)
        assert 'read-only' in result(b)['message']
        report['cases'].append({'width': width, 'case': 'policy is independent of Web Locks'})
        unknown = ['', '{bad', 'null', json.dumps({**record('future@2'), 'schemaVersion': 2})]
        for index, raw in enumerate(unknown):
            key = f'unknown-{index}@1'
            a.evaluate('({key,raw})=>localStorage.setItem(key,raw)', {'key': PREFIX + key, 'raw': raw})
            begin(a, record(key), 0)
            assert not result(a)['ok']
            assert a.evaluate('(key)=>localStorage.getItem(key)', PREFIX + key) == raw
        backup = a.evaluate('async()=>await store.export()')
        assert len(backup['runs']) == 12
        assert sorted(backup['damaged']['runs']) == ['unknown-0@1', 'unknown-1@1']
        report['cases'].append({'width': width, 'case': 'unknown records preserved and export remains available'})
        protected = a.evaluate('''async()=>{
          try {await store.put('runs','bypass@1',{rev:1});return false;}
          catch(error){return /read-only/.test(error.message) && localStorage.getItem('alibi.v1.runs.bypass@1')===null;}
        }''')
        assert protected
        report['cases'].append({'width': width, 'case': 'generic put cannot bypass protection'})
        session = b.evaluate('''async()=>{
          Object.defineProperty(globalThis,'localStorage',{get(){throw Error('denied')}});
          const session=await new AlibiStorage.Store().init();
          const input={key:'session@1',schemaVersion:1,rev:0};
          const outcomes=await Promise.allSettled([session.saveRun(input,0),session.saveRun(input,0)]);
          return {mode:session.mode,results:outcomes.map(r=>r.status==='fulfilled'?'saved':r.reason.name),
            records:(await session.export()).runs.length};
        }''')
        assert session == {'mode': 'session', 'results': ['saved', 'ConflictError'], 'records': 1}
        report['cases'].append({'width': width, 'case': 'denied storage retains ephemeral session CAS'})
    finally:
        context.close()
    context = browser.new_context(viewport={'width': width, 'height': 900})
    try:
        a, b = context.new_page(), context.new_page()
        for page in (a, b):
            page.goto(base + '/__fixture__')
            assert page.evaluate('async()=>{window.store=await new AlibiStorage.Store().init();return store.mode}') == 'indexeddb'
        for index in range(10):
            key = f'idb-{index}@1'
            begin(a, record(key, 'A', 0), 0)
            begin(b, record(key, 'B', 0), 0)
            outcomes = [result(a), result(b)]
            assert sum(r['ok'] for r in outcomes) == 1, outcomes
            assert next(r for r in outcomes if not r['ok'])['name'] == 'ConflictError'
            saved = a.evaluate('async key=>await store.get("runs",key)', key)
            assert saved == next(r['value'] for r in outcomes if r['ok'])
        report['cases'].append({'width': width, 'case': 'ten native IndexedDB one-winner controls'})
    finally:
        context.close()


def app_recovery(browser, base, width, report):
    context = browser.new_context(viewport={'width': width, 'height': 900},
                                  accept_downloads=True, reduced_motion='reduce', service_workers='block')
    context.add_init_script("Object.defineProperty(globalThis,'indexedDB',{value:undefined})")
    try:
        page = context.new_page()
        page.set_default_timeout(12000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(base + '/__fixture__')
        puzzle = next(p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'sudoku')
        original = page.evaluate('''p=>{
          const run={schemaVersion:1,key:p.id+'@'+p.revision,rev:7,puzzle:p,
            state:AlibiCore.registry[p.type].initial(p),undo:[],redo:[],moves:0,hints:0,elapsed:0,
            completedAt:null,firstCompletedAt:null,updatedAt:'2026-01-01T00:00:00.000Z',note:'synthetic prior note'};
          const raw=JSON.stringify(run);
          localStorage.setItem('alibi.v1.runs.'+run.key,raw);
          localStorage.setItem('alibi.v1.meta.preferences',JSON.stringify({seen:['sudoku']}));
          return raw;
        }''', puzzle)
        key = puzzle['id'] + '@' + str(puzzle['revision'])
        page.goto(base + '/#/play/' + key)
        page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()?.rev===7')
        assert page.evaluate('AlibiDiagnostics.storage') == 'local'
        assert page.evaluate('AlibiDiagnostics.getCurrent().note') == 'synthetic prior note'
        blank = puzzle['givens'].index(0)
        page.locator(f'[data-action="cell"][data-cell="{blank}"]').click()
        page.locator(f'[data-action="value"][data-value="{puzzle["solution"][blank]}"]').click()
        page.wait_for_function('()=>AlibiDiagnostics.getStatus().saveError.includes("read-only")')
        assert 'Not saved' in page.locator('#save-state').inner_text()
        edited = page.evaluate('AlibiDiagnostics.getCurrent()')
        assert edited['moves'] == 1 and edited['rev'] == 7
        assert page.evaluate('(key)=>localStorage.getItem(key)', PREFIX + key) == original
        page.locator('#main [data-action="undo"]').click()
        assert page.evaluate('AlibiDiagnostics.getCurrent().state') == edited['state']
        with page.expect_download() as pending:
            page.locator('.banner.warn [data-action="export"]').first.click()
        download = pending.value
        target = OUT / f'synthetic-export-{width}.json'
        download.save_as(target)
        exported = json.loads(target.read_text())
        run = next(r for r in exported['runs'] if r['key'] == key)
        assert run['state'] == edited['state'] and run['note'] == edited['note']
        assert run['moves'] == 1 and run['rev'] == 7
        assert page.evaluate('(key)=>localStorage.getItem(key)', PREFIX + key) == original
        page.screenshot(path=str(OUT / f'readonly-{width}.png'), full_page=True)
        page.reload()
        page.wait_for_function('()=>window.AlibiDiagnostics?.getCurrent()?.rev===7')
        assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == 0
        assert page.evaluate('AlibiDiagnostics.getCurrent().note') == 'synthetic prior note'
        assert page.evaluate('(key)=>localStorage.getItem(key)', PREFIX + key) == original
        assert not errors, errors
        report['cases'].append({'width': width, 'case': 'emitted app retains failed edit in export; reload keeps durable original'})
    finally:
        context.close()


def run(source_only=False):
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'scope': 'native source storage' if source_only else 'native source storage and emitted app',
              'cases': [], 'sourceSha256': {name: hashlib.sha256((ROOT / 'src' / name).read_bytes()).hexdigest()
                                           for name in ('core.js', 'storage.js', 'app.js')}}
    server = ThreadingHTTPServer(('127.0.0.1', 0), partial(Handler, directory=str(ROOT / 'dist')))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        if not source_only:
            report['identity'] = json.loads((ROOT / 'build-info.json').read_text())['platformBuild']
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
                base = f'http://127.0.0.1:{server.server_port}'
                for width in (390, 1280):
                    native_policy(browser, base, width, report)
                    if not source_only:
                        app_recovery(browser, base, width, report)
            finally:
                browser.close()
        assert len(report['cases']) == (50 if source_only else 52), report['cases']
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
    parser = argparse.ArgumentParser()
    parser.add_argument('--source-only', action='store_true')
    raise SystemExit(run(parser.parse_args().source_only))
