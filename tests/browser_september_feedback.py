"""September feedback: actual scene taps, holds, undo and offline note restoration."""
import json, os, re
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'september-feedback'
OUT.mkdir(parents=True, exist_ok=True)
URL = os.environ.get('ALIBI_URL', 'http://127.0.0.1:8792')
puzzle = next(p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'scene')
free = [i for i in range(puzzle['size'] ** 2) if i not in [o['cell'] for o in puzzle['objects']]]
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for width in [390, 1440]:
        context = browser.new_context(viewport={'width': width, 'height': 900}, reduced_motion='reduce', has_touch=True)
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + '/#/play/' + puzzle['id'])
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        who, other = puzzle['people'][:2]
        cell, elsewhere = free[:2]
        target = page.locator(f'#cell-{cell}')
        def mode(value): page.locator(f'.toolrow [data-action="scene-mode"][data-value="{value}"]').click()
        def person(w): page.locator(f'[data-action="person"][data-id="{w["id"]}"]').click()
        def state(): return page.evaluate('AlibiDiagnostics.getCurrent().state')
        person(other)
        mode('candidate')
        target.tap()
        mode('exclude')
        target.tap()
        person(who)
        mode('candidate')
        page.locator(f'#cell-{elsewhere}').tap()
        mode('cycle')
        for tap in range(1, 8):
            target.tap()
            s = state()
            stage = (tap - 1) % 4
            assert (s['placements'].get(who['id']) == cell) == (stage == 0), (tap, s)
            assert other['id'] in s['candidates'][str(cell)]
            assert cell in s['notes'][other['id']]
            assert who['id'] in s['candidates'][str(elsewhere)]
            assert (cell in s.get('crosses', [])) == (stage == 3)
            expect(page.locator(f'[data-action="person"][data-id="{who["id"]}"]')).to_have_attribute('aria-pressed', 'true')
            label = page.locator(f'#cell-{elsewhere}').get_attribute('aria-label')
            assert ('candidates: ' + who['name'] in label) == (stage != 0), label
        before = state()
        page.locator('.main-tools [data-action="undo"]').click()
        assert who['id'] in state()['candidates'][str(cell)]
        page.locator('.main-tools [data-action="redo"]').click()
        assert state() == before
        # Hold opens the actual clear menu and release must not perform a tap.
        target.click(delay=650)
        expect(page.locator('dialog[open]')).to_contain_text('Square actions')
        assert state() == before
        page.get_by_role('button', name='Clear ' + who['name'] + ' here', exact=True).click()
        assert who['id'] not in state()['candidates'].get(str(cell), [])
        assert cell not in state()['notes'][who['id']]
        assert other['id'] in state()['candidates'][str(cell)]
        # Hold on a person exposes all actions and retains their identity.
        page.locator(f'[data-action="person"][data-id="{who["id"]}"]').click(delay=650)
        expect(page.locator('dialog[open]')).to_contain_text(who['name'] + ': marking tools')
        page.locator('dialog[open] [data-value="board-cross"]').click()
        # The hold suppression window must not swallow an intentional new tap.
        target.tap()
        assert cell in state().get('crosses', [])
        page.locator('[data-action="scene-cell-menu"]').click()
        page.get_by_role('button', name='Clear everything here', exact=True).click()
        assert str(cell) not in state()['candidates']
        assert cell not in state().get('crosses', [])
        assert cell not in state()['notes'][other['id']]
        assert state()['candidates'][str(elsewhere)] == [who['id']]
        expect(page.locator('#save-state')).to_contain_text('Saved on this device')
        page.wait_for_function('navigator.serviceWorker.controller !== null')
        context.set_offline(True)
        page.reload()
        expect(page.locator(f'#cell-{elsewhere}')).to_have_attribute('aria-label', re.compile('candidates: ' + who['name']))
        page.screenshot(path=str(OUT / f'scene-{width}.png'), full_page=True)
        context.set_offline(False)
        nonograms = [p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'nonogram']
        non, row, filled, blanks = next((p, r,
            [r*p['size']+c for c in range(p['size']) if p['solution'][r*p['size']+c] == 1],
            [r*p['size']+c for c in range(p['size']) if p['solution'][r*p['size']+c] == 0 and p['colClues'][c]])
            for p in nonograms for r in range(p['size'])
            if 0 < sum(p['solution'][r*p['size']:(r+1)*p['size']]) < p['size'] - 1
            and len([c for c in range(p['size']) if p['solution'][r*p['size']+c] == 0 and p['colClues'][c]]) >= 2)
        page.goto(URL + '/#/play/' + non['id'])
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        auto = page.locator('.controls [data-action="club-assist"]')
        expect(auto).to_contain_text('Auto-cross completed lines: off')
        auto.click()
        page.locator('[data-action="brush"][data-value="0"]').click()
        page.locator(f'#cell-{blanks[0]}').click()
        page.locator('[data-action="brush"][data-value="1"]').click()
        for i in filled: page.locator(f'#cell-{i}').click()
        derived = page.locator(f'#cell-{blanks[1]}')
        expect(derived).to_have_class(re.compile('derived-mark'))
        assert state()['cells'][blanks[1]] == -1, 'automatic crosses never overwrite saved manual cells'
        assert state()['cells'][blanks[0]] == 0
        page.locator('.main-tools [data-action="undo"]').click()
        expect(derived).not_to_have_class(re.compile('derived-mark'))
        assert state()['cells'][blanks[0]] == 0, 'manual cross survives changed premise'
        page.locator('.main-tools [data-action="redo"]').click()
        expect(derived).to_have_class(re.compile('derived-mark'))
        expect(page.locator('#save-state')).to_contain_text('Saved on this device')
        page.wait_for_function('AlibiClub.diagnostics().revision > 0')
        context.set_offline(True)
        page.reload()
        expect(derived).to_have_class(re.compile('derived-mark'))
        expect(auto).to_contain_text('Auto-cross completed lines: on')
        auto.click()
        expect(derived).not_to_have_class(re.compile('derived-mark'))
        assert state()['cells'][blanks[0]] == 0
        page.screenshot(path=str(OUT / f'nonogram-{width}.png'), full_page=True)
        context.set_offline(False)
        # Custom names are plain text even in newly generated action labels.
        other_scene = next(p for p in json.loads((ROOT / 'content/catalog.json').read_text())['puzzles'] if p['type'] == 'scene' and p['id'] != puzzle['id'])
        markup_name = '<b id="name-markup">J</b>'
        page.evaluate("arg => { ALIBI_CATALOG.puzzles.find(p => p.id === arg.id).people[0].name = arg.name; }", {'id': other_scene['id'], 'name': markup_name})
        page.evaluate("id => { location.hash = '#/play/' + id; }", other_scene['id'])
        expect(page.locator('.play-title')).to_contain_text(other_scene['title'])
        page.locator('[data-action="scene-cell-menu"]').click()
        expect(page.locator('dialog[open]')).to_contain_text('Clear ' + markup_name + ' here')
        expect(page.locator('#name-markup')).to_have_count(0)
        page.locator('dialog[open] [data-action="close-dialog"]').click()
        assert not errors, errors
        print(f'PASS scene cycle/notes/holds/undo/offline at {width}px', flush=True)
        context.close()
    browser.close()
