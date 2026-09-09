"""Actual illustrated navigation, responsive geometry, film lifecycle and offline scenes."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/').split('#')[0]
OUT=Path('test-results/castle-exploration')

def run():
    OUT.mkdir(parents=True,exist_ok=True)
    report={'passed':False,'checks':[]}
    try:
        with sync_playwright() as p:
            browser=p.chromium.launch()
            for width in [390,1280]:
                context=browser.new_context(viewport={'width':width,'height':900},reduced_motion='reduce')
                page=context.new_page()
                requests=[]
                errors=[]
                page.on('request',lambda r: requests.append(r.url))
                page.on('pageerror',lambda e: errors.append(str(e)))
                page.goto(BASE+'#/quiet/castle/map')
                expect(page.locator('.map-stage')).to_be_visible()
                page.wait_for_function('() => AlibiActivities.diagnostics().offline')
                assert not any('.mp4' in url for url in requests)
                assert page.locator('.secret-route').count()==0
                stage=page.locator('.map-stage').bounding_box()
                for pin in page.locator('.pin').all():
                    box=pin.bounding_box()
                    assert box['width']>=44 and box['height']>=44
                    pos=pin.evaluate('(e)=>({x:parseFloat(e.style.left),y:parseFloat(e.style.top)})')
                    assert abs(box['x']+box['width']/2-stage['x']-stage['width']*pos['x']/100)<1
                    assert abs(box['y']+box['height']/2-stage['y']-stage['height']*pos['y']/100)<1
                today=page.locator('.castle-plan img').get_attribute('src')
                page.locator('[data-do="era"][data-value="1911"]').click()
                assert page.locator('.castle-plan img').get_attribute('src')!=today
                assert page.locator('.secret-route').count()==0
                expect(page.locator('.scene-heading')).not_to_contain_text('service stair')
                page.evaluate('window.scrollTo(0,0)')
                page.screenshot(path=str(OUT/f'grounds-{width}.png'),full_page=True)
                report['checks'].append(f'{width}: original era maps, aligned 44px doors, no early secret or movie download')
                page.locator('[data-do="visit"][data-value="library"]').first.click()
                expect(page.locator('#castle-main h1')).to_have_text('The Long Library')
                page.locator('.hotspot.observation').click()
                expect(page.locator('#castle-dialog')).to_contain_text('pencilled correction')
                page.locator('[data-do="close"]').click()
                page.locator('.hotspot[data-do="room-puzzle"]').click()
                expect(page.locator('#castle-dialog')).to_contain_text('Arrange the five books')
                page.locator('[data-do="close"]').click()
                page.locator('.nearby [data-value="observatory"]').click()
                expect(page.locator('#castle-dialog')).to_contain_text('maintenance slip')
                page.locator('[data-do="close"]').click()
                expect(page.locator('#castle-main h1')).to_have_text('The Long Library')
                page.evaluate('window.scrollTo(0,0)')
                page.screenshot(path=str(OUT/f'library-{width}.png'),full_page=True)
                report['checks'].append(f'{width}: observed object and puzzle hotspots work; nearby locked door explains its clue')
                page.locator('[data-do="film"]').click()
                video=page.locator('#castle-film')
                expect(video).to_have_attribute('preload','none')
                assert video.evaluate('(v)=>v.paused')
                assert not any('.mp4' in url for url in requests)
                assert video.locator('track').get_attribute('kind')=='captions'
                page.locator('#castle-dialog summary').click()
                expect(page.locator('#castle-dialog details')).to_contain_text('Not every answer is a verdict')
                video.focus()
                video.press('Space')
                expect(video).to_have_js_property('paused',False)
                expect(video.locator('track')).to_have_js_property('readyState',2)
                video.evaluate('(v)=>globalThis.castleDetachedFilm=v')
                page.locator('[data-do="close"]').click()
                assert page.evaluate('castleDetachedFilm.paused && !castleDetachedFilm.getAttribute("src")')
                assert page.locator('#castle-film').count()==0
                report['checks'].append(f'{width}: opt-in captioned film plays; closing pauses and releases its source')
                context.set_offline(True)
                page.reload()
                expect(page.locator('#castle-main h1')).to_have_text('The Long Library')
                page.wait_for_function('() => AlibiActivities.diagnostics().offline')
                page.locator('.room-stage img').evaluate('(i)=>i.decode()')
                assert page.locator('.room-stage img').evaluate('(i)=>i.complete && i.naturalWidth>0')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                assert not errors,errors
                report['checks'].append(f'{width}: original room illustration and text controls reopen offline without page overflow')
                context.close()
            browser.close()
        report['passed']=True
    finally:
        (OUT/'acceptance.json').write_text(json.dumps(report,indent=2))
    print(json.dumps(report))

if __name__=='__main__': run()
