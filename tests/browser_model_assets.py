"""Exercise the actual portable asset viewer, including static fallback."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/assets/models'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
def check(value, label):
    assert value, label
    checks.append(label)
    print('PASS', label, flush=True)
URL = 'http://127.0.0.1:8790/assets-source/library/model-preview.html'
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, reduced_motion='reduce')
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(URL)
    page.wait_for_function('document.querySelector("#piece").options.length===44')
    page.locator('#motion').uncheck()
    for scene in ['harbour', 'hillfort', 'farmstead']:
        page.locator('#piece').select_option(scene)
        page.wait_for_load_state('networkidle')
        check(page.locator('#canvas').is_visible() and not page.locator('#fallback').is_visible(), scene+' GLB renders')
        for camera in ['isometric', 'alternate']:
            page.locator('#camera').select_option(camera)
            page.wait_for_load_state('networkidle')
            page.screenshot(path=str(OUT / f'{scene}-{camera}.png'))
    for treatment in ['selected', 'invalid', 'placement']:
        page.locator('#treatment').select_option(treatment)
        check(page.evaluate('document.documentElement.dataset.treatment') == treatment, treatment+' preview treatment')
    page.locator('#family').select_option('companions')
    ids = page.locator('#piece option').evaluate_all('(xs)=>xs.map(x=>x.value)')
    check(len(ids)==4, 'Four existing companion identities')
    for companion in ids:
        page.locator('#piece').select_option(companion)
        for state in ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate']:
            page.locator('#state').select_option(state)
            page.wait_for_function('(state)=>document.querySelector("#companion svg")?.getAttribute("aria-label").endsWith(state+" state")', arg=state)
            check(page.locator('#companion svg').is_visible() and not page.locator('#canvas').is_visible(), companion+' '+state+' rig renders')
        page.screenshot(path=str(OUT / (companion+'.png')))
    page.locator('#motion').check()
    page.wait_for_load_state('networkidle')
    check(page.locator('#companion svg.animate').count()==0, 'Reduced motion disables rig animation')
    page.emulate_media(reduced_motion='no-preference')
    page.wait_for_selector('#companion svg.animate')
    check(page.locator('#companion svg').evaluate('(s)=>s.getAnimations({subtree:true}).length')>0, 'Live rig has running animation')
    page.locator('#motion').uncheck()
    page.wait_for_function('!document.querySelector("#companion svg.animate")')
    check(page.locator('#companion svg.animate').count()==0, 'Explicit pause stops animation')
    for width in [390, 1440]:
        page.set_viewport_size({'width':width, 'height':1000})
        check(page.evaluate('document.documentElement.scrollWidth<=innerWidth'), 'Viewer fits '+str(width))
        page.screenshot(path=str(OUT / f'viewer-{width}.png'))
    check(not errors, 'No viewer page errors')
    fallback = browser.new_page()
    fallback.add_init_script('const original=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith("webgl")?null:original.call(this,type,...args)}')
    fallback.goto(URL)
    fallback.wait_for_selector('#static', state='visible')
    fallback.locator('#static').evaluate('(i)=>i.decode()')
    check(fallback.locator('#fallback').is_visible(), 'No-WebGL fallback decodes actual thumbnail')
    browser.close()
(OUT / 'results.json').write_text(json.dumps({'checks':checks,'scope':'Local Chromium; simulated viewport and GPU fallback'},indent=2),encoding='utf8')
