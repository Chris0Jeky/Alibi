"""New investigation controls on a validated synthetic chapter fixture; no physical-device claim."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/').split('#')[0]
OUT=Path('test-results/castle-investigation')
fixture={'format':'alibi-castle','version':1,'scope':'Wrenmere Chapter I only','mode':'local','state':{
    'version':1,'revision':6,'completed':{id:{'answer':answer,'guided':True} for id,answer in [
        ('shelves',['atlas','tides','stars','moss','letters']),('clock','21:00'),('route',['S','B','O','T']),
        ('bridges',{'conclusion':'impossible','odd':['N','S','I','E']}),('magic',[4,9,2,3,5,7,8,1,6]),('ur',2)]},
    'notes':'','visited':[],'drafts':{},'revealed':[],'preferences':{'motion':False,'sound':False,'story':True}}}

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    report={'passed':False,'checks':[]}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            for width in [390,1280]:
                context=browser.new_context(viewport={'width':width,'height':900})
                page=context.new_page()
                page.goto(BASE+'#/quiet/castle/journal')
                page.locator('#castle-import').set_input_files({'name':'fixture.json','mimeType':'application/json','buffer':json.dumps(fixture).encode()})
                page.locator('[data-do="restore-merge"]').click()
                expect(page.locator('.score')).to_have_text('60 / 100 points')
                page.locator('[data-do="theory-edit"]').click()
                page.locator('#theory-text').fill('The clock must be calibrated before reading the ticket.')
                page.locator('[data-citation][value="maintenance"]').check()
                page.locator('[data-do="theory-save"]').click()
                expect(page.locator('.theory-board')).to_contain_text('Open question')
                page.locator('[data-do="theory-edit"][data-value="h1"]').click()
                page.locator('#theory-position').select_option('supported')
                page.locator('[data-do="theory-save"]').click()
                page.evaluate('() => AlibiCastle.flush()')
                page.reload()
                expect(page.locator('.theory-board')).to_contain_text('Supported for now')
                page.locator('[data-do="record"]').click()
                expect(page.locator('#castle-dialog')).to_contain_text('seventeen minutes fast')
                page.locator('[data-do="close"]').click()
                records=page.locator('[data-record-id]')
                expect(records).to_have_count(3)
                assert records.evaluate_all('(nodes)=>nodes.map((n)=>n.dataset.recordId)')==['maintenance','ticket','path']
                expect(page.locator('[data-record-id="maintenance"]')).to_contain_text('Record')
                expect(page.locator('[data-record-id="ticket"]')).to_contain_text('Derived fact')
                expect(page.locator('[data-record-id="path"]')).to_contain_text('Route model')
                assert page.locator('[data-record-id="margin"]').count()==0
                expect(page.locator('[data-record-id="maintenance"] a[href="#/quiet/castle/room/library"]')).to_be_visible()
                expect(page.locator('[data-record-id="ticket"] a[href="#/quiet/castle/room/observatory"]')).to_be_visible()
                expect(page.locator('[data-record-id="path"] a[href="#/quiet/castle/room/cartography"]')).to_be_visible()
                for id in ['maintenance','ticket','path']:
                    page.locator(f'[data-compare-record][value="{id}"]').check()
                compare=page.locator('[data-do="compare-records"]')
                compare.click()
                expect(page.locator('.evidence-comparison article')).to_have_count(3)
                assert page.locator('.evidence-comparison h3').all_text_contents()==[
                    'The maintenance slip','The corrected ticket','The green footpath']
                expect(page.locator('#castle-dialog')).not_to_contain_text('margin under the stairs')
                page.locator('[data-do="close"]').click()
                expect(compare).to_be_focused()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.screenshot(path=str(OUT/f'notebook-{width}.png'),full_page=True)
                report['checks'].append(f'{width}: hypotheses persist; three encountered records compare in source order with room links and no future evidence')
                page.evaluate('location.hash="#/quiet/castle/museum"')
                expect(page.locator('[data-do="curator-drawer"]')).to_be_disabled()
                for id,wrong,right in [('bridges','attempts','structure'),('magic','inventor','tradition'),('ur','rules','model')]:
                    page.locator(f'[data-do="label"][data-value="{id}"]').click()
                    page.locator(f'[data-do="label-answer"][data-value="{id}:{wrong}"]').click()
                    expect(page.locator('#label-result')).to_contain_text('Try revising')
                    page.locator(f'[data-do="label-answer"][data-value="{id}:{right}"]').click()
                    expect(page.locator('#label-result')).to_contain_text('Label reviewed')
                    page.locator('[data-do="close"]').click()
                expect(page.locator('.score')).to_have_text('60 / 100 points')
                page.locator('[data-do="curator-drawer"]').click()
                expect(page.locator('#castle-dialog')).to_contain_text('mended game')
                page.locator('[data-do="close"]').click()
                page.evaluate('() => AlibiCastle.flush()')
                page.reload()
                expect(page.locator('[data-do="curator-drawer"]')).to_be_enabled()
                data=page.evaluate('() => AlibiCastle.exportBackup()')
                assert len(data['state']['labels'])==3 and data['state']['theories'][0]['records']==['maintenance']
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                page.screenshot(path=str(OUT/f'museum-{width}.png'),full_page=True)
                report['checks'].append(f'{width}: three source-based label revisions open the drawer once, persist and add no puzzle points')
                context.close()
            browser.close()
        report['passed']=True
    finally:
        (OUT/'acceptance.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

if __name__=='__main__': run()
