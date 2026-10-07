"""September phone-play and shell regressions. CI uses the real built HTTP origin.

ALIBI_QA_HTML is an optional isolated DOM fixture, not a persistence/release proof.
"""
import json
import os
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
from official_fixture import OFFICIAL_COUNT
from block_landscape_cases import check_landscape
from bridge_landscape_cases import check_bridge_landscape
from duel_landscape_cases import check_duel_landscape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'mobile-qa'
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787')


class MobileQA(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        OUT.mkdir(parents=True, exist_ok=True)
        cls.pw = sync_playwright().start()
        options = {'args': ['--no-sandbox']}
        if os.environ.get('CHROMIUM_PATH'):
            options['executable_path'] = os.environ['CHROMIUM_PATH']
        cls.browser = cls.pw.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def open_page(self, width=390, height=844, route='home'):
        context = self.browser.new_context(
            viewport={'width': width, 'height': height},
            is_mobile=width < 1000, has_touch=width < 1000, reduced_motion='reduce',
        )
        self.addCleanup(context.close)
        page = context.new_page()
        page.set_default_timeout(7000)
        if os.environ.get('ALIBI_QA_HTML'):
            page.set_content(Path(os.environ['ALIBI_QA_HTML']).read_text(), wait_until='domcontentloaded')
            page.wait_for_function('() => Boolean(window.AlibiDiagnostics)')
            page.evaluate('(route) => location.hash = "#/" + route', route)
        else:
            page.goto(URL + '/#/' + route, wait_until='domcontentloaded')
            page.wait_for_function('() => Boolean(window.AlibiDiagnostics)')
            # Keep the existing worker-readiness budget; isolated fixtures never wait here.
            page.wait_for_function(
                '()=>navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady',
                timeout=30000,
            )
        return page

    def dismiss_lesson(self, page):
        page.locator('#dialog[open] [data-action="lesson-finish"]').click()
        expect(page.locator('#dialog')).not_to_be_visible()



    def test_workshop_verify_preserves_edits_while_worker_pending(self):
        if os.environ.get('ALIBI_QA_HTML'):
            self.skipTest('Workshop worker ordering requires the real IndexedDB origin')
        for route_change in [False, True]:
            with self.subTest(route_change=route_change):
                page = self.open_page(1440, 1000, 'workshop')
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.wait_for_function('() => AlibiDiagnostics.getStatus().mode === "indexeddb"')
                page.locator('#scene-form button[type="submit"]').click()
                expect(page.locator('.draft-editor')).to_be_visible(timeout=15000)
                page.wait_for_function('() => !document.querySelector("[data-action=verify-draft]").disabled')
                read_draft = r'''()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('alibi-device',1);
  req.onerror=()=>reject(req.error);
  req.onsuccess=()=>{const db=req.result,tx=db.transaction('meta','readonly'),get=tx.objectStore('meta').get('workshop-draft');
    tx.oncomplete=()=>{db.close();resolve(get.result?.value?.puzzle)};
    tx.onerror=()=>{db.close();reject(tx.error)};
  };
})'''
                before = page.evaluate(read_draft)
                self.assertTrue(before and before['rooms'])
                page.evaluate(r'''(()=>{
  window.workshopProbe={enabled:false,held:false};
  const post=Worker.prototype.postMessage;
  Worker.prototype.postMessage=function(message,...args){
    if(workshopProbe.enabled && message?.type==='draft')this.__workshopProbe=true;
    return post.call(this,message,...args);
  };
  const descriptor=Object.getOwnPropertyDescriptor(Worker.prototype,'onmessage');
  Object.defineProperty(Worker.prototype,'onmessage',{
    configurable:descriptor.configurable,enumerable:descriptor.enumerable,get:descriptor.get,
    set(callback){descriptor.set.call(this,typeof callback==='function'?function(event){
      if(this.__workshopProbe && workshopProbe.enabled){
        workshopProbe.enabled=false;workshopProbe.held=true;
        workshopProbe.result=event.data;
        workshopProbe.release=()=>callback.call(this,event);
        return;
      }return callback.call(this,event);
    }:callback)}
  });
})();''')
                page.evaluate('() => workshopProbe.enabled = true')
                page.locator('[data-action="verify-draft"]').click()
                page.wait_for_function('() => workshopProbe.held')
                self.assertTrue(page.evaluate('workshopProbe.result.ok'))
                if route_change:
                    page.evaluate('() => location.hash = "#/home"')
                    expect(page.locator('.club-welcome')).to_be_visible()
                    page.locator('[data-action="navigate"][data-page="workshop"]').first.click()
                    expect(page.locator('.draft-editor')).to_be_visible()
                desired = (before['rooms'][0] + 1) % len(before['roomNames'])
                page.locator(f'[data-action="draft-paint"][data-value="{desired}"]').click()
                cell = page.locator('[data-action="draft-cell"][data-cell="0"]')
                expect(cell).to_be_enabled()
                cell.click()
                page.wait_for_function('''desired => new Promise((resolve, reject) => {
                    const req = indexedDB.open('alibi-device', 1);
                    req.onerror = () => reject(req.error);
                    req.onsuccess = () => {
                        const db = req.result, tx = db.transaction('meta', 'readonly');
                        const get = tx.objectStore('meta').get('workshop-draft');
                        tx.oncomplete = () => { db.close(); resolve(get.result?.value?.puzzle.rooms[0] === desired); };
                    };
                })''', arg=desired)
                edited = page.evaluate(read_draft)
                self.assertEqual(edited['rooms'][0], desired)
                expect(page.locator('.draft-editor .badge')).to_have_text('Edited draft · recheck required')
                page.evaluate('() => workshopProbe.release()')
                page.wait_for_function('() => !document.querySelector("[data-action=verify-draft]").disabled')
                # Wait for the completed handler to settle, then inspect both durable draft and UI.
                page.evaluate('async () => { await new Promise(requestAnimationFrame); await new Promise(requestAnimationFrame); }')
                self.assertEqual(page.evaluate(read_draft), edited)
                expect(page.locator('.draft-editor .badge')).to_have_text('Edited draft · recheck required')
                self.assertFalse(errors, errors)

    def test_backup_validation_keeps_its_settings_route(self):
        if os.environ.get('ALIBI_QA_HTML'):
            self.skipTest('Native validator completion requires the real built HTTP origin.')
        for kind, export_action, input_selector, restore_action in [
            ('cabinet-backup', 'export', '#backup-input', 'restore-merge'),
            ('combined-backup', 'export-all', '#all-backup-input', 'all-cabinet'),
        ]:
            with self.subTest(kind=kind):
                page = self.open_page(390, 844, 'settings')
                errors = []
                page.on('pageerror', lambda error, target=errors: target.append(str(error)))
                # Read an ordinary app-exported backup. No invented schema or validator stub.
                with page.expect_download(timeout=30000) as downloaded:
                    page.locator('[data-action="' + export_action + '"]').first.click()
                payload = Path(downloaded.value.path()).read_bytes()
                page.evaluate('''kind => {
                    const Native = window.Worker;
                    window.__backupRouteProbe = {
                        Native, kind, pending:null,
                        async release() {
                            const pending = this.pending;
                            this.pending = null;
                            pending.callback.call(pending.worker, pending.event);
                            // Allow the real inWorker Promise and its awaiting caller to settle.
                            await Promise.resolve();
                            await Promise.resolve();
                        }
                    };
                    window.Worker = class extends Native {
                        postMessage(message, ...rest) {
                            this.backupType = message?.type;
                            return super.postMessage(message, ...rest);
                        }
                        set onmessage(callback) {
                            super.onmessage = event => {
                                const probe = window.__backupRouteProbe;
                                if (this.backupType === probe.kind)
                                    probe.pending = {worker:this, event, callback};
                                else callback.call(this, event);
                            };
                        }
                    };
                }''', kind)

                def select_backup():
                    # Cabinet input has the app's delegated change handler. Combined's
                    # actual action installs its onchange handler and resets its value.
                    if kind == 'combined-backup':
                        page.locator('[data-action="import-all"]').click()
                    page.locator(input_selector).set_input_files({
                        'name': 'ordinary-backup.json',
                        'mimeType': 'application/json',
                        'buffer': payload,
                    })
                    page.wait_for_function('() => !!window.__backupRouteProbe.pending')
                    self.assertTrue(page.evaluate(
                        '() => window.__backupRouteProbe.pending.event.data.ok'))

                try:
                    # Positive control: normal completion on Settings still offers review.
                    select_backup()
                    page.evaluate('() => window.__backupRouteProbe.release()')
                    expect(page.locator('dialog[open] [data-action="' + restore_action + '"]')).to_be_visible()
                    page.locator('dialog[open] [data-action="close-dialog"]').first.click()
                    expect(page.locator('dialog')).not_to_be_visible()

                    # A real successful result must not reopen a dialog after leaving Settings.
                    select_backup()
                    page.evaluate('() => location.hash = "#/home"')
                    expect(page.locator('.club-welcome')).to_be_visible()
                    expect(page.locator('dialog')).not_to_be_visible()
                    page.evaluate('() => window.__backupRouteProbe.release()')
                    self.assertEqual(page.evaluate('() => location.hash'), '#/home')
                    expect(page.locator('.club-welcome')).to_be_visible()
                    expect(page.locator('dialog')).not_to_be_visible()
                    self.assertFalse(errors, errors)
                finally:
                    page.evaluate('() => window.Worker = window.__backupRouteProbe.Native')


    def test_lesson_finish_preserves_newer_route(self):
        if os.environ.get('ALIBI_QA_HTML'):
            self.skipTest('Lesson completion ordering requires the real IndexedDB origin')
        page = self.open_page(390, 844, 'settings')
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.wait_for_function('() => AlibiDiagnostics.getStatus().mode === "indexeddb"')
        # Native IDB commits normally. Delay only its preferences completion notification;
        # the real storage watchdog still receives complete and clears its timer.
        page.evaluate(r'''(()=>{
  window.lessonRouteProbe={enabled:false,held:false};
  const put=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(record,...args){
    if(lessonRouteProbe.enabled && this.name==='meta' && record?.key==='preferences' && this.transaction.db.name==='alibi-device'){
      this.transaction.__lessonProbe=true;
    }
    return put.call(this,record,...args);
  };
  const descriptor=Object.getOwnPropertyDescriptor(IDBTransaction.prototype,'oncomplete');
  Object.defineProperty(IDBTransaction.prototype,'oncomplete',{
    configurable:descriptor.configurable,enumerable:descriptor.enumerable,get:descriptor.get,
    set(callback){
      descriptor.set.call(this,typeof callback==='function'?function(event){
        if(this.__lessonProbe && lessonRouteProbe.enabled){
          lessonRouteProbe.enabled=false;
          lessonRouteProbe.held=true;
          lessonRouteProbe.committed=true;
          lessonRouteProbe.release=async()=>{
            callback.call(this,event);
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
          };
          return;
        }
        return callback.call(this,event);
      }:callback);
    }
  });
})();''')
        page.locator('[data-action="choose-lesson"]').click()
        page.locator('[data-action="lesson"][data-type="sudoku"]').click()
        expect(page.locator('[data-action="lesson-finish"]')).to_be_visible()
        page.evaluate('() => lessonRouteProbe.enabled = true')
        page.locator('[data-action="lesson-finish"]').click()
        page.wait_for_function('() => lessonRouteProbe.held && lessonRouteProbe.committed')
        self.assertTrue(page.evaluate('lessonRouteProbe.committed'))
        # Verify the intended preference actually committed before release.
        preferences = page.evaluate('''() => new Promise((resolve, reject) => {
            const request = indexedDB.open('alibi-device', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                const db = request.result, tx = db.transaction('meta', 'readonly');
                const read = tx.objectStore('meta').get('preferences');
                tx.oncomplete = () => { db.close(); resolve(read.result.value); };
                tx.onerror = () => { db.close(); reject(tx.error); };
            };
        })''')
        self.assertIn('sudoku', preferences['seen'])
        page.evaluate('() => location.hash = "#/home"')
        expect(page.locator('.club-welcome')).to_be_visible()
        expect(page.locator('#dialog')).not_to_be_visible()
        self.assertEqual(page.evaluate('location.hash'), '#/home')
        page.evaluate('() => lessonRouteProbe.release()')
        self.assertEqual(page.evaluate('location.hash'), '#/home')
        expect(page.locator('.club-welcome')).to_be_visible()
        expect(page.locator('#dialog')).not_to_be_visible()
        self.assertFalse(errors, errors)

        # Positive control in a fresh origin profile: ordinary finish still opens a puzzle.
        positive = self.open_page(390, 844, 'settings')
        positive_errors = []
        positive.on('pageerror', lambda error: positive_errors.append(str(error)))
        positive.locator('[data-action="choose-lesson"]').click()
        positive.locator('[data-action="lesson"][data-type="sudoku"]').click()
        positive.locator('[data-action="lesson-finish"]').click()
        positive.wait_for_function('() => location.hash.startsWith("#/play/sudoku") && AlibiDiagnostics.getCurrent()?.puzzle.type === "sudoku"')
        self.assertTrue(positive.evaluate('location.hash.startsWith("#/play/sudoku")'))
        expect(positive.locator('#dialog')).not_to_be_visible()
        self.assertFalse(positive_errors, positive_errors)

    def test_borough_build_reachable_after_selection(self):
        for width, height in [(390, 844), (320, 568), (390, 650), (700, 800), (700, 568), (1440, 900)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'salon/borough')
                if not os.environ.get('ALIBI_QA_HTML'):
                    page.wait_for_function(
                        '() => navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady',
                        timeout=30000,
                    )
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                cell = page.locator('.borough-cell:not(.built)').first
                cell_id = cell.get_attribute('id')
                cell.click()
                build = page.locator('[data-action="club-build"]')
                expect(build).to_be_enabled()
                def geometry():
                    return build.evaluate('''el => {
                        const r=el.getBoundingClientRect(), nav=document.querySelector('.mobile-nav');
                        const edge=nav && getComputedStyle(nav).display!=='none' ? nav.getBoundingClientRect().top : innerHeight;
                        const x=r.x+r.width/2, y=r.y+r.height/2;
                        return {x,y,top:r.top,bottom:r.bottom,edge,hit:el.contains(document.elementFromPoint(x,y)),overflow:document.documentElement.scrollWidth>innerWidth+1};
                    }''')
                initial = geometry()
                page.screenshot(path=str(OUT / f'borough-selected-{width}-{height}.png'))
                if width <= 800:
                    self.assertGreaterEqual(initial['top'], 0, initial)
                    self.assertLessEqual(initial['bottom'], initial['edge'], initial)
                    self.assertTrue(initial['hit'], initial)
                    expect(build).to_be_focused()
                    # Changing the chosen offer must reveal confirmation again.
                    page.locator('[data-action="club-plan"]').nth(1).click()
                    expect(build).to_be_focused()
                    revised = geometry()
                    self.assertLessEqual(revised['bottom'], revised['edge'], revised)
                    self.assertTrue(revised['hit'], revised)
                    before = page.evaluate('AlibiClub.diagnostics().state.runs.borough.log.length')
                    page.touchscreen.tap(revised['x'], revised['y'])
                else:
                    before = page.evaluate('AlibiClub.diagnostics().state.runs.borough.log.length')
                    build.click()
                expect(page.locator('#' + cell_id)).to_be_focused()
                self.assertEqual(page.evaluate('AlibiClub.diagnostics().state.runs.borough.log.length'), before+1)
                self.assertFalse(page.evaluate('document.documentElement.scrollWidth>innerWidth+1'))
                if width <= 800:
                    built = page.locator('#' + cell_id).bounding_box()
                    edge = page.locator('.mobile-nav').bounding_box()['y']
                    self.assertGreaterEqual(built['y'], 0, built)
                    self.assertLessEqual(built['y']+built['height'], edge, built)
                    page.locator('.borough-cell:not(.built)').first.focus()
                    page.keyboard.press('Enter')
                    expect(page.locator('[data-action="club-build"]')).to_be_focused()
                    page.keyboard.press('Enter')
                    self.assertEqual(page.evaluate('AlibiClub.diagnostics().state.runs.borough.log.length'), before+2)
                self.assertFalse(errors, errors)
                page.screenshot(path=str(OUT / f'borough-built-{width}-{height}.png'))

    def test_block_cabinet_landscape_board_tray_and_exit(self):
        metrics = []
        for width, height in [(667, 375), (844, 390)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'salon/blockcabinet')
                metrics.append(check_landscape(
                    page, isolated=bool(os.environ.get('ALIBI_QA_HTML')),
                    screenshot=OUT / f'block-landscape-{width}.png',
                ))
        (OUT / 'block-landscape.json').write_text(json.dumps(metrics, indent=2))

    def test_block_return_target_preserves_portrait_and_desktop_layout(self):
        for width, height in [(390, 844), (1280, 900)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'salon/blockcabinet')
                host = page.locator('.bc-host')
                host.locator('.bc-cell').first.wait_for()
                target = host.locator('.bc-return')
                size = target.bounding_box()
                self.assertGreaterEqual(size['width'], 44)
                self.assertGreaterEqual(size['height'], 44)
                self.assertEqual(host.locator('.bc-stage').evaluate('el => getComputedStyle(el).display'), 'block')
                if width == 1280:
                    expect(page.locator('.sidebar')).to_be_visible()
                target.click()
                expect(host).to_have_count(0)
                self.assertEqual(page.evaluate('location.hash'), '#/salon')

    def test_bridges_landscape_full_board_and_controls(self):
        metrics = []
        for width, height in [(667, 375), (844, 390)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'play/bridges-01@1')
                self.dismiss_lesson(page)
                metrics.append(check_bridge_landscape(
                    page, screenshot=OUT / f'bridges-landscape-{width}.png',
                ))
        (OUT / 'bridges-landscape.json').write_text(json.dumps(metrics, indent=2))

    def test_board_is_visible_after_lesson(self):
        metrics = []
        for width, height in [(320, 568), (360, 800), (390, 844), (430, 932), (667, 375), (844, 390)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'play/bridges-01@1')
                self.dismiss_lesson(page)
                expect(page.locator('.island')).to_have_count(4)
                geometry = page.evaluate('''() => {
                    const nav = document.querySelector('.mobile-nav');
                    const edge = nav && getComputedStyle(nav).display !== 'none'
                        ? nav.getBoundingClientRect().top : innerHeight;
                    const islands = [...document.querySelectorAll('.island')].map(el => {
                        const r = el.getBoundingClientRect();
                        return {top:r.top,bottom:r.bottom,visible:r.top >= 0 && r.bottom <= edge};
                    });
                    return {width:innerWidth,height:innerHeight,edge,islands,scrollY,
                        overflow:document.documentElement.scrollWidth > innerWidth + 1};
                }''')
                metrics.append(geometry)
                page.screenshot(path=str(OUT / f'play-{width}.png'))
                self.assertFalse(geometry['overflow'], geometry)
                self.assertEqual(sum(x['visible'] for x in geometry['islands']), 4, geometry)
                # Selection must not jump the board or rewrite the player save.
                page.locator('.island').first.click()
                self.assertEqual(page.evaluate('AlibiDiagnostics.getCurrent().moves'), 0)
                self.assertLessEqual(abs(page.evaluate('scrollY') - geometry['scrollY']), 1)
        (OUT / 'board-metrics.json').write_text(json.dumps(metrics, indent=2))

    def test_phone_controls_have_44px_hit_areas(self):
        for width in [320, 390, 844]:
            with self.subTest(width=width):
                page = self.open_page(width, 844, 'play/bridges-01@1')
                self.dismiss_lesson(page)
                sizes = page.locator('.top-actions .round, .play-head .round, .board-heading .round').evaluate_all(
                    'els => els.map(el => ({label:el.getAttribute("aria-label"),w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}))')
                self.assertTrue(all(s['w'] >= 44 and s['h'] >= 44 for s in sizes), sizes)
                page.evaluate('location.hash = "#/settings"')
                expect(page.locator('#setting-contrast')).to_be_visible()
                for name in ['contrast', 'largeText', 'reducedMotion', 'timer', 'sound', 'haptics']:
                    control = page.locator('#setting-' + name)
                    expect(control).to_be_visible()
                    control_id = 'setting-' + name
                    page.wait_for_function(
                        '''id => {
                            const el = document.getElementById(id);
                            const rect = el?.getBoundingClientRect();
                            return Boolean(rect && rect.width >= 44 && rect.height >= 44);
                        }''',
                        arg=control_id,
                    )
                    page.evaluate('(id) => document.getElementById(id)?.scrollIntoView({block: "center"})', control_id)
                    size = page.evaluate(
                        '''id => {
                            const rect = document.getElementById(id)?.getBoundingClientRect();
                            return rect ? {width: rect.width, height: rect.height} : null;
                        }''',
                        arg=control_id,
                    )
                    self.assertIsNotNone(size, name)
                    self.assertGreaterEqual(size['width'], 44, name)
                    self.assertGreaterEqual(size['height'], 44, name)
                    before = control.is_checked()
                    # Hit the padding, not only the visible track.
                    control.click(position={'x': 2, 'y': 2})
                    self.assertEqual(control.is_checked(), not before, name)

    def test_bridge_zoom_changes_board_and_targets(self):
        page = self.open_page(route='play/bridges-01@1')
        self.dismiss_lesson(page)
        # Capture the values being asserted in the same browser turn as readiness.
        # A later protocol bounding_box() can resolve a node that is then replaced.
        sampler = '''async expected => {
            const samples = [];
            for (let frame = 0; frame < 3; frame++) {
                await new Promise(resolve => requestAnimationFrame(resolve));
                const board = document.querySelector('#main [data-scroll-key="bridges"]');
                const map = board?.querySelector('.bridge-map');
                const islands = [...(map?.querySelectorAll('.island') || [])];
                const pressed = document.getElementById('play-zoom')?.getAttribute('aria-pressed');
                const zoomed = expected.mode === 'enlarged';
                if (!map || islands.length !== 4 || pressed !== String(zoomed) ||
                    board.classList.contains('zoomed') !== zoomed) return false;
                const rect = map.getBoundingClientRect();
                const sample = {map: {width: rect.width, height: rect.height},
                    islands: islands.map(el => {
                        const r = el.getBoundingClientRect();
                        return {id: el.id, width: r.width, height: r.height};
                    }), pressed, scrollWidth: document.documentElement.scrollWidth,
                    viewport: innerWidth, moves: globalThis.AlibiDiagnostics.getCurrent().moves};
                if (sample.map.width <= 0 || sample.map.height <= 0 ||
                    sample.islands.some(el => el.width < 44 || el.height < 44)) return false;
                if (expected.before) {
                    const before = expected.before;
                    const matches = (value, previous) => zoomed
                        ? value > previous : Math.abs(value - previous) <= 1;
                    if (!matches(sample.map.width, before.map.width) || sample.islands.some((el, i) =>
                        el.id !== before.islands[i].id || !matches(el.width, before.islands[i].width) ||
                        !matches(el.height, before.islands[i].height))) return false;
                }
                samples.push(sample);
            }
            const first = samples[0];
            if (samples.some(sample => Math.abs(sample.map.width - first.map.width) > 1 ||
                Math.abs(sample.map.height - first.map.height) > 1 || sample.islands.some((el, i) =>
                    el.id !== first.islands[i].id || Math.abs(el.width - first.islands[i].width) > 1 ||
                    Math.abs(el.height - first.islands[i].height) > 1))) return false;
            return samples;
        }'''
        before_samples = page.wait_for_function(sampler, arg={'mode': 'baseline'}).json_value()
        before = before_samples[-1]
        page.get_by_role('button', name='Enlarge board', exact=True).click()
        enlarged = page.wait_for_function(
            sampler, arg={'mode': 'enlarged', 'before': before},
        ).json_value()
        page.get_by_role('button', name='Use normal board size', exact=True).click()
        restored = page.wait_for_function(
            sampler, arg={'mode': 'restored', 'before': before},
        ).json_value()
        evidence = {'before': before_samples, 'enlarged': enlarged, 'restored': restored}
        (OUT / 'zoom-metrics.json').write_text(json.dumps(evidence, indent=2))
        for sample in enlarged:
            self.assertGreater(sample['map']['width'], before['map']['width'])
            for actual, original in zip(sample['islands'], before['islands']):
                self.assertGreater(actual['width'], original['width'])
                self.assertGreater(actual['height'], original['height'])
        for sample in restored:
            self.assertAlmostEqual(sample['map']['width'], before['map']['width'], delta=1)
            for actual, original in zip(sample['islands'], before['islands']):
                self.assertAlmostEqual(actual['width'], original['width'], delta=1)
                self.assertAlmostEqual(actual['height'], original['height'], delta=1)
        for samples in evidence.values():
            self.assertEqual(len(samples), 3)
            for sample in samples:
                self.assertEqual(len(sample['islands']), 4)
                self.assertLessEqual(sample['scrollWidth'], sample['viewport'] + 1)
                self.assertEqual(sample['moves'], 0)

    def test_optional_play_context_remains_reachable(self):
        page = self.open_page(320, 568, 'play/bridges-01@1')
        self.dismiss_lesson(page)
        details = page.locator('details[data-disclosure-key="play-context"]')
        expect(details).not_to_have_attribute('open', '')
        details.locator('#play-context-summary').click()
        expect(details.locator('.assist-bar')).to_be_visible()
        expect(details.locator('.chapter-atmosphere')).to_contain_text('Four islands')
        details.locator('[data-action="club-assist"][data-value="candidates"]').click()
        expect(page.locator('details[data-disclosure-key="play-context"]')).to_have_attribute('open', '')
        page.locator('details[data-disclosure-key="play-context"] > summary').click()
        page.locator('.island').first.click()
        self.assertEqual(page.evaluate('AlibiDiagnostics.getCurrent().moves'), 0)

    def test_route_leave_closes_lesson_and_keyboard_stays_modal(self):
        page = self.open_page(320, 568, 'play/bridges-01@1')
        dialog = page.locator('#dialog[open]')
        expect(dialog).to_be_visible()
        for key in ['Tab'] * 10 + ['Shift+Tab'] * 10:
            page.keyboard.press(key)
            self.assertTrue(page.evaluate('document.querySelector("#dialog").contains(document.activeElement)'), key)
        page.evaluate('location.hash = "#/casebooks"')
        expect(page.locator('#dialog')).not_to_be_visible()
        expect(page.locator('.book-card')).to_have_count(5)
        self.assertEqual(page.evaluate('document.activeElement.id'), 'main')
        page.evaluate('location.hash = "#/play/bridges-01@1"')
        expect(page.locator('#dialog[open]')).to_be_visible()  # Route leave did not mark it seen.
        page.keyboard.press('Escape')
        expect(page.locator('#dialog')).not_to_be_visible()
        self.assertTrue(page.evaluate('''() => [...document.querySelectorAll('.island')].every(el =>
            el.getBoundingClientRect().bottom <= document.querySelector('.mobile-nav').getBoundingClientRect().top)'''),
            'Escape dismissal must reveal the same board as Start playing')
        page.locator('.play-head [data-action="lesson"]').click()
        page.locator('#dialog [data-action="lesson-example"]').click()
        self.assertTrue(page.evaluate('document.querySelector("#dialog").contains(document.activeElement)'))
        page.keyboard.press('Escape')
        expect(page.locator('.play-head [data-action="lesson"]')).to_be_focused()

    def test_readable_navigation_and_card_names(self):
        page = self.open_page(1280, 900)
        expect(page.get_by_role('button', name=f'The puzzle collection, {OFFICIAL_COUNT} puzzles', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='The games room', exact=True)).to_be_visible()
        page.evaluate('location.hash = "#/library/bridges"')
        card = page.locator('.puzzle-card').first
        expect(card.locator('.card-art')).to_have_attribute('aria-hidden', 'true')
        name = card.locator('.card-open').get_attribute('aria-label')
        self.assertIn(card.locator('h3').inner_text(), name)
        self.assertIn('Gentle', name)
        self.assertIn('5 × 5', name)
        self.assertIn('Not started', name)

    def test_mobile_navigation_and_edition_are_readable(self):
        for width in [320, 390, 430]:
            with self.subTest(width=width):
                page = self.open_page(width, 844)
                expect(page.locator('.club-welcome')).to_be_visible()
                buttons = page.locator('.mobile-nav button')
                sizes = buttons.evaluate_all('els => els.map(el => el.getBoundingClientRect().height)')
                self.assertLessEqual(max(sizes) - min(sizes), 1, sizes)
                expect(page.locator('.mobile-nav [data-page="salon"]')).to_have_accessible_name('Games room')
                expect(page.locator('.mobile-nav [data-page="salon"] span')).to_have_text('Games')
                sizes = page.locator('.club-welcome .eyebrow, .club-welcome .club-new').evaluate_all(
                    'els => els.map(el => parseFloat(getComputedStyle(el).fontSize))')
                self.assertTrue(sizes and min(sizes) >= 11, sizes)
                self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width + 1)


    def test_feature_heading_respects_page_hierarchy(self):
        measurements = []
        for width in [320, 390, 768, 1280, 1440]:
            page = self.open_page(width, 900)
            expect(page.locator('.club-welcome h1')).to_be_visible()
            visited = set()
            for _ in range(4):
                edition = page.locator('.club-hero').get_attribute('data-theatre-story')
                self.assertNotIn(edition, visited)
                visited.add(edition)
                with self.subTest(width=width, edition=edition):
                    geometry = page.evaluate('''() => {
                        const pageTitle = document.querySelector('.club-welcome h1');
                        const feature = document.querySelector('.hero-copy h2');
                        const title = feature.getBoundingClientRect();
                        const card = document.querySelector('.club-hero').getBoundingClientRect();
                        return {width:innerWidth, edition:document.querySelector('.club-hero').dataset.theatreStory,
                            pageSize:parseFloat(getComputedStyle(pageTitle).fontSize),
                            featureSize:parseFloat(getComputedStyle(feature).fontSize),
                            contained:title.left >= card.left && title.right <= card.right + 1 &&
                                title.top >= card.top && title.bottom <= card.bottom + 1,
                            overflow:document.documentElement.scrollWidth > innerWidth + 1};
                    }''')
                    measurements.append(geometry)
                    page.screenshot(path=str(OUT / f'type-{width}-{edition}.png'))
                    self.assertLessEqual(geometry['featureSize'], geometry['pageSize'], geometry)
                    self.assertGreaterEqual(geometry['featureSize'], 24, geometry)
                    self.assertTrue(geometry['contained'], geometry)
                    self.assertFalse(geometry['overflow'], geometry)
                page.get_by_role('button', name='Next edition', exact=False).click()
                expect(page.locator('.club-hero')).not_to_have_attribute('data-theatre-story', edition)
        (OUT / 'typography-metrics.json').write_text(json.dumps(measurements, indent=2))

    def test_phone_play_metadata_has_readable_floor(self):
        for width, height in [(320, 568), (390, 844), (844, 390)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'play/bridges-01@1')
                self.dismiss_lesson(page)
                for selector, minimum in [('.play-title .row', 12), ('.play-title .difficulty', 12),
                                          ('.play-title .save-state', 12), ('.board-heading .eyebrow', 11)]:
                    label = page.locator(selector)
                    expect(label).to_be_visible()
                    self.assertGreaterEqual(label.evaluate('el => parseFloat(getComputedStyle(el).fontSize)'),
                                            minimum, selector)
                self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'), width + 1)
                self.assertEqual(page.evaluate('AlibiDiagnostics.getCurrent().moves'), 0)

    def test_duel_landscape_board_is_above_the_fold(self):
        for width, height in [(667, 375), (844, 390)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'salon/duel')
                check_duel_landscape(page, screenshot=OUT / f'duel-landscape-{width}.png')

    def test_duel_portrait_and_desktop_geometry_unchanged(self):
        for width, height, grid_width in [(390, 844, 332), (1280, 900, 480)]:
            with self.subTest(viewport=(width, height)):
                page = self.open_page(width, height, 'salon/duel')
                page.locator('#duel-0').wait_for()
                size = page.locator('.duel-grid').evaluate(
                    'el => { const r = el.getBoundingClientRect(); return {w:Math.round(r.width), h:Math.round(r.height)}; }')
                self.assertEqual(size['w'], grid_width, size)
                self.assertEqual(size['h'], grid_width, size)
                if width == 1280:
                    expect(page.locator('.sidebar')).to_be_visible()


if __name__ == '__main__':
    unittest.main(verbosity=2)
