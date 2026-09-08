/* Original small botanical and coastal motifs; decorative artwork never reveals hidden cards. */
(function (G) {
  'use strict';
  const meadow = ['Clover', 'Poppy', 'Lavender', 'Daisy', 'Fern', 'Acorn', 'Willow', 'Blossom'];
  const shore = ['Shell', 'Starfish', 'Sailboat', 'Pebble', 'Reed', 'Fish', 'Anchor', 'Moon'];
  function art(value, theme = 'meadow') {
    const stems =
      '<path d="M60 100Q48 73 62 37M57 75Q26 64 30 49Q53 50 57 75M56 85Q86 62 92 72Q78 91 56 85" fill="#90aa86" stroke="#53776b" stroke-width="2"/>';
    let drawing;
    if (theme === 'meadow') {
      if (value < 4 || value === 7) {
        const petals = [4, 5, 8, 10, 0, 0, 0, 6][value],
          colour = ['#9daf83', '#cd897c', '#9d95b5', '#f1e9cb', '', '', '', '#dbb2ab'][value];
        drawing =
          stems +
          Array.from(
            { length: petals },
            (_, i) =>
              `<ellipse cx="60" cy="29" rx="${value === 2 ? 7 : 12}" ry="18" fill="${colour}" stroke="#5f756650" transform="rotate(${(i * 360) / petals} 60 43)"/>`,
          ).join('') +
          '<circle cx="60" cy="43" r="8" fill="#d4b063"/>';
      } else if (value === 4)
        drawing =
          '<path d="M48 103Q53 47 73 19" fill="none" stroke="#5f8066" stroke-width="3"/>' +
          Array.from(
            { length: 7 },
            (_, i) =>
              `<path d="M${53 + i * 2} ${89 - i * 9}q-27-2-20-16q17 0 20 16q27-3 27-20q-18 0-27 20" fill="${i % 2 ? '#779773' : '#95aa83'}"/>`,
          ).join('');
      else if (value === 5)
        drawing =
          '<path d="M65 26q13-17 20-9M44 47q-13-26-22-18q-9 19 22 18" fill="#879c70" stroke="#597465" stroke-width="3"/><path d="M35 55q0 43 26 48q27-16 25-48" fill="#ba9971"/><path d="M29 60q1-31 33-29q29 1 30 30Z" fill="#776c56"/><path d="m36 51 9-9m0 16 11-16m3 16 11-16m1 16 9-10" stroke="#b5a17a" stroke-width="3"/>';
      else
        drawing =
          '<path d="M58 107Q44 58 67 22" fill="none" stroke="#6d8166" stroke-width="3"/>' +
          Array.from(
            { length: 6 },
            (_, i) =>
              `<path d="M${58 + i} ${82 - i * 10}q-33-26-20-31q25 7 20 31q32-7 26-28q-19 2-26 28" fill="#92aa8b"/>`,
          ).join('');
    } else
      drawing = [
        '<path d="M60 100Q10 77 19 46Q25 17 60 24Q99 18 103 49Q109 76 60 100Z" fill="#d7b4a0"/><path d="M60 100 29 43M60 100 47 29M60 100 71 29M60 100 94 45" fill="none" stroke="#a88271" stroke-width="3"/>',
        '<path d="m61 18 12 30 33 2-26 24 6 33-26-20-29 17 8-32L15 48l34 1Z" fill="#c99a77"/><path d="m60 31 1 32m-32-7 31 7m30-6-30 6m17 28L60 63M44 89l16-26" stroke="#ebd2ab" stroke-width="4"/>',
        '<path d="M60 17v69M25 88h77l-16 17H42Z" fill="#b9886a" stroke="#6b7f78" stroke-width="3"/><path d="m56 26-33 52h33Z" fill="#e9dec0"/><path d="m66 35 26 43H66Z" fill="#9fb9b5"/>',
        '<ellipse cx="54" cy="77" rx="39" ry="25" fill="#95a9a4"/><ellipse cx="75" cy="45" rx="24" ry="19" fill="#c8b6a3"/><path d="M25 68q28-20 55 5M60 43q16-11 28 0" fill="none" stroke="#e2dccc" stroke-width="4"/>',
        '<path d="M44 110V26m27 84V41M41 103Q10 62 24 43m52 59q30-31 23-46" fill="none" stroke="#80917a" stroke-width="4"/><rect x="38" y="15" width="13" height="37" rx="7" fill="#9b7860"/><rect x="65" y="28" width="13" height="32" rx="7" fill="#9b7860"/>',
        '<path d="M23 64q35-48 67-2l20-15v39L89 73Q49 109 23 64Z" fill="#99b6b3"/><path d="M55 44 65 29l12 21M52 86l15 15 13-17" fill="#6f9594"/><circle cx="39" cy="61" r="4" fill="#3c6265"/>',
        '<circle cx="60" cy="26" r="12" fill="none" stroke="#718e93" stroke-width="7"/><path d="M60 38v64M37 54h46M23 76q6 28 37 26q32 0 38-26M18 80l6-13 12 10M86 77l13-11 4 15" fill="none" stroke="#718e93" stroke-width="7" stroke-linecap="round"/>',
        '<path d="M79 21Q19 20 24 68Q31 111 83 96Q43 85 50 50Q57 26 79 21Z" fill="#d8bf82"/><path d="m89 39 3 8 9 1-7 5 1 9-7-6-7 3 3-8-5-7 9 1Z" fill="#aec4bb"/>',
      ][value];
    return `<svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="#f7f1e5"/>${drawing}</svg>`;
  }
  G.QWCalmArt = { art, names: (theme) => (theme === 'shore' ? shore : meadow) };
})(window);
