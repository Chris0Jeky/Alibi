/* Real, credited museum art. These pictures are atmosphere, never fictional evidence. */
(function (G) {
  'use strict';
  const works = {
    'reading-room': {
      title: 'A Woman Reading',
      artist: 'Camille Corot',
      date: '1869 and 1870',
      object: 435991,
      width: 600,
      height: 820,
    },
    'conservatory-study': {
      title: 'Side of a Greenhouse',
      artist: 'George Cochran Lambdin',
      date: '1870–80 (?)',
      object: 11393,
      width: 650,
      height: 826,
    },
    'coastal-light': {
      title: 'Near Land’s End, Cornwall',
      artist: 'William Trost Richards',
      date: '1879',
      object: 11903,
      width: 1000,
      height: 509,
    },
  };
  function figure(id) {
    const work = works[id];
    if (!work || !G.ALIBI_MEDIA?.[id]) return '';
    return `<figure class="museum-atmosphere"><img src="${G.ALIBI_MEDIA[id]}" alt="${work.title} by ${work.artist}" width="${work.width}" height="${work.height}" loading="lazy" decoding="async"><figcaption><a href="https://www.metmuseum.org/art/collection/search/${work.object}" target="_blank" rel="noopener noreferrer">${work.title}</a> · ${work.artist}, ${work.date}. The Met, Public Domain.</figcaption></figure>`;
  }
  function invitation() {
    return `<section class="quiet-invitation">${figure('conservatory-study')}<div class="quiet-invitation-copy"><span class="eyebrow">A ROOM WITH NOTHING TO FINISH</span><h2>Stay a little longer.</h2><p>Build a harbour. Make a friend. Gather a flower for later. The Quiet Wing is yours to wander.</p><div class="quiet-destinations"><a href="#/quiet/realm"><strong>The realm studio</strong><span>Castles, villages and worlds from a seed ↗</span></a><a href="#/quiet/pets"><strong>Good company</strong><span>Four animated friends, no care schedule ↗</span></a><a href="#/quiet/garden"><strong>The conservatory</strong><span>A little growing, a postcard to keep ↗</span></a><a href="#/quiet/classics"><strong>The quiet cabinet</strong><span>Tideglass, picture pairs and classics ↗</span></a></div></div></section><a class="folio-invitation" href="#/quiet/folio"><img src="${G.ALIBI_MEDIA['club-reading-room']}" alt="" width="1200" height="600" loading="lazy" decoding="async"><span><small class="eyebrow">FROM THE CLUB’S FIELD NOTES</small><strong>A world in the details.</strong><span>Little worlds in 3D. Portraits in ink. A room to listen.</span><b>Take a look inside ↗</b></span></a>`;
  }
  function family(type) {
    const id = ['aquarium', 'bridges', 'network'].includes(type)
      ? 'coastal-light'
      : ['tents', 'lightup', 'nonogram'].includes(type)
        ? 'conservatory-study'
        : 'reading-room';
    return `<aside class="collection-atmosphere">${figure(id)}<div><span class="eyebrow">A PICTURE BEFORE A PUZZLE</span><p>${id === 'coastal-light' ? 'A shifting sea. A few fixed points.' : id === 'conservatory-study' ? 'Look for the shape between the leaves.' : 'A quiet page, and time to notice.'}</p><small>Art from the museum collection. Your puzzle and its clues are below.</small></div></aside>`;
  }
  G.AlibiAtmosphere = { works, figure, invitation, family };
})(globalThis);
