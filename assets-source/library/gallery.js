'use strict';
const grid = document.querySelector('#grid'),
  filters = document.querySelector('#filters');
let entries = [],
  category = 'all';
const el = (tag, text, cls) => {
  const n = document.createElement(tag);
  if (text) n.textContent = text;
  if (cls) n.className = cls;
  return n;
};
const url = (p) => '/' + p;
function link(label, p) {
  const a = el('a', label);
  a.href = url(p);
  return a;
}
function render() {
  const query = document.querySelector('#search').value.toLowerCase(),
    spoilers = document.querySelector('#spoilers').checked;
  grid.replaceChildren();
  const selected = entries.filter(
    (e) =>
      (category === 'all' || e.category === category) &&
      (!e.spoiler || spoilers) &&
      JSON.stringify([e.id, e.title, e.integration]).toLowerCase().includes(query),
  );
  document.querySelector('#empty').hidden = selected.length > 0;
  for (const e of selected) {
    const card = el('article', null, 'asset ' + e.category),
      visual = el('div', null, 'visual');
    const paths = [
      e.source,
      ...e.derivatives.map((d) => (typeof d === 'string' ? d : d.path)),
    ].filter(Boolean);
    const picture = paths.find((p) => /\.(webp|png|jpg|svg)$/.test(p)),
      video = paths.find((p) => /\.mp4$/.test(p)),
      audio = paths.find((p) => /\.(ogg|opus|wav)$/.test(p));
    if (video) {
      const v = el('video');
      v.controls = true;
      v.preload = 'none';
      v.src = url(video);
      if (picture) v.poster = url(picture);
      v.setAttribute('playsinline', '');
      card.append(v);
    } else if (picture) {
      const img = el('img');
      img.src = url(picture);
      img.alt = e.title;
      img.loading = 'lazy';
      visual.append(img);
      if (e.category === 'badges') {
        const locked = paths.find((p) => p.includes('-locked'));
        if (locked) {
          const i = el('img');
          i.src = url(locked);
          i.alt = e.title + ' — locked';
          i.loading = 'lazy';
          visual.append(i);
        }
      }
      if (e.category === 'families') {
        const p = paths.find((p) => p.includes('/card-'));
        if (p) {
          const i = el('img');
          i.src = url(p);
          i.alt = 'Existing decorative category treatment';
          i.loading = 'lazy';
          visual.append(i);
        }
      }
      card.append(visual);
    }
    if (audio) {
      const a = el('audio');
      a.controls = true;
      a.preload = 'none';
      a.src = url(audio);
      card.append(a);
    }
    const copy = el('div', null, 'copy');
    copy.append(
      el('span', e.status + ' · ' + e.design, 'tag'),
      el('h2', e.title),
      el('code', e.id),
    );
    if (e.selection) copy.append(el('p', e.selection));
    const links = el('div', null, 'links');
    links.append(link('Editable source', e.source));
    for (const p of paths.slice(1, 4)) links.append(link(p.split('/').pop(), p));
    if (e.category === 'realm' || e.category === 'companions')
      links.append(
        link('Interactive model & state preview', 'assets-source/library/model-preview.html'),
      );
    copy.append(links);
    const details = el('details');
    details.append(
      el('summary', 'Provenance & QA'),
      el('p', JSON.stringify(e.provenance)),
      el('p', e.accessibility || ''),
      el('p', 'Integration: ' + e.integration),
      el('p', JSON.stringify(e.qa), 'qa'),
    );
    const exports = el('div', null, 'links');
    for (const p of paths) exports.append(link(p.split('/').pop(), p));
    details.append(el('p', 'All source and derivative files'), exports);
    copy.append(details);
    card.append(copy);
    grid.append(card);
  }
}
document.querySelector('#theme').onclick = () => {
  document.body.classList.toggle('dark');
  document.querySelector('#theme').textContent = document.body.classList.contains('dark')
    ? 'Light paper'
    : 'Dark paper';
};
document.querySelector('#search').oninput = render;
document.querySelector('#spoilers').onchange = render;
document.querySelector('#size').onchange = (e) => (grid.className = 'grid ' + e.target.value);
fetch('catalogue.json')
  .then((r) => {
    if (!r.ok) throw Error('Catalogue HTTP ' + r.status);
    return r.json();
  })
  .then((data) => {
    entries = data.assets;
    document.querySelector('#summary').textContent =
      `${data.counts.original} original designs · ${data.counts.reused} reused designs · ${data.counts.derivatives} derivative files. ${entries.length} catalogue records.`;
    for (const c of ['all', ...new Set(entries.map((e) => e.category))]) {
      const b = el('button', c.replaceAll('-', ' '));
      b.setAttribute('aria-pressed', String(c === category));
      b.onclick = () => {
        category = c;
        for (const n of filters.children) n.setAttribute('aria-pressed', String(n === b));
        render();
      };
      filters.append(b);
    }
    render();
  })
  .catch(
    (e) =>
      (document.querySelector('#summary').textContent = 'Unable to read catalogue: ' + e.message),
  );
