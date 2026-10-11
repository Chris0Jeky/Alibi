"""Rendered keyboard help and actual controls in isolated Chromium pages."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/keyboard-help'
OUT.mkdir(parents=True, exist_ok=True)
PUZZLES = json.loads((ROOT / 'content/catalog.json').read_text(encoding='utf-8'))['puzzles']
HTML = (ROOT / 'alibi-deluxe-play.html').read_text(encoding='utf-8')
checks = []
errors = []

def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)

def accessible_names(cdp):
    return [node.get('name', {}).get('value', '')
            for node in cdp.send('Accessibility.getFullAXTree')['nodes']
            if not node.get('ignored')]

with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, width, touch in (('touch-only', 390, True), ('desktop', 1280, False)):
        context = browser.new_context(viewport={'width': width, 'height': 900}, is_mobile=touch, has_touch=touch, reduced_motion='reduce')
        page = context.new_page()
        page.set_default_timeout(5000)
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(HTML, wait_until='load')
        page.wait_for_function('window.AlibiDiagnostics')
        cdp = context.new_cdp_session(page)
        check(page.evaluate('matchMedia("(pointer: coarse)").matches') == touch, name + ' pointer profile')
        check(page.evaluate('matchMedia("(any-pointer: fine)").matches') != touch, name + ' fine-pointer profile')
        for family in ('bridges', 'network'):
            puzzle = next(puzzle for puzzle in PUZZLES if puzzle['type'] == family)
            page.evaluate('(route) => location.hash = "#/" + route', f'play/{puzzle["id"]}@{puzzle["revision"]}')
            page.wait_for_function('(id) => AlibiDiagnostics.getCurrent()?.puzzle.id === id', arg=puzzle['id'])
            if page.locator('dialog[open]').count():
                page.keyboard.press('Escape')
                page.wait_for_function('!document.querySelector("dialog[open]")')
            hints = page.locator('.control-note .kb' if family == 'bridges' else '.control-note.kb')
            check(hints.count() == 1, name + ' ' + family + ' rendered guidance')
            text = hints.inner_text().strip()
            measure = hints.evaluate('el => ({width: el.getBoundingClientRect().width, display: getComputedStyle(el).display, clip: getComputedStyle(el).clipPath})')
            check(measure['display'] != 'none' and measure['clip'] == ('inset(50%)' if touch else 'none'), name + ' ' + family + ' clipping')
            if not touch:
                check(measure['width'] > 20, name + ' ' + family + ' visible desktop guidance')
            check(any(text in value for value in accessible_names(cdp)), name + ' ' + family + ' accessible guidance')
            check(page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name + ' ' + family + ' no overflow')
            page.screenshot(path=str(OUT / f'{name}-{family}.png'), full_page=True)
            negative = page.add_style_tag(content='.kb { display: none !important; }')
            check(not any(text in value for value in accessible_names(cdp)), name + ' ' + family + ' display:none negative control')
            negative.evaluate('el => el.remove()')
            if family == 'network':
                unlocked = [cell for cell in range(puzzle['size'] ** 2) if cell not in puzzle['locked']]
                start = next(cell for cell in unlocked if any(other > cell for other in unlocked))
                page.locator(f'#cell-{start}').click()
                page.keyboard.press('ArrowRight')
                selected = page.evaluate('Number(document.activeElement.dataset.cell)')
                check(selected == next(cell for cell in unlocked if cell > start), name + ' ArrowRight selects next tile')
                before = page.evaluate('(cell) => AlibiDiagnostics.getCurrent().state.rotations[cell]', selected)
                page.keyboard.press('Enter')
                check(page.evaluate('(cell) => AlibiDiagnostics.getCurrent().state.rotations[cell]', selected) == (before + 1) % 4, name + ' Enter turns clockwise')
                page.keyboard.press('Shift+Enter')
                check(page.evaluate('(cell) => AlibiDiagnostics.getCurrent().state.rotations[cell]', selected) == before, name + ' Shift+Enter turns anticlockwise')
        context.close()
    browser.close()
check(not errors, 'no page errors')
(OUT / 'results.json').write_text(json.dumps({'checks': checks, 'errors': errors}, indent=2), encoding='utf-8')
