"""Castle recovery through real controls, IndexedDB and the bounded import worker."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').split('#')[0]
OUT = Path('test-results/castle-recovery')


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'base': BASE, 'checks': []}
    def record(message):
        report['checks'].append(message)
    def click(page, action):
        page.locator(f'[data-do="{action}"]').first.click()
    def flush(page):
        return page.evaluate('() => AlibiCastle.flush().then(() => "ok", error => error.message)')
    def read(page):
        return page.evaluate('''async () => {
          const db = await new Promise((resolve,reject) => { const r=indexedDB.open('alibi-castle-v1',1); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
          try { return await new Promise((resolve,reject) => { const tx=db.transaction('records'); const r=tx.objectStore('records').get('chapter-one'); r.onsuccess=()=>resolve(r.result); tx.onerror=()=>reject(tx.error); }); }
          finally { db.close(); }
        }''')
    def import_data(page, data):
        page.locator('#castle-import').set_input_files({'name': 'castle.json', 'mimeType': 'application/json', 'buffer': json.dumps(data).encode()})
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            context = browser.new_context(viewport={'width': 390, 'height': 900})
            page = context.new_page()
            page.goto(BASE + '#/quiet/castle/journal')
            expect(page.locator('#notes')).to_be_visible()
            page.locator('#notes').fill('Original field note.')
            assert flush(page) == 'ok'
            with page.expect_download() as event:
                click(page, 'export')
            path = OUT / 'roundtrip.json'
            event.value.save_as(path)
            exported = json.loads(path.read_text())
            assert exported['state']['notes'] == 'Original field note.'
            page.locator('#notes').fill('A later observation.')
            assert flush(page) == 'ok'
            before = read(page)
            import_data(page, exported)
            expect(page.locator('#castle-title')).to_have_text('Review castle restore')
            assert read(page) == before
            click(page, 'close')
            assert read(page) == before
            record('export roundtrip is scoped; reviewing and cancelling import write nothing')
            import_data(page, exported)
            click(page, 'restore-merge')
            expect(page.locator('#notes')).to_have_value('A later observation.\n\n--- Imported notebook ---\nOriginal field note.')
            assert flush(page) == 'ok'
            merged = read(page)
            import_data(page, exported)
            click(page, 'restore-replace')
            expect(page.locator('#castle-title')).to_have_text('Replace this castle notebook?')
            assert read(page) == merged
            click(page, 'restore-confirm')
            expect(page.locator('#notes')).to_have_value('Original field note.')
            with page.expect_download() as event:
                click(page, 'recovery')
            recovery = OUT / 'recovery.json'
            event.value.save_as(recovery)
            assert json.loads(recovery.read_text())['state'] == merged['state']
            record('merge and confirmed replacement retain exact pre-restore recovery')
            unchanged = read(page)
            for kind in ['future', 'unknown', 'malformed']:
                bad = json.loads(json.dumps(exported))
                if kind == 'future': bad['state']['version'] = 100
                elif kind == 'unknown': bad['state']['preferences']['unknown'] = True
                else: bad['state']['drafts']['hanoi'] = [[0, 2], [0, 2]]
                import_data(page, bad)
                expect(page.locator('#castle-title')).to_have_text('Notebook needs attention')
                assert read(page) == unchanged
                click(page, 'close')
            record('bounded worker rejects future, unknown and invalid unfinished records without writes')
            page.evaluate('''() => {
              globalThis.castleTestPut=IDBObjectStore.prototype.put;
              IDBObjectStore.prototype.put=function(value,key) {
                const request=globalThis.castleTestPut.call(this,value,key);
                if(this.transaction.db.name==='alibi-castle-v1' && key==='chapter-one') this.transaction.abort();
                return request;
              };
            }''')
            import_data(page, exported)
            click(page, 'restore-merge')
            expect(page.locator('#castle-title')).to_have_text('Notebook needs attention')
            assert read(page) == unchanged
            click(page, 'close')
            page.evaluate('() => { IDBObjectStore.prototype.put=globalThis.castleTestPut; delete globalThis.castleTestPut; }')
            record('interrupted real IndexedDB restore rolls back all notebook writes')
            # Review in one tab, then change the committed record from another tab.
            other = context.new_page()
            other.goto(BASE + '#/quiet/castle/journal')
            expect(other.locator('#notes')).to_have_value('Original field note.')
            import_data(page, exported)
            expect(page.locator('#castle-title')).to_have_text('Review castle restore')
            other.locator('#notes').fill('Second tab owns this commit.')
            assert flush(other) == 'ok'
            committed = read(other)
            click(page, 'restore-merge')
            expect(page.locator('#castle-dialog')).to_contain_text('Another tab changed')
            assert read(other) == committed
            click(page, 'close')
            record('stale restore cannot replace another tab or its recovery')
            page.reload()
            expect(page.locator('#notes')).to_have_value('Second tab owns this commit.')
            # Combined export retains the Castle notebook after leaving the activity.
            page.evaluate('location.hash = "#/settings"')
            with page.expect_download() as event:
                page.locator('[data-action="export-all"]').click()
            combined_path = OUT / 'combined.json'
            event.value.save_as(combined_path)
            combined = json.loads(combined_path.read_text())
            assert 'castle' in combined['manifest']
            assert combined['sections']['castle']['state']['notes'] == 'Second tab owns this commit.'
            with page.expect_file_chooser() as chooser:
                page.locator('[data-action="import-all"]').click()
            chooser.value.set_files(str(combined_path))
            expect(page.locator('[data-action="all-castle"]')).to_be_visible()
            page.locator('[data-action="all-castle"]').click()
            expect(page.locator('#castle-title')).to_have_text('Review castle restore')
            click(page, 'close')
            record('combined manifest and bounded validation route castle section to explicit review')
            # A quota exception in a real IndexedDB write retains both disk and session.
            prior = read(page)
            page.evaluate('''() => { const original=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(...args) { if(this.transaction.db.name==='alibi-castle-v1') throw new DOMException('Test quota denial','QuotaExceededError'); return original.apply(this,args); }; }''')
            page.locator('#notes').fill('Unsaved quota note.')
            page.wait_for_function('() => AlibiCastle.diagnostics().mode === "session"')
            assert flush(page) != 'ok'
            assert read(page) == prior
            with page.expect_download() as event:
                click(page, 'export')
            event.value.save_as(OUT / 'quota-session.json')
            expect(page.locator('#castle-title')).to_have_text('Keep this notebook')
            click(page, 'close')
            assert flush(page) != 'ok'
            with page.expect_download() as event:
                click(page, 'export')
            event.value.save_as(OUT / 'confirmed-session.json')
            click(page, 'acknowledge-export')
            assert flush(page) == 'ok'
            assert read(page) == prior
            page.locator('#notes').fill('A new edit needs a new export.')
            assert flush(page) != 'ok'
            record('quota retains disk/session; cancelled confirmation blocks update; exact export acknowledgement expires on edit')
            page.screenshot(path=str(OUT / 'recovery-phone.png'), full_page=True)
            context.close()
            browser.close()
        report['passed'] = True
    finally:
        (OUT / 'acceptance.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    run()
