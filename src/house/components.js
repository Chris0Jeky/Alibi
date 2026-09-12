/* Original Wrenmere line assets; decorative only. No icon font, URL or external sprite. */
(function (G) {
  'use strict';
  const paths = {
    desk: '<path d="M3 10 12 3l9 7v11H3zM9 21v-7h6v7"/>',
    puzzles: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18m6-18v18M3 9h18M3 15h18"/>',
    house: '<path d="M3 21V6h4V3h3v6h4V3h3v3h4v15ZM9 21v-6a3 3 0 0 1 6 0v6"/>',
    notebook: '<rect x="5" y="3" width="16" height="18" rx="2"/><path d="M3 7h4m-4 5h4m-4 5h4m4-10h6m-6 5h6m-6 5h4"/>',
    comfort: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
    moon: '<path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z"/>',
    search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
    close: '<path d="m6 6 12 12M6 18 18 6"/>',
    key: '<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-6-6 3-3m0 6 3-3"/>',
    scene: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    bridges: '<circle cx="5" cy="6" r="3"/><circle cx="19" cy="18" r="3"/><path d="M8 5h11v10M5 9v10h11"/>',
  };
  function icon(name) {
    return `<svg class="hx-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.puzzles}</svg>`;
  }
  function engraving(room) {
    const art = {
      study: '<path d="M24 68h112M33 68v20m94-20v20M89 68V34m-19 0h38L96 14H82ZM41 64V36h15v28m-19-8h22"/><path d="M72 82h32M20 94h122"/>',
      library: '<path d="M24 18h112v72H24ZM24 53h112M44 24v23m7-23v23m12-23v23m6-23v23m18-23v23m7-23v23m12-23 8 22M39 61v22m8-22v22m15-22v22m8-22v22m18-22v22m7-22 8 22m9-22v22"/>',
      maps: '<path d="m20 26 37-12 46 12 37-12v62l-37 12-46-12-37 12ZM57 14v62m46-50v62M28 45l17-8m24 11 21 12m22-14 17-6"/><circle cx="80" cy="46" r="13"/><path d="m75 51 10-16-2 14Z"/>',
    };
    return `<svg class="hx-engraving" viewBox="0 0 160 104" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${art[room] || art.study}</svg>`;
  }
  G.AlibiHouseComponents = { icon, engraving };
})(globalThis);
