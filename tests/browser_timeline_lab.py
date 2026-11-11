"""Actual Timeline Desk controls, using an isolated loopback server and Chromium."""
import json
import re
import os
import pathlib
import socket
import subprocess
import time
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
CHROMIUM = os.environ.get('CHROMIUM_PATH')
PUZZLES = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', "import {PUZZLES} from './src/timeline-lab/puzzles.mjs';console.log(JSON.stringify(PUZZLES))"], cwd=ROOT))
HOURS = lambda p, s: f"{((p['start'] + s) % 24) % 12 or 12}{'am' if (p['start'] + s) % 24 < 12 else 'pm'}"
cap = lambda s: s[0].upper() + s[1:]

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
    out = pathlib.Path(os.environ.get('ALIBI_SHOTS') or ROOT / 'test-results' / 'timeline-lab'); out.mkdir(parents=True, exist_ok=True)

    def cell(page, p, e, s):
        return page.locator(f'[data-cell="{e * p["slots"] + s}"]')
    def place(page, p, e, s):
        # Two real taps: open -> ruled out -> placed.
        c = cell(page, p, e, s); c.click(); c.click()
        page.locator(f'[data-cell="{e * p["slots"] + s}"][aria-label$="at {HOURS(p, s)}: placed"]').wait_for()
    def state(page, p, e, s, name):
        page.locator(f'[data-cell="{e * p["slots"] + s}"][aria-label$=": {name}"]').wait_for()
    def check_targets(page, width, label):
        sizes = page.locator('.cell').evaluate_all('(els) => els.map(e => { const r = e.getBoundingClientRect(); return [r.width, r.height] })')
        assert sizes and min(min(s) for s in sizes) >= 44, f'{label}: small target {min(min(s) for s in sizes)} at {width}'
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'{label}: page overflow at {width}'
        assert page.evaluate("(() => { const g = document.querySelector('#quiet-host').shadowRoot.querySelector('.grid-scroll'); return g.scrollWidth <= g.clientWidth + 1 })()"), f'{label}: grid scrolls sideways at {width}'
    def open_level(page, p):
        page.evaluate("id => location.hash = '#/quiet/timeline/' + id", p['id'])
        page.get_by_role('heading', name=p['title'], exact=True).wait_for(timeout=30000)

    def restore_race(context, page, p, backup):
        open_level(page, p)
        hour = p['solution'][0]
        stale_hour = (hour + 1) % p['slots']
        state(page, p, 0, hour, 'placed')
        cell(page, p, 0, hour).focus()
        page.keyboard.press('Backspace')
        state(page, p, 0, hour, 'open')
        page.locator('[name="rating"][value="2"]').check()
        page.locator('[data-feedback]').fill('Prior shelf note')
        page.get_by_role('button', name='Save feedback', exact=True).click()
        page.get_by_text('Feedback saved locally.', exact=True).wait_for()
        with page.expect_download() as export:
            page.get_by_role('button', name='Export desk backup', exact=True).click()
        before = json.loads(pathlib.Path(export.value.path()).read_text())

        def review(raw):
            page.locator('[data-file]').set_input_files({
                'name': 'timeline-backup.json', 'mimeType': 'application/json', 'buffer': raw,
            })
            page.get_by_role('button', name='Confirm restore', exact=True).wait_for()

        review(json.dumps(backup).encode())
        holder = context.new_page()
        holder.goto(url + '404.html', wait_until='domcontentloaded')
        holder.evaluate("""() => {
            window.testTimelineLock = navigator.locks.request('alibi.timeline.v1', () =>
                new Promise(resolve => { window.releaseTestTimelineLock = resolve; }));
        }""")
        holder.wait_for_function("() => typeof window.releaseTestTimelineLock === 'function'")
        queued = """async () => (await navigator.locks.query()).pending.some(
            lock => lock.name === 'alibi.timeline.v1')"""
        note = 'Draft typed during the restore'
        try:
            page.get_by_role('button', name='Confirm restore', exact=True).click()
            page.wait_for_function(queued, timeout=1800)
            page.locator('[data-feedback]').fill(note)
            cell(page, p, 0, stale_hour).click()
            assert page.evaluate(queued), 'edits must happen before the waiting restore is released'
        finally:
            holder.evaluate("async () => { window.releaseTestTimelineLock(); await window.testTimelineLock; }")
            holder.close()

        restored = page.get_by_text('Desk backup restored. A recovery copy was kept.', exact=True)
        restored.wait_for()
        state(page, p, 0, hour, 'placed')
        state(page, p, 0, stale_hour, 'open')
        assert page.locator('[data-feedback]').input_value() == note
        assert page.locator('[name="rating"][value="4"]').is_checked()
        page.get_by_role('button', name='Save feedback', exact=True).click()
        page.get_by_text('Feedback saved locally.', exact=True).wait_for()

        page.reload()
        page.get_by_role('heading', name=p['title'], exact=True).wait_for(timeout=30000)
        state(page, p, 0, hour, 'placed')
        state(page, p, 0, stale_hour, 'open')
        assert page.locator('[data-feedback]').input_value() == note
        with page.expect_download() as download:
            page.get_by_role('button', name='Download recovery copy', exact=True).click()
        recovery = pathlib.Path(download.value.path()).read_bytes()
        assert json.loads(recovery)['save'] == before['save']
        review(recovery)
        page.get_by_role('button', name='Confirm restore', exact=True).click()
        restored.wait_for()
        state(page, p, 0, hour, 'open')
        assert page.locator('[data-feedback]').input_value() == 'Prior shelf note'

    try:
      with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=CHROMIUM, headless=True, args=['--no-sandbox'])
        for width in (390, 1280):
          context = browser.new_context(viewport={'width': width, 'height': 900}, accept_downloads=True)
          page = context.new_page(); errors = []; page.on('pageerror', lambda e: errors.append(str(e)))
          if width >= 1000:
            # The desktop sidebar carries the labelled entry; it opens the lab.
            page.goto(url + '#/home', wait_until='domcontentloaded')
            nav = page.get_by_role('button', name='Timeline Desk, experimental')
            nav.wait_for(timeout=30000)
            nav.scroll_into_view_if_needed(); page.screenshot(path=str(out / f'navigation-{width}.png'))
            nav.click()
          else:
            # Phones have no sidebar: the Workshop link is the visible way in.
            page.goto(url + '#/workshop', wait_until='domcontentloaded')
            link = page.get_by_role('link', name='Timeline Desk', exact=True)
            link.wait_for(timeout=30000)
            link.click()
          page.get_by_role('heading', name='Timeline Desk', exact=True).wait_for(timeout=30000)
          assert page.evaluate("AlibiActivities.diagnostics().kind === 'timeline'")
          assert page.get_by_text('Experimental', exact=True).count() >= 1
          assert page.locator('.levels a').count() == 15
          assert page.get_by_text('15 cases', exact=True).count() == 1
          assert 'No timer' in page.locator('.rules').inner_text() or 'no timer' in page.locator('.rules').inner_text().lower()
          page.locator('.skip-link').focus(); page.keyboard.press('Enter')
          assert page.evaluate("document.activeElement.shadowRoot?.activeElement?.matches('main')"), 'lobby skip link reaches its content'
          assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'lobby overflow {width}'
          page.screenshot(path=str(out / f'lobby-{width}.png'), full_page=True)

          # Level 1, from the lobby link through real controls only.
          p = PUZZLES[0]
          page.get_by_role('link', name=f"Level 1, {p['title']}, {len(p['events'])} events, {p['slots']} hours").click()
          page.get_by_role('heading', name=p['title'], exact=True).wait_for()
          check_targets(page, width, 'level 1')
          first = cell(page, p, 0, 1)
          assert first.get_attribute('aria-label') == f"{cap(p['events'][0])} at {HOURS(p, 1)}: open"
          first.click(); state(page, p, 0, 1, 'ruled out')
          assert first.get_attribute('aria-label') == f"{cap(p['events'][0])} at {HOURS(p, 1)}: ruled out"
          first.click(); state(page, p, 0, 1, 'placed')
          first.click(); state(page, p, 0, 1, 'open')
          # Keyboard: arrows move, X rules out, P places, Backspace clears.
          cell(page, p, 0, 0).focus(); page.keyboard.press('ArrowRight')
          assert cell(page, p, 0, 1).evaluate('(e) => e === e.getRootNode().activeElement')
          page.keyboard.press('ArrowDown'); assert cell(page, p, 1, 1).evaluate('(e) => e === e.getRootNode().activeElement')
          page.keyboard.press('x'); state(page, p, 1, 1, 'ruled out')
          page.keyboard.press('p'); state(page, p, 1, 1, 'placed')
          page.keyboard.press('ArrowRight'); page.keyboard.press('p')
          state(page, p, 1, 2, 'placed'); state(page, p, 1, 1, 'open')  # placing moves the event within its row
          page.keyboard.press('Backspace'); state(page, p, 1, 2, 'open')
          assert cell(page, p, 1, 2).evaluate('(e) => e === e.getRootNode().activeElement'), 'focus stays on the edited cell'
          # Hint names one clue; Undo and Redo move through marks; Restart is undoable.
          cell(page, p, 2, 0).click(); state(page, p, 2, 0, 'ruled out')
          page.get_by_role('button', name='Hint', exact=True).click()
          assert page.locator('.message').inner_text().startswith('Clue '), page.locator('.message').inner_text()
          assert page.locator('.cell.flag').count() == 1
          page.get_by_role('button', name='Restart', exact=True).click()
          page.get_by_text('Level restarted. Undo brings your marks back.').wait_for()
          assert page.locator('.cell.s1, .cell.s2').count() == 0
          page.get_by_role('button', name='Undo', exact=True).click(); page.get_by_text('Move undone.').wait_for()
          assert page.locator('.cell.s1, .cell.s2').count() == 1
          page.get_by_role('button', name='Redo', exact=True).click(); page.get_by_text('Move restored.').wait_for()
          for e, s in enumerate(p['solution']): place(page, p, e, s)
          page.locator('.message', has_text='Solved.').wait_for()
          assert page.locator('.message').inner_text() == 'Solved. ' + p['payoff'] and page.locator('.payoff').count() == 0, 'the live message carries the payoff once'
          assert page.get_by_role('link', name='Next case →').count() == 1
          page.evaluate('scrollTo(0, 0)')
          page.screenshot(path=str(out / f'level-01-solved-{width}.png'), full_page=True)

          # A wrong placement is explained by Check, and Hint reports a contradiction.
          p2 = PUZZLES[1]; open_level(page, p2)
          check_targets(page, width, 'level 2')
          wrong = (p2['solution'][0] + 1) % p2['slots']
          place(page, p2, 0, wrong)
          cell(page, p2, 1, p2['solution'][1]).click(); state(page, p2, 1, p2['solution'][1], 'ruled out')
          page.get_by_role('button', name='Hint', exact=True).click()
          assert page.locator('.message').inner_text(), 'hint always answers'
          cell(page, p2, 0, p2['solution'][0]).click(); page.keyboard.press('x')

          # A later level: six events, shared hours allowed, a witness clock and a range.
          p = PUZZLES[9]; open_level(page, p)
          check_targets(page, width, 'level 10')
          assert 'Two events may share an hour.' in page.locator('.rule').inner_text()
          page.get_by_role('button', name=re.compile(r'^A witness clock')).first.click()
          assert page.locator('.evrow.lens').count() == 1 and page.get_by_role('button', pressed=True).count() == 1
          page.get_by_role('button', name=re.compile(r'^A witness clock')).first.click()
          assert page.locator('.evrow.lens').count() == 0
          place(page, p, 0, (p['solution'][0] + 1) % p['slots'])
          for e, s in enumerate(p['solution']): place(page, p, e, s)  # moving a placement within a row is allowed
          page.locator('.message', has_text='Solved.').wait_for()
          assert page.locator('.cell.s2').count() == len(p['events'])
          page.evaluate('scrollTo(0, 0)')
          page.screenshot(path=str(out / f'level-10-solved-{width}.png'), full_page=True)

          # The widest grid still fits without sideways scrolling.
          wide = next(q for q in PUZZLES if q['slots'] == 8 and len(q['events']) == 6)
          open_level(page, wide); check_targets(page, width, wide['id'])
          page.screenshot(path=str(out / f'level-{wide["level"]:02d}-open-{width}.png'), full_page=True)

          # Feedback and backup stay local; reload keeps the solved level.
          open_level(page, PUZZLES[0])
          page.locator('[name="rating"][value="4"]').check(); page.locator('[data-difficulty]').select_option('just-right'); page.locator('[data-feedback]').fill('A pleasant first case.')
          assert page.evaluate("async () => { try { await AlibiTimeline.flush(); return false } catch { return true } }")
          page.get_by_role('button', name='Save feedback', exact=True).click(); page.get_by_text('Feedback saved locally.', exact=True).wait_for()
          from urllib.parse import urlparse, parse_qs
          share = page.get_by_role('link', name='Share feedback on GitHub')
          parsed = urlparse(share.get_attribute('href')); body = parse_qs(parsed.query)['body'][0]
          assert parsed.netloc == 'github.com' and 'timeline-01' in body and 'A pleasant first case.' in body
          assert 'marks' not in body and 'recovery' not in body
          with page.expect_download() as download: page.get_by_role('button', name='Export desk backup', exact=True).click()
          backup = json.loads(pathlib.Path(download.value.path()).read_text())
          assert any(r['rating'] == 4 and r['feedback'] == 'A pleasant first case.' for r in backup['save']['runs'].values())
          page.reload(); page.get_by_role('heading', name=PUZZLES[0]['title'], exact=True).wait_for(timeout=30000)
          assert page.locator('.payoff').count() == 1 and page.locator('[data-feedback]').input_value() == 'A pleasant first case.'
          page.evaluate("location.hash = '#/quiet/timeline'")
          page.get_by_role('link', name=f"Level 1, {PUZZLES[0]['title']}, 5 events, 5 hours, solved").wait_for()
          assert page.locator('.levels a.completed').count() == 2
          if width == 390:
              restore_race(context, page, PUZZLES[0], backup)

          # Continue from an original case into the expansion and solve its first case.
          open_level(page, PUZZLES[11])
          p = PUZZLES[12]
          page.get_by_role('link', name='Next →', exact=True).click()
          page.get_by_role('heading', name=p['title'], exact=True).wait_for()
          check_targets(page, width, p['id'])
          page.get_by_role('button', name='Hint', exact=True).click()
          assert re.match(r'^Clue \d+ ', page.locator('.message').inner_text())
          assert page.get_by_text(p['payoff']).count() == 0
          for e, s in enumerate(p['solution']): place(page, p, e, s)
          page.get_by_text('Solved. ' + p['payoff'], exact=True).wait_for()
          page.evaluate('scrollTo(0, 0)')
          page.screenshot(path=str(out / f'level-13-solved-{width}.png'), full_page=True)

          # Reload the next case offline and place two events at the same hour.
          p = PUZZLES[13]
          page.get_by_role('link', name='Next case →', exact=True).click()
          page.get_by_role('heading', name=p['title'], exact=True).wait_for()
          page.wait_for_function('navigator.serviceWorker.controller !== null', timeout=30000)
          assert page.evaluate('async () => await AlibiTimeline.cachePack()')
          context.set_offline(True)
          page.reload(); page.get_by_role('heading', name=p['title'], exact=True).wait_for(timeout=30000)
          assert 'Two events may share an hour.' in page.locator('.rule').inner_text()
          place(page, p, 1, p['solution'][1]); place(page, p, 4, p['solution'][4])
          state(page, p, 1, p['solution'][1], 'placed')
          assert page.evaluate('AlibiActivities.diagnostics().kind') == 'timeline' and page.evaluate('AlibiActivities.diagnostics().offline')
          context.set_offline(False)
          assert not errors, errors
          context.close()

        # Unknown future bytes are protected, never overwritten.
        protected = browser.new_context(viewport={'width': 390, 'height': 900}, accept_downloads=True)
        protected.add_init_script("localStorage.setItem('alibi.timeline.v1', '{future-version}')")
        page = protected.new_page(); page.goto(url + '#/quiet/timeline/timeline-01')
        page.get_by_role('heading', name=PUZZLES[0]['title'], exact=True).wait_for(timeout=30000)
        assert 'preserved' in page.locator('.status').inner_text()
        page.locator('[data-cell="1"]').click(); page.locator('[data-cell="1"][aria-label$="ruled out"]').wait_for()
        assert page.evaluate("localStorage.getItem('alibi.timeline.v1')") == '{future-version}'
        with page.expect_download() as download: page.get_by_role('button', name='Export desk backup', exact=True).click()
        assert json.loads(pathlib.Path(download.value.path()).read_text())['recovery']['raw'] == '{future-version}'
        protected.close()
        browser.close()
      print('Timeline Desk browser journeys passed at 390 and 1280 pixels')
    finally:
      if server: server.terminate(); server.wait(timeout=5)

if __name__ == '__main__': run()
