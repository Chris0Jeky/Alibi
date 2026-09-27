"""Chapter I guidance acceptance: walk the chapter through real controls, phone and desktop.

Runs against the built origin (ALIBI_URL, default http://127.0.0.1:8787/). Covers the
keeper's letter, thread placement and links, locked-door links, the clock time formats,
the derived completion state after reload and import, the grouped directory, the hidden
quiet bar, touch-target sizes and blank-hypothesis protection. No physical-device claim.
"""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').split('#')[0]
OUTPUT = Path(os.environ.get('ALIBI_RESULTS', 'test-results')) / 'castle-chapter'
DEVICES = {
    'phone': dict(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True,
                  device_scale_factor=2),
    'desktop': dict(viewport={'width': 1280, 'height': 800}),
}
COMPLETE = 'Chapter I complete · Extra questions 0/5'


def walk(page, kind, checks):
    dialog = page.locator('#castle-dialog')
    feedback = page.locator('#feedback')

    def shot(name):
        page.screenshot(path=str(OUTPUT / f'{kind}-{name}.png'))

    def no_overflow(where):
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), where

    def open_puzzle():
        page.locator('.rail [data-do="puzzle"]').click()
        expect(dialog).to_be_visible()

    def check():
        dialog.locator('[data-do="check"]').click()

    def follow(room, title):
        feedback.locator(f'[data-do="visit"][data-value="{room}"]').click()
        expect(dialog).not_to_be_visible()
        expect(page.locator('#castle-main h1')).to_have_text(title)

    page.goto(BASE + '#/quiet/castle/map')
    expect(dialog).to_contain_text('The keeper’s letter')
    expect(dialog.locator('.close')).to_be_focused()
    shot('01-letter')
    page.keyboard.press('Escape')
    expect(page.locator('#castle-main')).to_be_focused()
    expect(page.locator('.rail h2')).to_have_text('The Long Library')
    guide = page.locator('.thread-guide').bounding_box()
    assert guide['y'] < page.locator('.map-scroll').bounding_box()['y']
    assert guide['y'] + guide['height'] <= DEVICES[kind]['viewport']['height'], guide
    assert page.locator('#quiet-room-choice').count() == 0
    expect(page.locator('.score')).to_have_text('Chapter I 0/5 · Extra questions 0/5')
    no_overflow('grounds')
    shot('02-grounds-start')
    checks.append('letter opens first; thread above the map in the first viewport; thread room preselected; no quiet room bar')

    page.locator('.thread-guide [data-do="visit"][data-value="library"]').click()
    expect(page.locator('#castle-main h1')).to_have_text('The Long Library')
    open_puzzle()
    target = ['atlas', 'tides', 'stars', 'moss', 'letters']
    for i, item in enumerate(target):
        values = [v.strip() for v in page.locator('#board [data-do="swap"]').all_text_contents()]
        if values[i] != item:
            j = values.index(item)
            page.locator(f'#board [data-do="swap"][data-value="{i}"]').click()
            page.locator(f'#board [data-do="swap"][data-value="{j}"]').click()
    check()
    expect(feedback).to_contain_text('The Observatory is now open')
    follow('observatory', 'The Observatory')
    checks.append('library success links straight to the room it opened')

    open_puzzle()
    answer = page.locator('#clock-answer')
    expect(answer).to_have_attribute('enterkeyhint', 'go')
    answer.fill('21')
    check()
    expect(feedback).to_contain_text('four digits, such as 21:17 or 2117')
    answer = page.locator('#clock-answer')
    answer.fill('0900')
    answer.press('Enter')
    expect(feedback).to_contain_text('09:00 is in the morning')
    expect(page.locator('#clock-answer')).to_be_focused()
    page.locator('#clock-answer').fill('2134')
    page.locator('#clock-answer').press('Enter')
    expect(feedback).to_contain_text('21:34 does not match')
    clipped = dialog.locator('.actions button').evaluate_all(
        '(nodes) => nodes.filter((n) => n.scrollWidth > n.clientWidth + 1).map((n) => n.textContent)')
    assert not clipped, clipped
    shot('03-clock-feedback')
    page.locator('#clock-answer').fill('2100' if kind == 'phone' else '21.00')
    page.locator('#clock-answer').press('Enter')
    expect(feedback).to_contain_text('21:00. The ticket predates')
    expect(page.locator('.score')).to_have_text('Chapter I 2/5 · Extra questions 0/5')
    stored = page.evaluate('() => AlibiCastle.exportBackup()')['state']['completed']['clock']
    assert stored['answer'] == '21:00', stored
    expect(feedback.locator('[data-value="gatehouse"]')).to_be_visible()
    expect(feedback.locator('[data-value="museum"]')).to_be_visible()
    checks.append('clock gives format-specific feedback, Enter submits, 2100/21.00 stored as 21:00')

    page.keyboard.press('Escape')
    page.evaluate('location.hash = "#/quiet/castle/directory"')
    page.locator('#room-results [data-do="visit"][data-value="study"]').click()
    expect(dialog).to_contain_text('Correct the ticket in the Observatory')
    dialog.locator('[data-do="visit"][data-value="cartography"]').click()
    expect(dialog.locator('h2')).to_have_text('The Map Room')
    expect(dialog.locator('[data-do="visit"][data-value="gatehouse"]')).to_be_visible()
    page.keyboard.press('Escape')
    page.evaluate('location.hash = "#/quiet/castle/map"')
    expect(page.locator('.thread-guide')).to_contain_text('Open the Map Room')
    assert page.locator('.thread-guide [data-value="cartography"]').count() == 0
    pin = page.locator('[data-do="select"][data-value="cartography"]')
    expect(pin).to_have_class('pin locked')
    expect(pin).to_have_attribute('aria-label', 'The Map Room, locked, clue required')
    pin.click()
    rail = page.locator('.rail')
    expect(rail.locator('.status')).to_contain_text('Locked. Solve the Gatehouse lock')
    expect(rail).not_to_contain_text('Enter room')
    rail.scroll_into_view_if_needed()
    shot('04-locked-panel')
    rail.locator('[data-do="visit"][data-value="gatehouse"]').click()
    expect(page.locator('#castle-main h1')).to_have_text('The Gatehouse')
    checks.append('locked dialogs chain to the rooms that open them; thread avoids the locked Map Room; locked pin and panel')

    open_puzzle()
    for i, value in enumerate([1, 3, 5]):
        page.locator(f'[data-wheel="{i}"]').select_option(str(value))
    check()
    expect(feedback).to_contain_text('The Map Room, beyond the Long Library, is now open')
    follow('cartography', 'The Map Room')
    open_puzzle()
    for node in ['B', 'O', 'T']:
        dialog.locator(f'[data-do="route"][data-value="{node}"]').click()
    check()
    follow('study', 'The Keeper’s Study')
    open_puzzle()
    dialog.locator('[data-do="inference"][data-value="possible-not-proven"]').click()
    check()
    expect(feedback).to_contain_text('the Unrecorded Stair is open')
    expect(page.locator('.score')).to_have_text(COMPLETE)
    follow('west-stair', 'The Unrecorded Stair')
    expect(page.locator('.rail .status')).to_have_text('Chapter I complete')
    page.locator('.rail [data-do="resolution"]').click()
    expect(dialog).to_contain_text('Chapter I complete.')
    page.keyboard.press('Escape')
    checks.append('Chapter I walked to the margin through unlock links and real controls')

    def completed(where):
        expect(page.locator('.score')).to_have_text(COMPLETE)
        page.evaluate('location.hash = "#/quiet/castle/map"')
        expect(page.locator('.chapter-mark')).to_have_text('✓ Chapter I complete')
        expect(page.locator('.thread-guide')).to_contain_text('Chapter I complete.')
        expect(page.locator('.thread-guide')).to_contain_text('0 / 5 extra questions answered')
        stair = page.locator('[data-do="select"][data-value="west-stair"]')
        expect(stair).to_have_class('pin completed')
        expect(stair).to_have_text('09✓')
        expect(stair).to_have_attribute('aria-label', 'The Unrecorded Stair, solved')
        expect(page.locator('.rail h2')).to_have_text('The Unrecorded Stair')
        assert not dialog.is_visible(), where

    completed('after the margin')
    no_overflow('grounds complete')
    page.evaluate('window.scrollTo(0, 0)')
    shot('05-grounds-complete')
    page.evaluate('() => AlibiCastle.flush()')
    page.reload()
    page.wait_for_function('() => globalThis.AlibiCastle?.diagnostics().mode === "local"')
    completed('after reload')
    checks.append('completion is derived and persistent: header, grounds mark, thread, stair pin after reload')

    page.evaluate('location.hash = "#/quiet/castle/directory"')
    expect(page.locator('#results-count')).to_have_text('10 rooms to visit · 22 planned')
    expect(page.locator('.later-rooms .card').first).to_be_hidden()
    page.locator('.later-rooms summary').click()
    expect(page.locator('.later-rooms .card').first).to_be_visible()
    no_overflow('directory')
    checks.append('directory lists rooms to visit first; later chapters collapsed')

    page.evaluate('location.hash = "#/quiet/castle/journal"')
    margin = page.locator('[data-record-id="margin"] a')
    expect(margin).to_have_attribute('href', '#/quiet/castle/room/west-stair')
    small = []
    for selector in ['header nav a', 'footer a', '.evidence a']:
        for box in page.locator(selector).evaluate_all(
                '(nodes) => nodes.map((n) => { const r = n.getBoundingClientRect(); return [n.textContent, r.height]; })'):
            if box[1] < 44:
                small.append((selector, box))
    assert not small, small
    page.locator('[data-do="theory-edit"]').click()
    page.locator('#theory-position').select_option('supported')
    page.locator('[data-citation][value="ticket"]').check()
    page.locator('#theory-text').fill('   ')
    dialog.locator('[data-do="theory-save"]').click()
    expect(page.locator('#theory-text')).to_be_focused()
    assert page.locator('#theory-text').evaluate('(t) => t.validationMessage') == 'Write the hypothesis before saving.'
    expect(dialog).not_to_contain_text('Notebook needs attention')
    expect(page.locator('#theory-position')).to_have_value('supported')
    expect(page.locator('[data-citation][value="ticket"]')).to_be_checked()
    page.locator('#theory-text').fill('The ticket dates a departure, not an arrival.')
    dialog.locator('[data-do="theory-save"]').click()
    expect(page.locator('.theory-board')).to_contain_text('The ticket dates a departure')
    no_overflow('notebook')
    checks.append('margin links to the stair; 44px notebook links; a blank hypothesis keeps its draft')

    page.evaluate('location.hash = "#/quiet/castle/museum"')
    page.locator('[data-do="puzzle"][data-value="bridges"]').click()
    for button in dialog.locator('[data-do="odd"], [data-do="river-start"]').all():
        box = button.bounding_box()
        assert box['width'] >= 44 and box['height'] >= 44, box
    page.keyboard.press('Escape')
    checks.append('Bridges area buttons meet 44px')
    return page.evaluate('() => AlibiCastle.exportBackup()')


