"""Actual Eclipse Lab controls, using an isolated loopback server and Chromium."""
import json
import os
import pathlib
import socket
import subprocess
import time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_PATH')
PUZZLES = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {PUZZLES} from './src/eclipse-lab/puzzles.mjs';console.log(JSON.stringify(PUZZLES))"], cwd=ROOT))

def run():
    server = None
    url = os.environ.get('ALIBI_URL')
    if not url:
        sock = socket.socket(); sock.bind(('127.0.0.1', 0)); port = sock.getsockname()[1]; sock.close()
        server = subprocess.Popen(['node', 'tools/serve.cjs'], cwd=ROOT, env={**os.environ, 'PORT': str(port)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        url = f'http://127.0.0.1:{port}/'
        for _ in range(100):
            try:
                with socket.create_connection(('127.0.0.1', port), timeout=.1): break
            except OSError: time.sleep(.05)
        else: raise RuntimeError('server did not start')
    out = ROOT / 'test-results' / 'eclipse-lab'; out.mkdir(parents=True, exist_ok=True)
    def worker_preview(page, backup):
        with page.expect_event('worker') as launched:
            page.locator('[data-file]').set_input_files({
                'name': 'backup.json',
                'mimeType': 'application/json',
                'buffer': json.dumps(backup).encode(),
            })
        assert launched.value.url.startswith('blob:')
        page.get_by_role('button', name='Confirm restore', exact=True).wait_for()

    def cancel_worker_preview(page, backup):
        worker_preview(page, backup)
        page.get_by_role('button', name='Cancel', exact=True).click()
        assert page.get_by_role('button', name='Confirm restore', exact=True).count() == 0

    def confirm_worker_restore(page, backup):
        worker_preview(page, backup)
        with page.expect_event('worker') as preparation:
            page.get_by_role('button', name='Confirm restore', exact=True).click()
        assert preparation.value.url.startswith('blob:')
        page.get_by_text('Restoring backup…', exact=True).wait_for(state='hidden')
        assert page.get_by_role('button', name='Confirm restore', exact=True).count() == 0

    def restore_delivery(page, backup):
        def download(name):
            with page.expect_download() as receipt:
                page.get_by_role('button', name=name, exact=True).click()
            return json.loads(pathlib.Path(receipt.value.path()).read_text(encoding='utf-8'))

        before = download('Export lab backup')['save']
        imported = json.loads(json.dumps(backup))
        next(iter(imported['save']['runs'].values()))['feedback'] = 'Imported in this delivery test'
        confirm_worker_restore(page, imported)
        page.reload()
        actual = download('Export lab backup')['save']
        assert actual == {**imported['save'], 'revision': before['revision'] + 1}
        recovery = download('Download recovery copy')
        assert recovery['save'] == before
        confirm_worker_restore(page, recovery)
        assert download('Export lab backup')['save'] == {**before, 'revision': actual['revision'] + 1}

    try:
      with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
        for width in (320, 390, 1280):
          context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
          page = context.new_page(); errors=[]; page.on('pageerror', lambda e: errors.append(str(e)))
          page.goto(url + '#/quiet/eclipse', wait_until='domcontentloaded')
          page.get_by_role('heading', name='Eclipse Lab', exact=True).wait_for(timeout=30000)
          assert page.locator('.card').count() == 5
          assert page.evaluate("AlibiActivities.diagnostics().kind === 'eclipse'")
          page.locator('.skip-link').focus(); page.keyboard.press('Enter')
          assert page.evaluate("document.activeElement.shadowRoot?.activeElement?.matches('main')"), 'lobby skip link reaches its content'
          assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'overflow {width}'
          page.screenshot(path=str(out / f'lobby-{width}.png'), full_page=True)
          for mode in ('constellation', 'eclipse', 'harbour', 'switchback', 'mirror'):
            p = next(p for p in PUZZLES if p['mode'] == mode and p['level'] == 1)
            page.evaluate("id => location.hash = '#/quiet/eclipse/' + id", p['id'])
            page.get_by_role('heading', name=p['title'], exact=True).wait_for()
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'board overflow {width} {mode}'
            if mode == 'mirror':
              assert page.locator('.board').count() == 2
              assert page.locator('.cell').count() == 32
              assert min(page.locator('.cell').evaluate_all('(els) => els.map(e => Math.min(e.getBoundingClientRect().width, e.getBoundingClientRect().height))')) >= 44
              a, b = page.locator('.board').evaluate_all('(els) => els.map(e => ({x: e.getBoundingClientRect().x, y: e.getBoundingClientRect().y}))')
              assert (a['y'] == b['y'] and a['x'] < b['x']) if width >= 600 else (a['x'] == b['x'] and a['y'] < b['y'])
              for j, link in enumerate(p['links']):
                for endpoint in (link['a'], link['b']):
                  cell = page.locator(f'[data-cell="{endpoint}"]')
                  assert f'link {j + 1} {link["relation"]}' in cell.get_attribute('aria-label')
                  assert str(j + 1) in cell.locator('.link-numbers').inner_text()
                page.get_by_role('button', name=f'Link {j + 1}:').click()
                assert page.locator('.cell.highlight').count() == 2
                assert all('highlight' in page.locator(f'[data-cell="{i}"]').get_attribute('class') for i in (link['a'], link['b']))
              page.locator('[data-cell="0"]').focus(); page.keyboard.press('b')
              assert page.locator('[data-cell="16"]').evaluate('(e) => e === e.getRootNode().activeElement')
              page.keyboard.press('ArrowUp')
              assert page.locator('[data-cell="16"]').evaluate('(e) => e === e.getRootNode().activeElement')
              page.keyboard.press('ArrowDown')
              assert page.locator('[data-cell="20"]').evaluate('(e) => e === e.getRootNode().activeElement')
              page.get_by_role('button', name='Hint', exact=True).click()
              assert 'Try ' in page.locator('.message').inner_text()
            if mode == 'constellation':
              page.locator('.skip-link').focus(); page.keyboard.press('Enter')
              assert page.locator('[data-cell="0"]').evaluate('(e) => e === e.getRootNode().activeElement'), 'skip link enters optional puzzle'
              assert min(page.locator('.rating label').evaluate_all('(els) => els.map(e => e.getBoundingClientRect().width)')) >= 44
              brush = page.locator('[data-brush="0"]'); brush.focus(); page.keyboard.press('Enter')
              assert page.locator('[data-brush="0"]').evaluate('(e) => e === e.getRootNode().activeElement')
              page.keyboard.press('Tab'); assert page.locator('[data-brush="-1"]').evaluate('(e) => e === e.getRootNode().activeElement')
              clue = page.locator('[data-clue="0"]'); clue.focus(); page.keyboard.press('Enter')
              assert page.locator('[data-clue="0"]').evaluate('(e) => e === e.getRootNode().activeElement')
              hint_button = page.get_by_role('button',name='Hint',exact=True); hint_button.focus(); page.keyboard.press('Enter')
              assert page.get_by_role('button',name='Hint',exact=True).evaluate('(e) => e === e.getRootNode().activeElement')
              page.locator('[data-cell="2"]').focus()
              page.locator('.skip-link').focus(); page.keyboard.press('Enter')
              assert page.locator('[data-cell="2"]').evaluate('(e) => e === e.getRootNode().activeElement'), 'skip link returns to the selected cell'
              page.get_by_role('button', name='Preview linked group').click()
              assert page.locator('.cell.highlight').count() == 2
              page.get_by_role('button', name='Fill linked group').click()
              page.get_by_text('Linked group filled as one move.', exact=True).wait_for()
              assert all('Empty' not in page.locator(f'[data-cell="{i}"]').get_attribute('aria-label') for i in (2,3))
              page.get_by_role('button', name='Undo', exact=True).click()
              page.get_by_text('Move undone.', exact=True).wait_for()
              assert page.locator('[data-cell="2"]').evaluate('(e) => e === e.getRootNode().activeElement'), 'last Undo retains keyboard focus on the selected cell'
              assert all('Empty' in page.locator(f'[data-cell="{i}"]').get_attribute('aria-label') for i in (2,3))
            for i, given in enumerate(p['givens']):
              if given != -1: continue
              page.locator(f'[data-brush="{p["solution"][i]}"]').click()
              cell=page.locator(f'[data-cell="{i}"]'); cell.click()
              page.locator(f'[data-cell="{i}"][aria-label*="{"Sun" if p["solution"][i] else "Moon"}"]').wait_for()
            page.get_by_role('button',name='Check',exact=True).click()
            assert 'Solved!' in page.locator('.message').inner_text(), mode
            if mode == 'mirror':
              page.get_by_role('button', name='Undo', exact=True).click()
              page.get_by_text('Move undone.', exact=True).wait_for()
              page.get_by_role('button', name='Redo', exact=True).click()
              page.get_by_text('Move restored.', exact=True).wait_for()
              page.reload(); page.get_by_role('heading', name=p['title'], exact=True).wait_for()
              page.get_by_role('button', name='Check', exact=True).click()
              assert 'Solved!' in page.locator('.message').inner_text()
              page.evaluate('scrollTo(0, 0)')
              page.screenshot(path=str(out / f'mirror-{width}.png'), full_page=True)
            if mode == 'constellation':
              page.get_by_role('button',name='Undo',exact=True).click()
              page.get_by_role('button',name='Redo',exact=True).click(); page.get_by_text('Move restored.', exact=True).wait_for()
              page.locator('[data-cell="0"]').focus(); page.keyboard.press('ArrowRight'); assert page.locator('[data-cell="1"]').evaluate('(e) => e === e.getRootNode().activeElement')
              page.locator('[data-clue="0"]').click(); assert page.locator('.cell.highlight').count() == p['size']
              page.evaluate('scrollTo(0, 0)')
              page.screenshot(path=str(out / f'board-{width}.png'), full_page=True)
          page.locator('[name="rating"][value="4"]').check(); page.locator('[data-difficulty]').select_option('just-right'); page.locator('[data-feedback]').fill('A lovely small challenge.')
          assert page.evaluate("async () => { try { await AlibiEclipse.flush(); return false } catch { return true } }")
          page.get_by_role('button',name='Save feedback',exact=True).click(); page.wait_for_timeout(100)
          from urllib.parse import urlparse, parse_qs
          share = page.get_by_role('link',name='Share feedback on GitHub')
          parsed = urlparse(share.get_attribute('href')); query=parse_qs(parsed.query)
          assert parsed.netloc == 'github.com' and parsed.path == '/Chris0Jeky/Alibi/issues/new'
          body=query['body'][0]; assert 'mirror-01' in body and 'just-right' in body and 'A lovely small challenge.' in body
          assert 'cells' not in body and 'recovery' not in body
          with page.expect_download() as download: page.get_by_role('button',name='Export lab backup',exact=True).click()
          backup=json.loads(pathlib.Path(download.value.path()).read_text()); assert any(r['rating']==4 and r['feedback']=='A lovely small challenge.' for r in backup['save']['runs'].values())
          page.reload(); page.get_by_role('heading',name='Mirror 1',exact=True).wait_for(timeout=30000); assert page.locator('[data-feedback]').input_value()=='A lovely small challenge.'
          page.on('dialog', lambda d: d.accept())
          page.locator('[data-file]').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{bad'})
          assert page.locator('[data-feedback]').input_value()=='A lovely small challenge.'
          page.locator('[data-feedback]').fill('Changed later')
          if width == 390:
              page.locator('[name="rating"][value="2"]').check()
              page.locator('[data-difficulty]').select_option('gentle')
          page.get_by_role('button',name='Save feedback',exact=True).click()
          page.get_by_text('Feedback saved locally.',exact=True).wait_for()
          page.locator('[data-file]').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()})
          restore = page.get_by_role('button', name='Confirm restore', exact=True)
          if width == 390:
              holder = context.new_page()
              holder.goto(url + '404.html', wait_until='domcontentloaded')
              holder.evaluate("""() => {
                  window.eclipseLock = navigator.locks.request('alibi.eclipse.v1', () =>
                    new Promise(resolve => { window.releaseEclipseLock = resolve; }));
              }""")
              holder.wait_for_function("() => typeof window.releaseEclipseLock === 'function'")
              queued = """async () => (await navigator.locks.query()).pending.some(
                lock => lock.name === 'alibi.eclipse.v1')"""
              try:
                  page.evaluate("""() => {
                      const send = Worker.prototype.postMessage;
                      Worker.prototype.postMessage = function (message, ...args) {
                        if (message?.type !== 'prepare-restore') return send.call(this, message, ...args);
                        Worker.prototype.postMessage = send;
                        window.releaseRestorePreparation = () => send.call(this, message, ...args);
                      };
                  }""")
                  with page.expect_event('worker') as preparation:
                      restore.click()
                  assert preparation.value.url.startswith('blob:')
                  page.wait_for_function("() => typeof window.releaseRestorePreparation === 'function'")
                  progress = page.get_by_text('Restoring backup…', exact=True)
                  progress.wait_for()
                  assert page.get_by_role('button', name='Cancel', exact=True).count() == 0
                  assert page.get_by_role('button', name='Confirm restore', exact=True).count() == 0
                  page.evaluate("window.releaseRestorePreparation()")
                  page.wait_for_function(queued, timeout=8000)
                  assert progress.is_visible()
                  assert page.get_by_role('button', name='Cancel', exact=True).count() == 0
                  page.locator('[data-feedback]').fill('Only the note changed during restore')
                  assert page.evaluate(queued), 'note must be entered while the restore is waiting'
              finally:
                  holder.evaluate("async () => { window.releaseEclipseLock(); await window.eclipseLock; }")
                  holder.close()
          else:
              restore.click()
          page.get_by_text('Lab backup restored. A recovery copy was kept.',exact=True).wait_for()
          if width == 390:
              assert page.locator('[data-feedback]').input_value() == 'Only the note changed during restore'
              assert page.locator('[name="rating"][value="4"]').is_checked()
              assert page.locator('[data-difficulty]').input_value() == 'just-right'
              page.get_by_role('button', name='Save feedback', exact=True).click()
              page.get_by_text('Feedback saved locally.', exact=True).wait_for()
              page.reload()
              page.get_by_role('heading', name='Mirror 1', exact=True).wait_for(timeout=30000)
              assert page.locator('[data-feedback]').input_value() == 'Only the note changed during restore'
              assert page.locator('[name="rating"][value="4"]').is_checked()
              assert page.locator('[data-difficulty]').input_value() == 'just-right'
          else:
              assert page.locator('[data-feedback]').input_value()=='A lovely small challenge.'
          with page.expect_download() as recovery: page.get_by_role('button',name='Download recovery copy').click()
          recovered=json.loads(pathlib.Path(recovery.value.path()).read_text())
          assert any(r['feedback']=='Changed later' for r in recovered['save']['runs'].values())
          page.evaluate("location.hash = '#/quiet/eclipse'")
          page.get_by_role('link',name='Constellation 1, 4 by 4, solved',exact=True).wait_for()
          assert page.locator('.level-list a.completed').count() == 5
          page.evaluate("location.hash = '#/quiet/eclipse/eclipse-05'")
          page.get_by_role('heading',name='Eclipse 5',exact=True).wait_for()
          assert page.locator('.cell').count() == 36
          assert min(page.locator('.cell').evaluate_all('(els) => els.map(e => e.getBoundingClientRect().width)')) >= 44
          assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
          page.wait_for_function('navigator.serviceWorker.controller !== null', timeout=30000)
          assert page.evaluate('async () => await AlibiEclipse.cachePack()')
          context.set_offline(True)
          page.reload(); page.get_by_role('heading',name='Eclipse 5',exact=True).wait_for(timeout=30000)
          page.locator('[data-cell="0"]').focus(); page.keyboard.press('ArrowRight')
          assert page.locator('[data-cell="1"]').evaluate('(e) => e === e.getRootNode().activeElement')
          assert page.evaluate('AlibiActivities.diagnostics().kind') == 'eclipse'
          assert page.evaluate('AlibiActivities.diagnostics().offline')
          page.evaluate("location.hash = '#/quiet/eclipse/mirror-01'")
          page.get_by_role('heading', name='Mirror 1', exact=True).wait_for()
          page.get_by_role('button', name='Check', exact=True).click()
          assert 'Solved!' in page.locator('.message').inner_text()
          if width == 390:
              restore_delivery(page, backup)
          else:
              cancel_worker_preview(page, backup)
          context.set_offline(False)
          assert not errors, errors
          context.close()
        protected = browser.new_context(viewport={'width': 390, 'height': 900}, accept_downloads=True)
        protected.add_init_script("localStorage.setItem('alibi.eclipse.v1', '{future-version}')")
        page = protected.new_page(); page.goto(url + '#/quiet/eclipse/mirror-01')
        page.get_by_role('heading', name='Mirror 1', exact=True).wait_for(timeout=30000)
        assert 'preserved' in page.locator('.status').inner_text()
        page.locator('[data-cell="0"]').click()
        page.locator('[data-cell="0"][aria-label*="Sun"]').wait_for()
        assert page.evaluate("localStorage.getItem('alibi.eclipse.v1')") == '{future-version}'
        with page.expect_download() as download: page.get_by_role('button',name='Export lab backup',exact=True).click()
        data = json.loads(pathlib.Path(download.value.path()).read_text())
        assert data['recovery']['raw'] == '{future-version}'
        protected.close()
        session = browser.new_context(viewport={'width':390,'height':900}, accept_downloads=True)
        session.add_init_script("Object.defineProperty(navigator,'locks',{value:undefined})")
        page = session.new_page(); page.goto(url + '#/quiet/eclipse/constellation-01')
        page.get_by_role('heading',name='Constellation 1',exact=True).wait_for(timeout=30000)
        page.locator('[data-cell="2"]').click(); page.locator('[data-cell="2"][aria-label*="Sun"]').wait_for()
        assert page.evaluate("async () => { try { await AlibiEclipse.flush(); return false } catch { return true } }")
        with page.expect_download(): page.get_by_role('button',name='Export lab backup',exact=True).click()
        assert page.evaluate("async () => { try { await AlibiEclipse.flush(); return true } catch { return false } }")
        session.close()
        standalone = browser.new_context(accept_downloads=True)
        page = standalone.new_page()
        page.goto((ROOT / 'alibi-deluxe-play.html').as_uri() + '#/quiet/eclipse/' + 'mirror-01')
        page.locator('[data-feedback]').fill('Standalone prior shelf')
        page.get_by_role('button', name='Save feedback', exact=True).click()
        page.get_by_text('Feedback saved locally.', exact=True).wait_for()
        restore_delivery(page, backup)
        standalone.close()
        browser.close()
      print('Eclipse browser journeys passed at 320, 390 and 1280 pixels')
    finally:
      if server: server.terminate(); server.wait(timeout=5)

if __name__ == '__main__': run()
