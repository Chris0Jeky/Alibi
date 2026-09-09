const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names = { S:'Station', B:'Bridge', O:'Orchard', T:'Tower', L:'Lodge', A:'Archive' };
const places = { S:[9,76], B:[31,48], O:[56,26], T:[87,17], L:[33,85], A:[73,72] };
const button = (label, action, value='', attrs='') => `<button data-do="${action}" data-value="${escape(value)}" ${attrs}>${label}</button>`;
const link = (label, view, id='') => `<a href="#/quiet/castle/${view}${id?'/'+id:''}">${label}</a>`;
const quietLinks = () => '<div class="row"><a href="#/quiet/garden">Garden</a><a href="#/quiet/realm">Realm builder</a><a href="#/quiet/pets">Companions</a></div>';
export { escape, names, places, button, link, quietLinks };
