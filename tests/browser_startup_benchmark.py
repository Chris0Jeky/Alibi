"""Fresh-profile built-origin startup with synthetic, validated IndexedDB runs; no timing gate.

Run `npm run build:web`, start `npm start`, then execute this script with the
repository Playwright environment. Every trial uses a disposable browser profile.
"""
from __future__ import annotations

import hashlib
import json
import os
import platform
import subprocess
import tempfile
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import urlopen

from browser_origin import BASE, ROOT, launch_profile
from playwright.sync_api import sync_playwright

OUT = ROOT / 'test-results' / 'startup-benchmark'
TRIALS = 3
INIT = """(() => {
  window.__startup = {readyMs: null, longTasks: []};
  const observer = new PerformanceObserver(list => {
    for (const e of list.getEntries()) window.__startup.longTasks.push({startMs:e.startTime,durationMs:e.duration});
  });
  observer.observe({type:'longtask', buffered:true});
  window.__startupObserver = observer;
  let diagnostics;
  Object.defineProperty(window, 'AlibiDiagnostics', {
    configurable: true, get: () => diagnostics,
    set: value => { diagnostics = value; window.__startup.readyMs = performance.now(); }
  });
})();"""


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT, text=True).strip()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


class StartupAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paths = []

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == 'script' and attrs.get('src'):
            self.paths.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'manifest') and attrs.get('href'):
            self.paths.append(attrs['href'])


def verify_served(files):
    # Independent HTTP preflight, outside the timed browser profiles.
    def fetch(path):
        url = urljoin(BASE, path)
        if not url.startswith(BASE) or urlparse(url).query or urlparse(url).fragment:
            raise RuntimeError(f'Unexpected startup asset URL: {url}')
        with urlopen(url, timeout=15) as response:
            if response.geturl() != url or response.status != 200:
                raise RuntimeError(f'Unexpected HTTP response for {url}')
            return response.read()

    html = fetch('index.html')
    if hashlib.sha256(html).hexdigest() != files['index.html']:
        raise RuntimeError('Served index differs from the built index')
    parser = StartupAssets()
    parser.feed(html.decode('utf-8'))
    paths = sorted(set(path.removeprefix('./') for path in parser.paths))
    if not any(path.startswith('assets/alibi-platform-identity.') for path in paths):
        raise RuntimeError('Built index lacks platform identity')
    verified = {'index.html': files['index.html']}
    for path in paths:
        if path not in files or hashlib.sha256(fetch(path)).hexdigest() != files[path]:
            raise RuntimeError(f'Served startup asset differs from build: {path}')
        verified[path] = files[path]
    return verified


