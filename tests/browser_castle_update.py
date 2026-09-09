"""Castle recovery through the actual root update control, with labelled release A/B fixtures."""
import json
from pathlib import Path
import tempfile
import threading
from playwright.sync_api import sync_playwright, expect
from browser_update import make_releases, MutableStaticServer, ROOT

OUT=ROOT/'test-results/castle-update'

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    report={'passed':False,'scope':'Synthetic A/B releases on a real Chromium origin; no physical-device claim','checks':[]}
    fixtures,a,b=make_releases()
    server=MutableStaticServer(a)
    threading.Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}/'
    try:
        with tempfile.TemporaryDirectory(prefix='p-',dir=ROOT) as profile, sync_playwright() as p:
            context=p.chromium.launch_persistent_context(profile,headless=True,viewport={'width':390,'height':900},accept_downloads=True)
            try:
                first=context.pages[0]
                first.goto(base+'#/quiet/castle/journal')
                first.wait_for_function('() => globalThis.AlibiCastle?.diagnostics().mode==="local" && AlibiDiagnostics.getStatus().offlineReady && AlibiActivities.diagnostics().offline')
                if not first.evaluate('!!navigator.serviceWorker.controller'):
                    first.reload()
                    first.locator('#notes').wait_for()
                version=first.evaluate('ALIBI_CONFIG.version')
                second=context.new_page()
                second.goto(base+'#/quiet/castle/journal')
                expect(second.locator('#notes')).to_have_value('')
                first.locator('#notes').fill('The committed notebook stays on the device.')
                first.evaluate('() => AlibiCastle.flush()')
                second.locator('#notes').fill('A second tab has an uncommitted hypothesis.')
                second.wait_for_function('() => AlibiCastle.diagnostics().mode==="protected"')
                server.root=b
                second.evaluate('async () => { const r=await navigator.serviceWorker.ready; await r.update(); }')
                second.wait_for_function('() => AlibiDiagnostics.getStatus().waitingUpdate')
                second.locator('[data-action="apply-update"]').click()
                expect(second.locator('#toasts')).to_contain_text('Export this session')
                assert second.evaluate('ALIBI_CONFIG.version')==version
                report['checks'].append('A stale castle notebook blocks the actual Save & update control while release B waits')
                with second.expect_download() as download:
                    second.locator('[data-do="export"]').click()
                path=OUT/'protected-notebook.json'
                download.value.save_as(path)
                exported=json.loads(path.read_text(encoding='utf-8'))
                assert exported['state']['notes']=='A second tab has an uncommitted hypothesis.'
                second.locator('[data-do="close"]').click()
                second.locator('[data-action="apply-update"]').click()
                assert second.evaluate('ALIBI_CONFIG.version')==version
                assert second.evaluate('AlibiDiagnostics.getStatus().waitingUpdate')
                report['checks'].append('Export followed by cancellation cannot activate the waiting release')
                with second.expect_download() as download:
                    second.locator('[data-do="export"]').click()
                download.value.save_as(OUT/'confirmed-notebook.json')
                second.locator('[data-do="acknowledge-export"]').click()
                second.locator('[data-action="apply-update"]').click()
                second.wait_for_function('(v) => globalThis.ALIBI_CONFIG?.version===v',arg=version+'-test-fixture-b')
                expect(second.locator('#notes')).to_have_value('The committed notebook stays on the device.')
                assert first.evaluate('ALIBI_CONFIG.version')==version
                report['checks'].append('Exact export acknowledgement permits update, preserves the committed notebook and leaves the other document alone')
                # The exported session is recoverable through ordinary review on the new release.
                second.locator('#castle-import').set_input_files(str(path))
                second.locator('[data-do="restore-merge"]').click()
                expect(second.locator('#notes')).to_contain_text('A second tab has an uncommitted hypothesis.')
                second.evaluate('() => AlibiCastle.flush()')
                second.wait_for_function('() => AlibiActivities.diagnostics().offline')
                context.set_offline(True)
                second.reload()
                expect(second.locator('#notes')).to_contain_text('The committed notebook stays on the device.')
                expect(second.locator('#notes')).to_contain_text('A second tab has an uncommitted hypothesis.')
                report['checks'].append('The exported hypothesis can be reviewed and merged after updating, then reopens offline alongside the committed note')
            finally:
                context.close()
        report['passed']=True
    finally:
        server.shutdown()
        server.server_close()
        fixtures.cleanup()
        (OUT/'acceptance.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

if __name__=='__main__': run()
