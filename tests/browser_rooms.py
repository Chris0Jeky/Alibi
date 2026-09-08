"""Two independent browser seats against local Wrangler Durable Objects."""
import os,json
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=os.environ.get('ALIBI_ROOM_URL','http://127.0.0.1:8788').rstrip('/')
checks=[]
def check(v,m):
 assert v,m
 checks.append(m);print('PASS',m,flush=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True)
 contexts=[browser.new_context(viewport={'width':390,'height':844}) for _ in range(2)]
 pages=[c.new_page() for c in contexts]
 for page in pages:
  page.goto(BASE+'/#/salon');page.wait_for_function('() => !!globalThis.AlibiDiagnostics')
  page.locator('[data-action="club-online-settings"]').click()
  page.locator('#club-api').fill(BASE+'/api')
 pages[0].locator('[data-action="club-room-create"]').click()
 pages[0].wait_for_function('() => !!AlibiClub.diagnostics().room?.code')
 code=pages[0].evaluate('AlibiClub.diagnostics().room.code')
 calls=[]
 def lose_join_reply(route):
  response=route.fetch();calls.append(response.status)
  if len(calls)==1:route.abort('failed')
  else:route.fulfill(response=response)
 pages[1].route('**/api/rooms/*/join',lose_join_reply)
 pages[1].locator('#club-room-code').fill(code)
 pages[1].locator('[data-action="club-room-join"]').click()
 pages[1].wait_for_function('() => AlibiClub.diagnostics().room?.seat===-1')
 check(calls==[200,200],'A lost join response retries the same seat successfully')
 for turn in range(4):
  page=pages[turn%2]
  page.locator('.duel-cell.legal:not([disabled])').first.click(timeout=15000)
  page.wait_for_function('(ply) => AlibiClub.diagnostics().room.version===ply',arg=turn+2)
 check(pages[1].evaluate('AlibiClub.diagnostics().room.version')==5,'Two independent seats alternate authoritative moves')
 pages[0].reload();pages[0].wait_for_function('() => AlibiClub.diagnostics().room?.version===5')
 check(pages[0].evaluate('AlibiClub.diagnostics().room.code')==code,'Seat reconnects after reload with its saved session credential')
 browser.close()
out=Path(__file__).resolve().parents[1]/'test-results'/'browser-rooms';out.mkdir(parents=True,exist_ok=True)
(out/'results.json').write_text(json.dumps({'passed':True,'scope':'Local Wrangler runtime and two isolated Chromium contexts; not hosted or physical devices','checks':checks},indent=2))
