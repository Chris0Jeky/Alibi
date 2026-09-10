"""Real Chromium touch input, including the status-reflow regression during pickup."""


def assert_touch_drag(page, context, check, width):
    page.locator('.bc-host .bc-tray').scroll_into_view_if_needed()
    page.wait_for_timeout(200)
    geometry = page.evaluate('''() => {
      const r=AlibiClub.diagnostics().state.runs.blockcabinet,e=AlibiClubEngines.blockCabinet,s=e.replay(r.seed,r.log);
      const slot=[0,1,2].find(n=>e.placements(s,n).length),origin=e.placements(s,slot)[0],shape=e.shape(s.tray[slot]);
      const b=document.querySelector('.bc-host .bc-board').getBoundingClientRect(),t=document.querySelector('.bc-host [data-piece="'+slot+'"]').getBoundingClientRect(),cell=b.width/8;
      return {slot,origin,sx:t.x+t.width/2,sy:t.y+t.height/2,
        x:b.x+(origin%8+(Math.max(...shape.cells.map(c=>c[0]))+1)/2)*cell,
        y:b.y+(Math.floor(origin/8)+(Math.max(...shape.cells.map(c=>c[1]))+1)/2)*cell+1.15*cell};
    }''')
    n = page.evaluate('AlibiClub.diagnostics().state.runs.blockcabinet.log.length')
    session = context.new_cdp_session(page)
    session.send('Input.dispatchTouchEvent', {'type':'touchStart','touchPoints':[{'x':geometry['sx'],'y':geometry['sy']}]})
    # A new status message can wrap differently. It must not cancel the captured touch.
    page.wait_for_timeout(100)
    for step in range(1, 9):
        session.send('Input.dispatchTouchEvent', {'type':'touchMove','touchPoints':[{
            'x':geometry['sx']+(geometry['x']-geometry['sx'])*step/8,
            'y':geometry['sy']+(geometry['y']-geometry['sy'])*step/8,
        }]})
    session.send('Input.dispatchTouchEvent', {'type':'touchEnd','touchPoints':[]})
    page.wait_for_timeout(1900)
    log = page.evaluate('AlibiClub.diagnostics().state.runs.blockcabinet.log')
    check(len(log) == n+1, f'{width}: lifted touch drag commits once after status reflow')
    check(log[-1]['cell'] == geometry['origin'] and log[-1]['slot'] == geometry['slot'],
          f'{width}: touch lift maps to the exact previewed origin and piece')
    session.detach()
