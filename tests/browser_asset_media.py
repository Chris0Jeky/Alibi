"""Verify browser playback and seeking of actual local film deliveries."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
catalogue=json.loads((ROOT/'assets-source/library/catalogue.json').read_text(encoding='utf8'))
films=[f['path'] for a in catalogue['assets'] for f in a['files'] if f['path'].endswith('.mp4')]
assert len(set(films))==8, 'Eight actual film cuts'
results=[]
with sync_playwright() as p:
    browser=p.chromium.launch(headless=True)
    page=browser.new_page()
    page.goto('http://127.0.0.1:8790/')
    page.wait_for_selector('.asset')
    page.get_by_role('button',name='motion',exact=True).click()
    assert page.locator('video').count()==5, 'Five unique compositions, orientation cuts remain derivatives'
    assert page.locator('video[autoplay]').count()==0
    for path in films:
        result=page.evaluate('''async path=>{
          const v=document.createElement('video'); v.muted=true; v.preload='auto'; v.src='/'+path;
          document.body.append(v);
          await new Promise((resolve,reject)=>{v.onloadedmetadata=resolve;v.onerror=()=>reject(Error('Video load failed'))});
          await v.play();v.pause();
          for(const position of [v.duration/2,v.duration-.2]) {
            await new Promise((resolve,reject)=>{v.onseeked=resolve;v.onerror=()=>reject(Error('Video seek failed'));v.currentTime=position});
          }
          const result={path,duration:v.duration,width:v.videoWidth,height:v.videoHeight,seeked:true};v.remove();return result;
        }''',path)
        results.append(result);print('PASS playback and seek',path,flush=True)
    browser.close()
out=ROOT/'test-results/assets/media-results.json'
out.write_text(json.dumps({'films':results,'scope':'Actual local Chromium decode/play/seek; silent films, no auditory claim'},indent=2),encoding='utf8')
