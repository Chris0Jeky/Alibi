"""Actual dossier/witness keyboard controls, shared by the existing UI suite."""
from playwright.sync_api import expect


def check_mark_keys(page, puzzle):
    """Arrows move focus only; native activation and undo retain their owners."""
    original = page.evaluate('AlibiDiagnostics.getCurrent().state')
    moves = page.evaluate('AlibiDiagnostics.getCurrent().moves')
    dossier = puzzle['type'] == 'dossier'
    size = puzzle['size']
    categories = range(len(puzzle['categories'])) if dossier else [0]
    for category in categories:
        offset = category * size * size if dossier else 0
        length = size * size if dossier else len(puzzle['statements'])
        if dossier:
            page.locator(f'[data-action="dossier-tab"][data-value="{category}"]').click()
        first = page.locator(f'#mark-{offset}')
        first.focus()
        first.press('ArrowLeft')
        expect(first).to_be_focused()
        first.press('ArrowRight')
        expect(page.locator(f'#mark-{offset + 1}')).to_be_focused()
        page.keyboard.press('ArrowDown')
        target = offset + size + 1 if dossier else min(offset + 2, length - 1)
        expect(page.locator(f'#mark-{target}')).to_be_focused()
        page.keyboard.press('ArrowUp')
        expect(page.locator(f'#mark-{offset + 1}')).to_be_focused()
        if dossier:
            right = page.locator(f'#mark-{offset + size - 1}')
            right.focus()
            right.press('ArrowRight')
            expect(right).to_be_focused()
        last = page.locator(f'#mark-{offset + length - 1}')
        last.focus()
        last.press('ArrowDown')
        expect(last).to_be_focused()
        assert page.evaluate('AlibiDiagnostics.getCurrent().state') == original
        assert page.evaluate('AlibiDiagnostics.getCurrent().moves') == moves
        # Tab order remains native, including reverse traversal after arrow use.
        first.focus()
        first.press('Tab')
        second = page.locator(f'#mark-{offset + 1}')
        expect(second).to_be_focused()
        second.press('Shift+Tab')
        expect(first).to_be_focused()
    # Exercise Enter on a real button, then restore the board before the solver
    # portion of browser_ui.py continues. Navigation itself never writes a move.
    first.press('Enter')
    page.wait_for_function('(before) => AlibiDiagnostics.getCurrent().moves === before + 1', arg=moves)
    assert page.evaluate('AlibiDiagnostics.getCurrent().state') != original
    page.locator('.main-tools [data-action="undo"]').click()
    assert page.evaluate('AlibiDiagnostics.getCurrent().state') == original
    if dossier:
        page.locator('[data-action="dossier-tab"][data-value="0"]').click()
