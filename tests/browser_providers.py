"""Live provider validation from the actual browser origin; optional manual release check."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1];out=root/'test-results/theatre';out.mkdir(exist_ok=True,parents=True)
url=os.environ.get('ALIBI_URL','http://127.0.0.1:8787/')
with sync_playwright() as p:
 b=p.chromium.launch();page=b.new_page();page.goto(url);page.wait_for_function('()=>window.AlibiTheatre');runtime=page.evaluate('ALIBI_CONFIG')
 results=page.evaluate('''async()=>{const results=[];for(const [id,a] of Object.entries(ALIBI_DELIVERY).filter(([id])=>id.endsWith('photo'))){try{const r=await fetch(a.urls[0],{mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(10000)}); const body=await r.arrayBuffer();const sha=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',body)),b=>b.toString(16).padStart(2,'0')).join('');results.push({id,url:a.urls[0],status:r.status,mime:r.headers.get('content-type'),bytes:body.byteLength,sha256:sha,passed:r.status===200 && sha===a.sha256 && body.byteLength===a.bytes});}catch(error){results.push({id,passed:false,error:String(error)})}}return results}''')
 b.close()
report={'origin':url,'runtime':runtime,'results':results,'passed':all(r['passed'] for r in results)}
(out/'providers.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2));assert report['passed'],'Provider failed or changed rendition: verify same-origin fallback and report separately'