def cpu_model():
    try:
        for line in Path('/proc/cpuinfo').read_text().splitlines():
            if line.startswith('model name'):
                return line.split(':', 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or 'unknown'


def make_fixture(depth):
    data = subprocess.check_output(['node', 'tools/startup-fixture.cjs', '100', str(depth)], cwd=ROOT)
    return json.loads(data)


def trial(pw, runs, depth, index, order, expected_build, expected_identity):
    with tempfile.TemporaryDirectory(prefix='alibi-startup-') as profile:
        context = launch_profile(pw, Path(profile))
        try:
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            # Manifest establishes the same origin without executing the application or installing its SW.
            page.goto(BASE + 'manifest.webmanifest', wait_until='load')
            seeded = page.evaluate("""runs => new Promise((resolve, reject) => {
              const req = indexedDB.open('alibi-device', 1);
              req.onupgradeneeded = () => {
                for (const name of ['runs','packs','meta']) req.result.createObjectStore(name,{keyPath:'key'});
              };
              req.onerror = () => reject(req.error);
              req.onsuccess = () => {
                const db = req.result, tx = db.transaction('runs','readwrite'), store = tx.objectStore('runs');
                for (const run of runs) store.put({key:run.key,value:run});
                tx.oncomplete = () => { db.close(); resolve(runs.length); };
                tx.onerror = () => reject(tx.error);
                tx.onabort = () => reject(tx.error || Error('seed aborted'));
              };
            })""", runs)
            assert seeded == len(runs)
            seeded_receipt = page.evaluate("""() => new Promise((resolve,reject) => {
              const req=indexedDB.open('alibi-device',1);
              req.onerror=()=>reject(req.error);
              req.onsuccess=()=>{
                const db=req.result, read=db.transaction('runs','readonly').objectStore('runs').getAll();
                read.onerror=()=>reject(read.error);
                read.onsuccess=()=>{const rows=read.result.map(r=>r.value); db.close();
                  resolve({count:rows.length, keys:rows.map(r=>r.key).sort(),
                    undoLengths:rows.map(r=>r.undo.length), redoLengths:rows.map(r=>r.redo.length)});};
              };
            })""")
            assert seeded_receipt['keys'] == sorted(r['key'] for r in runs)
            assert all(n == depth // 2 for n in seeded_receipt['undoLengths'])
            assert all(n == depth // 2 for n in seeded_receipt['redoLengths'])
            context.add_init_script(INIT)
            cdp = context.new_cdp_session(page)
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
            browser_version = cdp.send('Browser.getVersion')
            page.goto(BASE, wait_until='load', timeout=60000)
            page.wait_for_function('() => window.__startup?.readyMs !== null && !!window.AlibiDiagnostics', timeout=60000)
            # Let the observer deliver tasks that ended at readiness.
            page.wait_for_timeout(100)
            result = page.evaluate("""() => {
              const s=window.__startup;
              for (const e of window.__startupObserver.takeRecords()) s.longTasks.push({startMs:e.startTime,durationMs:e.duration});
              const nav=performance.getEntriesByType('navigation')[0];
              return {readyMs:s.readyMs, loadEventEndMs:nav.loadEventEnd,
                domContentLoadedMs:nav.domContentLoadedEventEnd,
                longTasks:s.longTasks.filter(e=>e.startMs < s.readyMs),
                counts:AlibiDiagnostics.getCounts(), storage:AlibiDiagnostics.storage,
                build:globalThis.ALIBI_CONFIG.build, version:globalThis.ALIBI_CONFIG.version,
                platformIdentity:AlibiPlatform.build,
                userAgent:navigator.userAgent};
            }""")
            assert result['build'] == expected_build['build'] and result['version'] == expected_build['version'], result
            assert result['platformIdentity'] == expected_identity, result
            assert result['storage'] == 'indexeddb', result
            assert result['counts']['records'] == len(runs), result
            assert result['counts']['quarantined'] == 0, result
            assert not errors, errors
            result.update({'trial': index, 'order': order, 'expectedRecords': len(runs),
                           'history': {'undo': depth // 2, 'redo': depth // 2},
                           'fixtureSha256': hashlib.sha256(json.dumps(runs, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
                           'fixtureJsonBytes': len(json.dumps(runs, separators=(',', ':')).encode()),
                           'cpuThrottlingRate': 1, 'browserVersion': browser_version,
                           'seededIndexedDB': seeded_receipt})
            return result
        finally:
            context.close()


def main():
    if BASE != 'http://127.0.0.1:8797/':
        raise RuntimeError('Benchmark only runs against its local built origin')
    OUT.mkdir(parents=True, exist_ok=True)
    identity = json.loads(subprocess.check_output(['node', '-e', "const p=require('./tools/platform-identity.cjs'); const d='dist'; const i=p.readIdentity(d).identity; if(i.payloadSha256!==p.payloadDigest(d)) throw Error('built payload mismatch'); console.log(JSON.stringify(i))"], cwd=ROOT))
    if identity['sourceSha'] != git('rev-parse', 'HEAD') or identity['sourceDirty'] or git('status', '--porcelain'):
        raise RuntimeError('Build and clean checkout must identify the same source commit')
    # Include actual output hashes independently of version labels.
    files = {str(p.relative_to(ROOT / 'dist')): digest(p) for p in sorted((ROOT / 'dist').rglob('*')) if p.is_file()}
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'sourceCommit': git('rev-parse', 'HEAD'),
              'sourceTree': git('rev-parse', 'HEAD^{tree}'), 'sourceStatus': git('status', '--porcelain'),
              'githubHeadSha': os.environ.get('GITHUB_HEAD_SHA'), 'githubRunId': os.environ.get('GITHUB_RUN_ID'),
              'buildInfo': json.loads((ROOT / 'build-info.json').read_text()),
              'platformIdentity': identity,
              'builtFileSha256': files, 'os': platform.platform(), 'machine': platform.machine(),
              'cpuModel': cpu_model(), 'logicalCpus': os.cpu_count(), 'python': platform.python_version(),
              'node': subprocess.check_output(['node', '--version'], text=True).strip(),
              'origin': BASE, 'trialsPerCase': TRIALS,
              'method': 'Fresh-profile app navigation after a manifest origin visit and seeded real IndexedDB; startup assets checked by HTTP before trials, warming the server and OS caches. No service worker before navigation; no CPU throttling. Sudoku and Futoshiki saves only. Ready is diagnostics assignment after run validation and route load. Long tasks starting before ready.',
              'trials': [], 'passed': False}
    output = OUT / 'startup-benchmark.json'
    try:
        report['verifiedServedStartupSha256'] = verify_served(files)
        with sync_playwright() as pw:
            fixtures = {depth: make_fixture(depth) for depth in (0, 40)}
            cases = [(0, 0), (50, 0), (100, 0), (50, 40), (100, 40)]
            # Rotate case order each round; preserve the actual sequence in every row.
            for i in range(1, TRIALS + 1):
                offset = ((i - 1) * 2) % len(cases)
                ordered = cases[offset:] + cases[:offset]
                for position, (count, depth) in enumerate(ordered, start=1):
                    row = trial(pw, fixtures[depth][:count], depth, i, position, report['buildInfo'], identity)
                    report['trials'].append(row)
                    print(f'{count} runs, history {depth}, trial {i}: ready {row["readyMs"]:.1f} ms', flush=True)
                    output.write_text(json.dumps(report, indent=2), encoding='utf-8')
            report['passed'] = True
    except Exception as exc:
        report['failure'] = f'{type(exc).__name__}: {exc}'
        raise
    finally:
        output.write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