def imported(page, backup, kind, checks):
    page.goto(BASE + '#/quiet/castle/journal')
    page.wait_for_function('() => globalThis.AlibiCastle?.diagnostics().mode === "local"')
    backup['state']['notes'] = ''
    page.locator('#castle-import').set_input_files({
        'name': 'chapter.json', 'mimeType': 'application/json',
        'buffer': json.dumps(backup).encode()})
    page.locator('[data-do="restore-merge"]').click()
    expect(page.locator('#castle-live')).to_contain_text('The file had no notes to add')
    expect(page.locator('.score')).to_have_text(COMPLETE)
    page.evaluate('location.hash = "#/quiet/castle/map"')
    expect(page.locator('#castle-dialog')).not_to_be_visible()
    expect(page.locator('.chapter-mark')).to_have_text('✓ Chapter I complete')
    checks.append('an imported completed chapter renders complete; no letter; merge message matches empty notes')


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = {'scope': 'built-origin', 'base': BASE, 'passed': False, 'checks': []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for kind, options in DEVICES.items():
                checks = []
                context = browser.new_context(**options)
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                backup = walk(page, kind, checks)
                context.close()
                context = browser.new_context(**options)
                page = context.new_page()
                page.on('pageerror', lambda error: errors.append(str(error)))
                imported(page, backup, kind, checks)
                context.close()
                assert not errors, errors
                report['checks'].append({'device': kind, 'checks': checks})
            browser.close()
        report['passed'] = True
    finally:
        (OUTPUT / 'acceptance.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    main()
