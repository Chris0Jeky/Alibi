"""Experimental Castle escape rooms through real controls on the built origin (#467, #469, #470, #471)."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8797/').split('#')[0]
OUT = ROOT / 'test-results/castle-escape'
ROOM = json.loads((ROOT / 'content/escape-rooms/tidekeeper-workshop.json').read_text())
OTHER = json.loads((ROOT / 'content/escape-rooms/counterweight-loft.json').read_text())
ESCAPE = '#/quiet/castle/case/escape'
SCOPE = f"{ROOM['id']}@{ROOM['revision']}"
ANSWERS = {a['id']: a.get('answer') for a in ROOM['actions']}
# The shortest winning path of the declared model, as object/action pairs.
PATH = [('locker', 'open-cabinet'), ('locker', 'take-handle'), ('lifting-gear', 'install-handle'),
        ('instrument', 'calibrate'), ('lifting-gear', 'notch-middle'), ('lifting-gear', 'route-lift'),
        ('service-gate', 'raise-gate')]


def read(page, key='chapter-one'):
    return page.evaluate('''async key => {
      const db = await new Promise((resolve,reject) => { const r=indexedDB.open('alibi-castle-v1',1); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
      try { return await new Promise((resolve,reject) => { const tx=db.transaction('records'); const r=tx.objectStore('records').get(key); r.onsuccess=()=>resolve(r.result ?? null); tx.onerror=()=>reject(tx.error); }); }
      finally { db.close(); }
    }''', key)


def flush(page):
    return page.evaluate('() => AlibiCastle.flush().then(() => "ok", e => e.message)')


def import_data(page, data):
    page.locator('#castle-import').set_input_files({'name': 'castle.json', 'mimeType': 'application/json', 'buffer': json.dumps(data).encode()})


def exercise_recovery(page, context, main, room_url):
    complete = page.evaluate('() => AlibiCastle.exportBackup()')
    completed_room = complete['state']['escapeRooms'][ROOM['id']]
    stale = context.new_page()
    try:
        stale.goto(room_url)
        expect(stale.get_by_role('heading', name='Room complete')).to_be_visible()
        main.get_by_role('button', name='Restart room').click()
        page.locator('#castle-dialog').get_by_role('button', name='Restart room').click()
        assert flush(page) == 'ok'
        reset = read(page)
        stale.locator('[data-do="escape-undo"]').click()
        assert 'Another tab changed' in flush(stale)
        assert read(page) == reset
        recovered_stale = stale.evaluate('() => AlibiCastle.exportBackup()')
        assert recovered_stale['state']['escapeRooms'][ROOM['id']]['trail'] == completed_room['trail'][:-1]
    finally:
        stale.close()

    page.evaluate('location.hash = "#/quiet/castle/journal"')
    dialog = page.locator('#castle-dialog')
    import_data(page, complete)
    expect(dialog).to_contain_text('Escape room saves: 1')
    dialog.locator('.close').click()
    assert read(page) == reset

    import_data(page, complete)
    dialog.get_by_role('button', name='Merge discoveries').click()
    expect(dialog).to_contain_text('Escape room saves differ')
    dialog.locator('.close').click()
    assert read(page) == reset

    import_data(page, complete)
    dialog.get_by_role('button', name='Replace notebook').click()
    expect(dialog).to_contain_text('Replace this castle notebook?')
    page.evaluate('''() => {
      window.escapeOriginalValidation = AlibiValidateImport;
      window.AlibiValidateImport = async message => {
        if (message.type === 'castle-restore') await new Promise(resolve => { window.releaseEscapeRestore = resolve; });
        return window.escapeOriginalValidation(message);
      };
    }''')
    dialog.locator('[data-do="restore-confirm"]').click()
    page.wait_for_function('() => typeof window.releaseEscapeRestore === "function"')
    page.evaluate('(hash) => { location.hash = hash; }', room_url.split('#', 1)[1])
    expect(main.locator('h1')).to_have_text(ROOM['title'])
    main.get_by_role('button', name='Restart room').click()
    expect(page.locator('#castle-live')).to_have_text('Wait for the Castle notebook restore to finish.')
    assert read(page) == reset
    page.evaluate('window.releaseEscapeRestore()')
    expect(main.get_by_role('heading', name='Room complete')).to_be_visible()
    page.evaluate('() => { window.AlibiValidateImport = window.escapeOriginalValidation; }')
    restored = read(page)
    assert restored['state']['escapeRooms'][ROOM['id']] == completed_room
    assert read(page, 'pre-restore-chapter-one')['state'] == reset['state']

    page.evaluate('location.hash = "#/quiet/castle/journal"')
    bad = json.loads(json.dumps(complete))
    bad['state']['escapeRooms'][ROOM['id']]['revision'] += 1
    import_data(page, bad)
    expect(dialog).to_contain_text('Unknown or invalid escape room progress')
    assert read(page) == restored
    dialog.locator('.close').click()

    # Emulate an unknown room revision already stored by a newer build.
    future = {**restored, 'state': bad['state']}
    page.evaluate('''async value => {
      const db = await new Promise(resolve => { const r=indexedDB.open('alibi-castle-v1',1); r.onsuccess=()=>resolve(r.result); });
      try { await new Promise((resolve, reject) => {
        const tx = db.transaction('records','readwrite'); tx.oncomplete=resolve; tx.onabort=reject;
        tx.objectStore('records').put(value,'chapter-one');
      }); } finally { db.close(); }
    }''', future)
    page.reload()
    page.wait_for_function('() => AlibiCastle.diagnostics().mode === "protected"')
    assert read(page) == future
    assert page.evaluate('() => AlibiCastle.exportBackup()')['preservedRecord'] == future


def focused(page):
    return page.locator('#quiet-host').evaluate(
        'host=>{const e=host.shadowRoot.activeElement;return e?[e.dataset.do||e.tagName,e.dataset.value||""]:null}')


def handle(obj, action):
    return f'{SCOPE}/{obj}/{action}'


def act(page, scope, obj, action, use_enter=False):
    value = handle(obj, action)
    answer = ANSWERS[action]
    if answer is not None:
        field = scope.locator(f'[data-escape-answer="{value}"]')
        field.fill(answer)
        if use_enter:
            field.press('Enter')
            return
    scope.locator(f'[data-do="escape-act"][data-value="{value}"]').click()


def sizes(page, width):
    """Every control on the escape page and open dialog: accessible name and a 44px target."""
    bad = page.locator('#quiet-host').evaluate('''host => {
      const r = host.shadowRoot, dialog = r.querySelector('dialog');
      const scope = [...r.querySelectorAll('#castle-main button,#castle-main a,#castle-main input')];
      if (dialog.open) scope.push(...dialog.querySelectorAll('button,a,input'));
      return scope.filter(el => {
        const box = el.getBoundingClientRect();
        const name = (el.getAttribute('aria-label') || el.textContent || el.closest('label')?.textContent || '').trim();
        return box.height < 44 || !name;
      }).map(el => el.outerHTML.slice(0, 120));
    }''')
    assert not bad, f'{width}: controls below 44px or unnamed: {bad}'


def run():
    OUT.mkdir(parents=True, exist_ok=True)
    report = {'passed': False, 'base': BASE, 'checks': [], 'errors': []}

    def record(width, message):
        report['checks'].append(f'{width}: {message}')
        print('PASS', report['checks'][-1], flush=True)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            for width, height in [(320, 740), (844, 390)]:
                context = browser.new_context(viewport={'width': width, 'height': height})
                page = context.new_page()
                page.on('pageerror', lambda error: report['errors'].append(str(error)))
                page.goto(BASE + '#/quiet/castle/journal')
                expect(page.locator('#notes')).to_be_visible()
                page.locator('#notes').fill('Fictional pre-escape note.')
                assert flush(page) == 'ok'
                original = read(page)

                if width == 320:
                    page.evaluate('''() => {
                      window.escapeCacheAdd = Cache.prototype.add;
                      Cache.prototype.add = function (request) {
                        if (request.url.includes('/assets/escape/')) return Promise.reject(Error('test interrupted delivery'));
                        return window.escapeCacheAdd.call(this, request);
                      };
                    }''')
                page.get_by_role('link', name='Experimental escape rooms').click()
                main = page.locator('#castle-main')
                expect(main.locator('h1')).to_have_text('Escape rooms')
                expect(main).to_contain_text('Escape progress is included in Castle notebook exports')
                expect(main).to_contain_text('Untimed')
                expect(page.locator('header nav a[aria-current="page"]')).to_have_text('Experimental escape rooms')
                sizes(page, width)
                record(width, 'experimental entry opens the six-room list and identifies the notebook export')
                if width == 320:
                    expect(main.locator('[data-escape-offline]')).to_have_text('Offline copy unavailable.')
                    assert read(page) == original
                    page.evaluate('() => { Cache.prototype.add = window.escapeCacheAdd; }')
                    record(width, 'interrupted optional cache leaves the notebook untouched and retries on entry')

                main.get_by_role('link', name=ROOM['title']).click()
                expect(main.locator('h1')).to_have_text(ROOM['title'])
                expect(main.locator('.escape-inventory')).to_have_text('Nothing in hand.')
                sizes(page, width)

                # Inspector path: a wrong answer is a no-op that keeps the draft; help is opt-in.
                dialog = page.locator('#castle-dialog')
                main.locator('[data-do="escape-object"][data-value="locker"]').click()
                expect(dialog).to_be_visible()
                field = dialog.locator(f'[data-escape-answer="{handle("locker", "open-cabinet")}"]')
                field.fill('1111')
                dialog.locator(f'[data-do="escape-act"][data-value="{handle("locker", "open-cabinet")}"]').click()
                expect(dialog).to_contain_text('That answer does not fit. Room unchanged; your draft is kept.')
                expect(field).to_have_value('1111')
                expect(main.locator('[data-do="escape-undo"]')).to_be_disabled()
                dialog.get_by_role('button', name='Hint 1 of 3').click()
                expect(dialog).to_contain_text('Orientation:')
                expect(dialog.get_by_role('button', name='Hint 2 of 3')).to_be_visible()
                sizes(page, width)
                page.screenshot(path=str(OUT / f'inspector-{width}.png'))
                assert flush(page) == 'ok'
                room_url = page.url
                page.reload()
                expect(main.locator('h1')).to_have_text(ROOM['title'])
                main.locator('[data-do="escape-object"][data-value="locker"]').click()
                expect(field).to_have_value('1111')
                expect(dialog.get_by_role('button', name='Hint 2 of 3')).to_be_visible()
                record(width, 'wrong answer leaves gameplay unchanged; draft and opt-in hint survive reload')

                # Enter submits from the keyboard; the inspector and list redraw together.
                act(page, dialog, 'locker', 'open-cabinet', use_enter=True)
                expect(dialog.locator(f'[data-do="escape-act"][data-value="{handle("locker", "take-handle")}"]')).to_be_visible()
                act(page, dialog, 'locker', 'take-handle')
                expect(dialog.locator('.escape-inventory')).to_have_text('In hand: handle')
                expect(main.locator('.escape-inventory')).to_have_text('In hand: handle')
                assert dialog.locator(f'[data-value="{handle("locker", "take-handle")}"]').count() == 0
                record(width, 'item moves cabinet to hand once; the pickup control disappears')

                dialog.locator('.close').click()
                expect(dialog).to_be_hidden()
                assert focused(page) == ['escape-object', 'locker'], focused(page)
                record(width, 'closing the inspector returns focus to its object')

                if width == 320:
                    assert flush(page) == 'ok'
                    expect(main.locator('[data-escape-offline]')).to_have_text('Available offline.')
                    page.wait_for_function('navigator.serviceWorker.controller !== null')
                    context.set_offline(True)
                    try:
                        page.reload()
                        expect(main.locator('.escape-inventory')).to_have_text('In hand: handle')
                        expect(main.locator('[data-do="escape-undo"]')).to_be_enabled()
                    finally:
                        context.set_offline(False)
                    record(width, 'warm offline reload restores inventory and Undo from IndexedDB')

                # A control left from before a route change is refused without changing the room.
                stale = main.locator(f'[data-do="escape-act"][data-value="{handle("lifting-gear", "install-handle")}"]')
                old_route = stale.get_attribute('data-escape-route')
                page.evaluate('([a,b]) => { location.hash = a; location.hash = b; location.hash = a; }',
                              [f"{ESCAPE}/{ROOM['id']}", f"{ESCAPE}/{OTHER['id']}"])
                expect(main.locator('h1')).to_have_text(ROOM['title'])
                expect(main.locator('.escape-inventory')).to_have_text('In hand: handle')
                fresh = main.locator(f'[data-do="escape-act"][data-value="{handle("lifting-gear", "install-handle")}"]')
                expect(fresh).not_to_have_attribute('data-escape-route', old_route)
                fresh.evaluate('(el, route) => { el.dataset.escapeRoute = route; el.click(); }', old_route)
                expect(page.locator('#castle-live')).to_have_text('That is not available here now. Room unchanged.')
                expect(main.locator('.escape-inventory')).to_have_text('In hand: handle')
                main.get_by_role('link', name='All escape rooms').click()
                main.get_by_role('link', name=OTHER['title']).click()
                expect(main.locator('h1')).to_have_text(OTHER['title'])
                expect(main.locator('.escape-inventory')).to_have_text('Nothing in hand.')
                page.go_back()
                page.go_back()
                expect(main.locator('h1')).to_have_text(ROOM['title'])
                expect(main.locator('.escape-inventory')).to_have_text('In hand: handle')
                record(width, 'A/B/A navigation keeps each room and refuses the earlier visit\'s control')

                # Undo restores the exact previous step; then finish through list controls only.
                main.locator('[data-do="escape-undo"]').click()
                expect(main.locator('.escape-inventory')).to_have_text('Nothing in hand.')
                act(page, main, 'locker', 'take-handle')
                for obj, action in PATH[2:]:
                    act(page, main, obj, action)
                expect(main.get_by_role('heading', name='Room complete')).to_be_visible()
                expect(page.locator('#castle-live')).to_have_text('Room complete.')
                assert main.locator('[data-do="escape-act"]').count() == 0
                sizes(page, width)
                page.screenshot(path=str(OUT / f'complete-{width}.png'), full_page=True)
                record(width, f"{ROOM['title']} completed through real list and inspector controls")

                assert flush(page) == 'ok'
                persisted = read(page)
                retained = {k: v for k, v in persisted['state'].items() if k not in ('escapeRooms', 'revision')}
                assert retained == {k: v for k, v in original['state'].items() if k != 'revision'}
                page.reload()
                expect(page.locator('#castle-main h1')).to_have_text(ROOM['title'])
                expect(main.get_by_role('heading', name='Room complete')).to_be_visible()
                assert read(page) == persisted
                record(width, 'completion survives reload without another write; Chapter I progress is identical')
                if width == 320:
                    exercise_recovery(page, context, main, room_url)
                    record(width, 'stale write, cancelled review, merge conflict, pending-restore navigation, recovery and future-save protection')
                assert not report['errors'], report['errors']
                context.close()
            browser.close()
        report['passed'] = True
    finally:
        (OUT / 'acceptance.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    run()
