"""Fresh headless phone/desktop icon and navigation QA; no physical-device claim."""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
MASTERS = json.loads((ROOT / 'assets-source/library/club-pictograms/pictograms.json').read_text())
MASTERS = {name: re.sub(r'<path d="([^"]*)"/><path d="([^"]*)"/>', r'<path d="\1 \2"/>', value) for name, value in MASTERS.items()}
OUT = ROOT / 'test-results/club-pictograms'
OUT.mkdir(parents=True, exist_ok=True)
checks = 0

with sync_playwright() as pw:
    launch = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        launch['executable_path'] = os.environ['CHROMIUM_PATH']
    browser = pw.chromium.launch(**launch)
    for label, width, height in [('phone', 390, 844), ('desktop', 1440, 1000)]:
        context = browser.new_context(viewport={'width': width, 'height': height}, reduced_motion='reduce')
        context.route('**/*', lambda route: route.abort())
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content((ROOT / 'alibi-deluxe-play.html').read_text(encoding='utf-8'), wait_until='load')
        page.wait_for_function('globalThis.AlibiDiagnostics')
        page.wait_for_selector('.main')
        navigation = '.mobile-nav' if label == 'phone' else '.sidebar'
        for name, destination, icon, identity in [
            ('Desk', 'home', 'home', ''),
            ('Puzzles', 'library', 'library', ''),
            ('Cases', 'casebooks', 'book', ''),
            ('Games', 'salon', 'table', ''),
            ('Wing', 'quiet', 'quiet', ''),
            ('Castle', 'quiet', 'castle', 'castle'),
        ]:
            # Quiet Wing owns its own navigation after entry; inspect each shell destination from Desk.
            page.evaluate('location.hash = "#/home"')
            page.wait_for_selector(navigation, state='visible')
            button = page.locator(f'{navigation} button[data-action="navigate"][data-page="{destination}"][data-id="{identity}"]').first
            if not button.count() and not identity:
                button = page.locator(f'{navigation} button[data-action="navigate"][data-page="{destination}"]').first
            assert button.is_visible(), (label, name)
            expected = page.evaluate('fragment => {const e=document.createElement("div");e.innerHTML="<svg>"+fragment+"</svg>";return e.firstChild.innerHTML}', MASTERS[icon])
            assert button.locator('svg').evaluate('(e) => e.innerHTML') == expected, (label, name, 'master')
            assert button.locator('svg').get_attribute('aria-hidden') == 'true'
            assert button.get_attribute('aria-label')
            button.click()
            page.wait_for_function('(destination) => location.hash.startsWith("#/" + destination)', arg=destination)
            page.wait_for_timeout(350)
            checks += 4
            if name in ['Desk', 'Puzzles', 'Games']:
                page.screenshot(path=str(OUT / f'{label}-{destination}.png'))
        # All family icons remain mapped to their matching, uniquely named family.
        assert page.evaluate('Object.entries(AlibiUI.data).every(([type, meta]) => type === meta.icon)')
        assert not errors, errors
        checks += 2
        context.close()
    browser.close()
print(f'PASS {checks} club pictogram checks; fresh phone/desktop screenshots in {OUT}')
