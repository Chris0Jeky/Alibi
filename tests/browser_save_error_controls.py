"""Save conflicts freeze puzzle notes and an in-progress paint stroke."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HTML = (ROOT / 'alibi-deluxe-play.html').read_text(encoding='utf-8')
PUZZLES = json.loads((ROOT / 'content/catalog.json').read_text(encoding='utf-8'))['puzzles']


def check(value, label):
    assert value, label
    print('PASS', label, flush=True)


def open_play(page, kind):
    puzzle = next(item for item in PUZZLES if item['type'] == kind)
    page.evaluate('(route) => location.hash = "#/" + route', f'play/{puzzle["id"]}@{puzzle["revision"]}')
    page.wait_for_function('(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id', arg=puzzle['id'])
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')
        page.wait_for_function('!document.querySelector("dialog[open]")')


def conflict(page):
    page.evaluate('''() => {
      const channel = new BroadcastChannel('alibi-saves');
      channel.postMessage({ type: 'restored' });
      channel.close();
    }''')
    page.wait_for_function('() => (AlibiDiagnostics.getStatus().saveError || "").includes("restored")')


def center(locator):
    box = locator.bounding_box()
    return box['x'] + box['width'] / 2, box['y'] + box['height'] / 2


with sync_playwright() as p:
    browser = p.chromium.launch()
    errors = []
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page.set_default_timeout(8000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.set_content(HTML, wait_until='load')
    page.wait_for_function('window.AlibiDiagnostics')

    open_play(page, 'sudoku')
    page.locator('[data-action="evidence-tab"][data-value="notes"]').click()
    page.locator('#play-notes').fill('alpha')
    page.wait_for_function('() => AlibiDiagnostics.getCurrent().note === "alpha"')
    check(True, 'desktop notes change while the save is healthy')

    open_play(page, 'nonogram')
    before = page.evaluate('JSON.stringify(AlibiDiagnostics.getCurrent().state)')
    cells = page.locator('.paint-cell[data-cell]')
    page.mouse.move(*center(cells.nth(0)))
    page.mouse.down()
    mid = page.evaluate('JSON.stringify(AlibiDiagnostics.getCurrent().state)')
    check(mid != before, 'a paint stroke starts while the save is healthy')
    conflict(page)
    page.mouse.move(*center(cells.nth(1)))
    page.mouse.up()
    after = page.evaluate('JSON.stringify(AlibiDiagnostics.getCurrent().state)')
    page.locator('[data-action="evidence-tab"][data-value="notes"]').click()
    page.locator('#play-notes').fill('beta')
    page.wait_for_timeout(400)
    note = page.evaluate('AlibiDiagnostics.getCurrent().note')
    shown = page.locator('#play-notes').input_value()
    print('RESULT', 'board_same', after == before, 'note', repr(note), 'shown', repr(shown), flush=True)
    check(note == '' and shown == '', 'desktop notes stay unchanged after a save conflict')
    check(after == before, 'a stroke interrupted by a save conflict leaves the board unchanged')

    phone = browser.new_page(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True)
    phone.set_default_timeout(8000)
    phone.on('pageerror', lambda error: errors.append(str(error)))
    phone.set_content(HTML, wait_until='load')
    phone.wait_for_function('window.AlibiDiagnostics')
    open_play(phone, 'sudoku')
    phone.locator('[data-action="quick-panel"][data-value="notes"]').click()
    phone.locator('#quick-notes').fill('alpha')
    phone.wait_for_function('() => AlibiDiagnostics.getCurrent().note === "alpha"')
    check(True, 'phone notes change while the save is healthy')
    phone.keyboard.press('Escape')
    phone.wait_for_function('!document.querySelector("dialog[open]")')
    conflict(phone)
    phone.locator('[data-action="quick-panel"][data-value="notes"]').click()
    phone.locator('#quick-notes').fill('alpha beta')
    phone.wait_for_timeout(400)
    phone_note = phone.evaluate('AlibiDiagnostics.getCurrent().note')
    phone_shown = phone.locator('#quick-notes').input_value()
    check(phone_note == 'alpha' and phone_shown == 'alpha', 'phone notes stay unchanged after a save conflict, got ' + repr(phone_note) + ' shown ' + repr(phone_shown))
    check(not errors, 'no page errors' if not errors else 'page errors: ' + ' | '.join(errors))
    browser.close()
