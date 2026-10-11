"""Real emitted-worker navigation in isolated phone/desktop Chromium contexts.

This is local-origin browser evidence, not hosted or physical-device acceptance.
"""
import hashlib
import json
import os
import subprocess
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'offline-navigation'


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'scope': 'emitted build; real local-origin service worker',
              'cases': [], 'pageErrors': []}
    server = None
    try:
        build = json.loads((ROOT / 'build-info.json').read_text(encoding='utf-8'))
        report['build'] = build['build']
        report['platformBuild'] = build['platformBuild']
        report['workerSha256'] = hashlib.sha256((ROOT / 'dist/sw.js').read_bytes()).hexdigest()
        server = subprocess.Popen([
            'node', '-e',
            "const h=require('node:http'),p=require('node:path');"
            "const s=h.createServer(require('./tools/serve.cjs').createHandler(p.resolve('dist')));"
            "s.listen(0,'127.0.0.1',()=>console.log(s.address().port));"
        ], cwd=ROOT, stdout=subprocess.PIPE, text=True)
        port = int(server.stdout.readline().strip())
        base = f'http://127.0.0.1:{port}/'
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
                    context = browser.new_context(viewport={'width': width, 'height': 900},
                                                  service_workers='allow', reduced_motion='reduce')
                    try:
                        page = context.new_page()
                        page.on('pageerror', lambda error: report['pageErrors'].append(str(error)))
                        page.goto(base, wait_until='domcontentloaded')
                        ready = "() => navigator.serviceWorker.controller && window.AlibiDiagnostics?.getStatus().offlineReady"
                        page.wait_for_function(ready, timeout=45000)
                        context.set_offline(True)
                        for alias in ('privacy', 'about', 'login'):
                            for suffix in ('.html', '/index.html', '.html?from=offline', '/index.html?from=offline'):
                                route = alias + suffix
                                response = page.goto(base + route, wait_until='domcontentloaded')
                                page.wait_for_function('(alias) => location.hash.split("?")[0] === "#/" + alias', arg=alias)
                                page.wait_for_function(ready, timeout=15000)
                                assert response.status == 200, (route, response.status)
                                assert ('from=offline' in urlsplit(page.url).fragment) == ('?' in suffix), route
                                report['cases'].append({'width': width, 'route': route, 'status': 200})
                        for route in ('a/b/x.html', 'a/b/', 'missing.html', '404.html'):
                            response = page.goto(base + route, wait_until='domcontentloaded')
                            assert response.status == 404, (route, response.status)
                            assert page.get_by_role('heading', level=1).inner_text() == 'This clue leads nowhere.'
                            assert page.locator('body').evaluate('(el) => getComputedStyle(el).backgroundColor') == 'rgb(241, 238, 231)'
                            if route == 'missing.html':
                                page.screenshot(path=str(OUT / f'offline-404-{width}.png'), full_page=True)
                            page.get_by_role('link', name='Return to Alibi', exact=True).click()
                            page.wait_for_function(ready, timeout=15000)
                            assert urlsplit(page.url).path == '/'
                            report['cases'].append({'width': width, 'route': route, 'status': 404, 'returnedHome': True})
                    finally:
                        context.close()
            finally:
                browser.close()
        assert len(report['cases']) == 32, 'The complete two-viewport scenario set must run'
        assert not report['pageErrors'], report['pageErrors']
        report['passed'] = True
    except Exception as error:
        report['failure'] = f'{type(error).__name__}: {error}'
    finally:
        if server:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait()
        (OUT / 'results.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
        print(json.dumps(report, indent=2), flush=True)
    return 0 if report['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(run())
