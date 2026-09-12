/* The existing bounded activity loader owns downloads; the optional bundle owns the UI. */
(function(G){
  const c=G.AlibiClub, init=c.init, home=c.home, after=c.afterRender;
  const h=G.AlibiHouseLoader={active:()=>/^#\/?home\?/.test(location.hash)&&new URLSearchParams(location.hash.split('?')[1]).get('ux')==='house'};
  c.init=async a=>{await init(a);h.bridge=a;};
  c.home=()=>h.active()?h.home?.()||`<section class="panel"><h1>The Wrenmere desk</h1><p role="status">${h.error?'Preview unavailable. Your saves are unchanged.':'Opening the desk…'}</p><button class="btn" data-house-retry>Try again</button><a class="btn secondary" href="#/home">Classic desk</a></section>`:`<a class="btn secondary" href="#/home?ux=house">Try the Wrenmere desk →</a>`+home();
  function load(){
    if(h.pending||h.home)return;
    h.pending=true;h.error=false;
    G.AlibiActivities.loadSource(G.ALIBI_HOUSE_CONFIG).catch(()=>{h.pending=false;h.error=true;h.bridge.render();});
  }
  c.afterRender=r=>{after(r);h.afterRender?.(r);if(h.active()&&!h.pending&&!h.error&&!h.home)load();};
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-house-retry]'))load();});
})(globalThis);
