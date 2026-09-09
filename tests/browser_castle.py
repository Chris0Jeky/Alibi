"""Real-control Castle acceptance. Run against the built Alibi origin, not source fixtures."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUTPUT = Path('test-results/castle')
BASE = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8787/').split('#')[0]


def controls(page, width, output):
    checks = []
    def record(label):
        checks.append(label)
    def go(route):
        page.evaluate('(route) => { location.hash = "#/quiet/castle/" + route; }', route)
        titles = {'map': 'Wrenmere Castle', 'museum': 'The Museum of Questions',
                  'journal': 'Castle notebook', 'directory': 'Room directory',
                  'gatehouse': 'The Gatehouse', 'library': 'The Long Library',
                  'observatory': 'The Observatory', 'cartography': 'The Map Room',
                  'study': 'The Keeper’s Study', 'west-stair': 'The Unrecorded Stair',
                  'orangery': 'The Glass Orangery', 'workshop': 'The Clockmaker’s Workshop'}
        expect(page.locator('#castle-main h1')).to_have_text(titles[route.split('/')[-1]])
    def click(action, value=None):
        selector = f'[data-do="{action}"]'
        if value is not None:
            selector += f'[data-value="{value}"]'
        page.locator(selector).first.click()
    def puzzle(room):
        go('room/' + room)
        click('puzzle')
        expect(page.locator('#castle-dialog')).to_be_visible()
    def check(total):
        click('check')
        expect(page.locator('.score')).to_have_text(f'{total} / 100 points')
        record(f'{total // 10}: completion recorded through controls')
        click('close')
    def swap_to(target):
        for i, item in enumerate(target):
            values = page.locator('#board [data-do="swap"]').all_text_contents()
            if values[i].strip() != str(item):
                j = next(j for j in range(i + 1, len(values)) if values[j].strip() == str(item))
                click('swap', i)
                expect(page.locator(f'[data-do="swap"][data-value="{i}"]')).to_have_attribute('aria-pressed', 'true')
                click('swap', j)
    go('map')
    assert page.locator('[data-do="select"]').count() == 9
    record('secret stair absent before its deduction')
    click('visit', 'observatory')
    expect(page.locator('#castle-dialog')).to_contain_text('maintenance slip')
    click('close')
    puzzle('gatehouse')
    click('check')
    expect(page.locator('.score')).to_have_text('0 / 100 points')
    record('incorrect board receives no points')
    for i, value in enumerate([1, 3, 5]):
        page.locator(f'[data-wheel="{i}"]').select_option(str(value))
    check(10)
    expect(page.locator('[data-do="puzzle"]')).to_be_focused()
    record('closing puzzle restores its launch control')
    puzzle('library')
    swap_to(['atlas', 'tides', 'stars', 'moss', 'letters'])
    check(20)
    puzzle('observatory')
    page.locator('#clock-answer').fill('21:00')
    check(30)
    puzzle('cartography')
    for node in ['B', 'O', 'T']:
        click('route', node)
    click('undo')
    expect(page.locator('#board')).to_contain_text('5 minutes')
    click('route', 'T')
    check(40)
    puzzle('study')
    click('inference', 'definitely-present')
    click('check')
    expect(page.locator('#feedback')).to_contain_text('actually places Finch')
    click('inference', 'possible-not-proven')
    check(50)
    go('map')
    assert page.locator('[data-do="select"]').count() == 10
    click('visit', 'west-stair')
    click('resolution')
    expect(page.locator('#castle-dialog')).to_contain_text('unsigned')
    click('close')
    record('chapter opens stair and preserves testimony uncertainty')
    puzzle('orangery')
    for tile in [0, 4, 8]:
        click('lamp', tile)
    check(60)
    puzzle('workshop')
    for source, target in [(0, 2), (0, 1), (2, 1), (0, 2), (1, 0), (1, 2), (0, 2)]:
        click('peg', source)
        click('peg', target)
    check(70)
    go('museum')
    click('exhibit', 'bridges')
    expect(page.locator('#castle-dialog')).to_contain_text('Euler')
    click('puzzle', 'bridges')
    click('river-start', 'N')
    click('river', 0)
    expect(page.locator('#board')).to_contain_text('Used 1 / 7')
    for node in ['N', 'S', 'I', 'E']:
        click('odd', node)
    click('verdict', 'impossible')
    check(80)
    click('exhibit', 'magic')
    click('puzzle', 'magic')
    swap_to([4, 9, 2, 3, 5, 7, 8, 1, 6])
    check(90)
    click('exhibit', 'ur')
    expect(page.locator('#castle-dialog')).to_contain_text('modern fair-dice model')
    click('puzzle', 'ur')
    assert page.locator('.patterns > span').count() == 16
    click('ur', 2)
    check(100)
    puzzle('gatehouse')
    click('reveal')
    expect(page.locator('#feedback')).to_contain_text('records guided play')
    click('confirm-reveal')
    click('check')
    expect(page.locator('.score')).to_have_text('100 / 100 points')
    click('close')
    record('worked answer explicit; replay cannot duplicate points')
    go('room/library')
    click('object', 'library-pencil')
    click('keep-observation', 'library-pencil')
    click('keep-observation', 'library-pencil')
    expect(page.locator('#observation-result')).to_contain_text('already in your notebook')
    click('close')
    expect(page.locator('[data-do="object"]')).to_be_focused()
    go('journal')
    expect(page.locator('#notes')).to_contain_text('A pencilled correction')
    record('optional observations copy once and restore focus')
    note = '<img src=x onerror=alert(1)> Keep this as text.'
    page.locator('#notes').fill(note)
    go('map')
    go('journal')
    expect(page.locator('#notes')).to_have_value(note)
    assert page.locator('.evidence').count() == 4
    assert page.locator('#castle-main img').count() == 0
    record('notebook retains literal text and four earned records')
    go('directory')
    expect(page.locator('#results-count')).to_have_text('32 rooms')
    page.locator('#search').fill('rookery')
    expect(page.locator('#results-count')).to_have_text('1 rooms')
    expect(page.locator('#room-results')).to_contain_text('Planned room')
    assert page.locator('#room-results button').count() == 0
    record('planned content is searchable but has no fictitious unlock')
    go('map')
    click('preferences')
    page.locator('[data-pref="motion"]').uncheck()
    page.locator('[data-pref="story"]').uncheck()
    click('close')
    expect(page.locator('.rail')).to_contain_text('story introductions hidden')
    host = page.locator('#castle-main').evaluate('(el) => el.getRootNode().host.dataset.reduced')
    assert host == 'true'
    record('motion and story preferences affect actual view')
    click('film')
    click('film-next')
    expect(page.locator('#film-progress')).to_have_text('2 / 4')
    click('close')
    record('interlude has manual controls and no compulsory playback')
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
    page.screenshot(path=str(output / f'castle-{width}.png'), full_page=True)
    record('viewport has no horizontal overflow')
    return checks, note


def persistent(page, context, base, note):
    checks = []
    page.evaluate('() => AlibiCastle.flush()')
    page.reload()
    page.wait_for_function('globalThis.AlibiCastle?.diagnostics().mode === "local"')
    page.evaluate('location.hash = "#/quiet/castle/journal"')
    expect(page.locator('#notes')).to_have_value(note)
    expect(page.locator('.score')).to_have_text('100 / 100 points')
    checks.append('real IndexedDB retains completed chapter and notes after reload')
    other = context.new_page()
    other.goto(base + '#/quiet/castle/journal')
    other.wait_for_function('globalThis.AlibiCastle?.diagnostics().mode === "local"')
    page.locator('#notes').fill('First tab committed this.')
    page.evaluate('() => AlibiCastle.flush()')
    other.locator('#notes').fill('Second tab must retain this without overwriting.')
    other.wait_for_function('AlibiCastle.diagnostics().mode === "protected"')
    expect(other.locator('#notes')).to_have_value('Second tab must retain this without overwriting.')
    page.reload()
    expect(page.locator('#notes')).to_have_value('First tab committed this.')
    checks.append('stale tab is protected; committed and unsaved text both retained')
    other.close()
    if page.evaluate('!!navigator.serviceWorker.controller'):
        page.wait_for_function('globalThis.AlibiActivities?.diagnostics().offline === true')
        context.set_offline(True)
        page.reload()
        expect(page.locator('#notes')).to_have_value('First tab committed this.')
        context.set_offline(False)
        checks.append('root service worker serves castle activity and saved notebook offline')
    else:
        raise AssertionError('A controlling root service worker is required for this origin suite.')
    return checks


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = {'scope': 'built-origin', 'base': BASE, 'passed': False, 'checks': []}
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch()
            for width in [390, 1280]:
                context = browser.new_context(viewport={'width': width, 'height': 900})
                page = context.new_page()
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(BASE + '#/quiet/castle/map')
                page.wait_for_function('globalThis.AlibiCastle?.diagnostics().mode === "local"')
                checks, note = controls(page, width, OUTPUT)
                checks += persistent(page, context, BASE, note)
                assert not errors, errors
                report['checks'].append({'width': width, 'checks': checks})
                context.close()
            browser.close()
        report['passed'] = True
    finally:
        (OUTPUT / 'acceptance.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report))


if __name__ == '__main__':
    main()
