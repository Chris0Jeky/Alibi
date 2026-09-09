"""Real-origin smoke test for the Cabinet-owned Castle practice adapter."""

import os
import json
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


BASE = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787/").split("#")[0]
OUTPUT = Path(os.environ.get("ALIBI_RESULTS", "test-results")) / "castle-practice"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    report={'passed':False,'checks':[]}
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        for width in [390,1280]:
            context=browser.new_context(viewport={'width':width,'height':900})
            page=context.new_page()
            page.goto(BASE + '#/home')
            page.locator((' .mobile-nav' if width<900 else '.sidebar')+' [data-page="quiet"][data-id="castle"]').click()
            expect(page.locator('#castle-main h1')).to_have_text('Wrenmere Castle')
            page.locator('[data-do="visit"][data-value="library"]').first.click()
            page.locator('[data-do="puzzle"]').click()
            for action in ['reveal','confirm-reveal','check','close']:
                page.locator(f'#castle-dialog [data-do="{action}"]').click()
            page.locator('.nearby [data-value="observatory"]').click()
            expect(page.locator('[data-practice-room="observatory"]')).to_contain_text('0 /')
            snapshot=page.evaluate('() => AlibiDiagnostics.getPracticeSnapshot()')
            assert snapshot['available'] and len(snapshot['rooms'])==13
            assert sum(r['total'] for r in snapshot['rooms'].values())==328
            def dismiss():
                if page.locator('#dialog[open]').count():
                    finish=page.locator('#dialog [data-action="lesson-finish"]')
                    (finish if finish.count() else page.locator('#dialog [data-action="close-dialog"]').first).click()
            for number in ['01','02','05']:
                id='curated-binary-'+number
                page.locator(f'[data-do="practice"][data-value="{id}"]').click()
                page.wait_for_function('(id)=>AlibiDiagnostics.getCurrent()?.puzzle.id===id',arg=id)
                dismiss()
                expect(page.locator('.practice-return')).to_contain_text('The Observatory')
                puzzle=page.evaluate('AlibiDiagnostics.getCurrent().puzzle')
                for i,value in enumerate(puzzle['solution']):
                    if puzzle['givens'][i]==-1:
                        page.locator(f'[data-action="symbol"][data-value="{value}"]').first.click()
                        page.locator(f'[data-action="cell"][data-cell="{i}"]').click()
                page.wait_for_function('() => !!AlibiDiagnostics.getCurrent().completedAt')
                dismiss()
                page.locator('[data-action="return-to-castle"]').click()
                expect(page.locator('#castle-main h1')).to_have_text('The Observatory')
            expect(page.locator('.practice-detail')).to_contain_text('paper constellation')
            expect(page.locator('.score')).to_have_text('10 / 100 points')
            assert page.evaluate('() => AlibiDiagnostics.getPracticeSnapshot().then(s=>s.rooms.observatory.completed)')==3
            page.locator('[data-do="practice"][data-value="curated-binary-01"]').click()
            page.locator('[data-action="restart"]').click()
            page.locator('[data-action="restart-confirm"]').click()
            page.locator('[data-action="return-to-castle"]').click()
            expect(page.locator('.practice-detail')).to_contain_text('paper constellation')
            page.reload()
            expect(page.locator('[data-practice-room="observatory"]')).to_contain_text('3 /')
            page.evaluate('window.scrollTo(0,0)')
            page.screenshot(path=str(OUTPUT/f'practice-{width}.png'),full_page=True)
            report['checks'].append(f'{width}: root castle navigation, three real official solves, return context, distinct familiarity and restart/reload retention')
            page.evaluate('location.hash="#/quiet/castle/directory"')
            panel=page.locator('[data-practice-room="number"]')
            expect(panel).to_contain_text('This room is planned')
            panel.locator('[data-do="practice"]').first.click()
            page.wait_for_function('() => AlibiDiagnostics.getCurrent()?.puzzle.type==="sudoku"')
            dismiss()
            page.locator('[data-action="return-to-castle"]').click()
            expect(page.locator('#castle-main h1')).to_have_text('Room directory')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
            report['checks'].append(f'{width}: planned-room shelves open actual puzzles and return to the directory without claiming a story unlock')
            context.close()
        browser.close()
        report['passed']=True
    (OUTPUT/'acceptance.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))


if __name__ == "__main__":
    main()
