"""Actual Aquarium Hint controls, called by the existing Expert Aquarium gate."""
from pathlib import Path

from playwright.sync_api import expect

OUT = Path(__file__).resolve().parents[1] / 'test-results'


def current(page):
    return page.evaluate('AlibiDiagnostics.getCurrent()')


def action(page, name):
    page.locator(f'[data-action="{name}"]:visible').first.click()


def unchanged(page, before):
    after = current(page)
    for field in ('state', 'undo', 'redo', 'moves', 'hints', 'completedAt', 'firstCompletedAt'):
        assert after.get(field) == before.get(field), f'Hint changed {field}'


def open_run(page, key):
    page.evaluate('(key) => { location.hash = "/play/" + key; }', key)
    page.wait_for_function('(key) => AlibiDiagnostics.getCurrent()?.key === key', arg=key)
    if page.locator('dialog[open]').count():
        page.keyboard.press('Escape')


def hint(page):
    button = page.locator('[data-action="hint"]:visible').first
    button.focus()
    button.press('Enter')
    dialog = page.locator('dialog[open]')
    expect(dialog.locator('#dialog-title')).to_be_focused()
    return dialog, button


def tank_cell(puzzle, tank, level):
    rows = sorted({i // puzzle['size'] for i, t in enumerate(puzzle['tanks']) if t == tank}, reverse=True)
    return next(i for i, t in enumerate(puzzle['tanks']) if t == tank and i // puzzle['size'] == rows[level - 1])


def trap_answer(page):
    # Run the shipped deduction behind a getter trap, without replacing its result.
    page.evaluate('''() => {
      const load = AlibiCore.loadInsights;
      let wrapped = false;
      AlibiCore.loadInsights = async () => {
        const insights = await load();
        if (!wrapped) {
          const deduction = insights.deduction;
          insights.deduction = (p, s) => {
            const publicPuzzle = new Proxy(p, {get(target, key) {
              if (key === 'solution') throw Error('Hint read the hidden answer');
              return target[key];
            }});
            return window.aquariumHint = deduction(publicPuzzle, s);
          };
          wrapped = true;
        }
        return insights;
      };
    }''')


def seed_ambiguous(page, template):
    puzzle = {**template, 'id': 'hint-ambiguous-fixture', 'revision': 1,
              'title': 'Two possible waterlines', 'size': 3,
              'tanks': [0, 1, 2, 3, 4, 2, 5, 5, 2],
              'rowTargets': [1, 1, 0], 'colTargets': [1, 1, 0],
              'solution': [1, 0, 0, 0, 1, 0]}
    run = {'schemaVersion': 1, 'key': puzzle['id'] + '@1', 'rev': 0,
           'puzzle': puzzle, 'state': {'levels': [0] * 6, 'notes': {}},
           'undo': [], 'redo': [], 'moves': 0, 'hints': 0, 'elapsed': 0,
           'completedAt': None, 'firstCompletedAt': None, 'note': '',
           'updatedAt': '2026-10-29T00:00:00.000Z'}
    page.evaluate('''(run) => new Promise((resolve, reject) => {
      AlibiCore.validateDefinition(run.puzzle);
      const request = indexedDB.open('alibi-device');
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('runs', 'readwrite');
        tx.objectStore('runs').put({key: run.key, value: run});
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
    })''', run)
    return run['key']


def run_hint_journeys(browser, base, width, standard, expert, check):
    OUT.mkdir(parents=True, exist_ok=True)
    context = browser.new_context(viewport={'width': width, 'height': 950}, reduced_motion='reduce')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(base)
        page.wait_for_function('() => navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        assert page.evaluate('!AlibiCore.insights')
        trap_answer(page)
        # The first request must work from the precached shell, with no network.
        context.set_offline(True)
        for puzzle, tank, level in [(standard, 0, 1), (expert, 1, 1)]:
            key = f"{puzzle['id']}@{puzzle['revision']}"
            open_run(page, key)
            before = current(page)
            labels = page.locator('.water-cell').evaluate_all('(cells) => cells.map(c => c.ariaLabel)')
            dialog, button = hint(page)
            assert page.locator('script[src*="/insights."]').count() == 1
            expect(dialog.locator('.deduction-title')).to_have_text('A forced waterline')
            expect(dialog.locator('.hint-box')).to_contain_text('other tanks')
            expect(dialog.locator('.hint-box')).to_contain_text('Fill its bottom row')
            expect(dialog).to_contain_text('only the public clues')
            guidance = page.evaluate('aquariumHint')
            assert (guidance['tank'], guidance['level']) == (tank, level)
            assert 'value' not in guidance
            expected_cells = [i for i, t in enumerate(puzzle['tanks']) if t == tank]
            marked = page.locator('.water-cell.hint-focus').evaluate_all('(cells) => cells.map(c => +c.dataset.cell)')
            assert marked == expected_cells
            marked_clues = page.locator('.axis.hint-focus').evaluate_all(
                '(clues) => clues.map(c => ({axis:+c.dataset.clueAxis, line:+c.dataset.clueLine}))')
            assert sorted(marked_clues, key=lambda c: (c['axis'], c['line'])) == guidance['clues']
            unchanged(page, before)
            assert page.locator('.water-cell').evaluate_all('(cells) => cells.map(c => c.ariaLabel)') == labels
            box = dialog.bounding_box()
            assert box['x'] >= 0 and box['x'] + box['width'] <= width + 1
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            page.screenshot(path=str(OUT / f'aquarium-hint-{width}-{puzzle["id"]}-hint.png'), full_page=True)
            dialog.get_by_role('button', name='Keep thinking', exact=True).focus()
            page.keyboard.press('Enter')
            expect(button).to_be_focused()
            expect(dialog).not_to_be_visible()
            assert page.locator('.water-cell.hint-focus').count() == len(expected_cells)
            assert page.locator('.water-cell.hint-focus').first.evaluate(
                'el => getComputedStyle(el).outlineStyle') == 'dashed'
            page.screenshot(path=str(OUT / f'aquarium-hint-{width}-{puzzle["id"]}-board.png'), full_page=True)

            # Reading the explanation never moves water; the player uses the real control.
            target = page.locator(f'#cell-{tank_cell(puzzle, tank, level)}')
            target.focus()
            target.press('Enter')
            page.wait_for_function('([tank, level]) => AlibiDiagnostics.getCurrent().state.levels[tank] === level', arg=[tank, level])
            assert current(page)['hints'] == before['hints']
            assert page.locator('.hint-focus').count() == 0
            action(page, 'undo')
            assert current(page)['state'] == before['state']

            # An intentionally overfilled zero row must produce a conflict first.
            row = puzzle['rowTargets'].index(0)
            page.locator(f'#cell-{row * puzzle["size"]}').click()
            mistaken = current(page)
            dialog, button = hint(page)
            expect(dialog.locator('.deduction-title')).to_have_text('Revisit a conflict')
            expect(dialog.locator('.hint-box')).to_contain_text('too much water')
            unchanged(page, mistaken)
            page.screenshot(path=str(OUT / f'aquarium-hint-{width}-{puzzle["id"]}-conflict.png'))
            page.keyboard.press('Escape')
            expect(button).to_be_focused()
            action(page, 'undo')
            assert current(page)['state'] == before['state']

            # Reveal remains a separate, explicit confirmation and counted action.
            before_reveal = current(page)
            dialog, _ = hint(page)
            dialog.get_by_role('button', name='Reveal one step', exact=True).click()
            expect(page.locator('dialog[open] h2')).to_have_text('Reveal one step?')
            unchanged(page, before_reveal)
            page.get_by_role('button', name='Not yet', exact=True).click()
            unchanged(page, before_reveal)
            dialog, _ = hint(page)
            dialog.get_by_role('button', name='Reveal one step', exact=True).click()
            page.get_by_role('button', name='Place this step', exact=True).click()
            after = current(page)
            assert after['hints'] == before_reveal['hints'] + 1
            assert after['state'] != before_reveal['state']
            check(True, f'{width}: {puzzle["id"]} clue-only Hint, highlights, keyboard, conflict, undo and confirmed Reveal')

        key = seed_ambiguous(page, standard)
        # Saved definitions enter the application's records map on startup.
        page.reload()
        page.wait_for_function('() => navigator.serviceWorker.controller && AlibiDiagnostics.getStatus().offlineReady')
        trap_answer(page)
        open_run(page, key)
        before = current(page)
        dialog, button = hint(page)
        expect(dialog.locator('h2')).to_have_text('A small nudge.')
        expect(dialog.locator('.deduction-title')).to_have_count(0)
        expect(dialog).to_contain_text('general strategy')
        assert page.locator('.hint-focus').count() == 0
        unchanged(page, before)
        page.screenshot(path=str(OUT / f'aquarium-hint-{width}-ambiguous.png'))
        page.keyboard.press('Escape')
        expect(button).to_be_focused()
        unchanged(page, before)
        check(True, f'{width}: ambiguous public clues keep an honest, non-mutating fallback')
        check(not errors, f'{width}: no Hint browser errors or hidden-answer reads')
    finally:
        context.close()
