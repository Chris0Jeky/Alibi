"""Keyboard help visibility and accessibility under Chromium input media profiles."""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
HELP = 'Keyboard: arrows move, Enter selects.'
CSS = (ROOT / 'src/app.css').read_text(encoding='utf-8')
with sync_playwright() as p:
    browser = p.chromium.launch()
    for name, touch, clipped in (('touch-only', True, True), ('desktop', False, False)):
        context = browser.new_context(viewport={'width': 800, 'height': 600}, is_mobile=touch, has_touch=touch)
        page = context.new_page()
        page.set_content('<style>' + CSS + '</style><p class="control-note">Tap to select. <span class="kb">' + HELP + '</span></p><p class="control-note kb">' + HELP + '</p>')
        cdp = context.new_cdp_session(page)
        assert page.evaluate('matchMedia("(pointer: coarse)").matches') == touch, name
        assert page.evaluate('matchMedia("(any-pointer: fine)").matches') != touch, name
        measures = page.locator('.kb').evaluate_all('els => els.map(el => ({width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, display: getComputedStyle(el).display, clip: getComputedStyle(el).clip}))')
        for m in measures:
            assert m['display'] != 'none', (name, m)
            if clipped:
                assert m['width'] == 1 and m['height'] == 1 and m['clip'] != 'auto', (name, m)
            else:
                assert m['width'] > 20 and m['height'] > 5 and m['clip'] == 'auto', (name, m)
        tree = cdp.send('Accessibility.getFullAXTree')['nodes']
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), name
        assert sum(HELP in node.get('name', {}).get('value', '') for node in tree if not node.get('ignored')) >= 2, name
        print('PASS', name, 'geometry and accessibility')
        page.add_style_tag(content='.kb { display: none !important; }')
        tree = cdp.send('Accessibility.getFullAXTree')['nodes']
        assert not any(HELP in n.get('name', {}).get('value', '') for n in tree if not n.get('ignored')), 'negative control detects original regression'
        print('PASS', name, 'display:none negative control')
        context.close()
    browser.close()
