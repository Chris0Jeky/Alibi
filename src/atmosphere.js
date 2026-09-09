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
    return `<section class="quiet-invitation">${figure('conservatory-study')}<div class="quiet-invitation-copy"><span class="eyebrow">THE QUIET WING</span><h2>A table by the window.</h2><p>Your garden and model village are here. The keeper needs a hand with some unsorted papers in the castle library.</p><p><a href="#/quiet/castle/map" style="display:inline-flex;align-items:center;min-height:44px">Visit Wrenmere Castle ↗</a></p><div class="quiet-destinations"><a href="#/quiet/realm"><strong>The realm studio</strong><span>Build a village or return to your last design ↗</span></a><a href="#/quiet/pets"><strong>Good company</strong><span>Your companions are by the hearth ↗</span></a><a href="#/quiet/garden"><strong>The conservatory</strong><span>Check the planting and make a postcard ↗</span></a><a href="#/quiet/classics"><strong>The quiet cabinet</strong><span>Tideglass, picture pairs and classics ↗</span></a></div></div></section><a class="folio-invitation" href="#/quiet/folio"><img src="${G.ALIBI_MEDIA['club-reading-room']}" alt="" width="1200" height="600" loading="lazy" decoding="async"><span><small class="eyebrow">FROM THE CLUB’S FIELD NOTES</small><strong>Inside the studio.</strong><span>Browse the models, portraits, recordings and short films used around Alibi.</span><b>Open the collection ↗</b></span></a>`;
  }
  function family(type) {
    const id = ['aquarium', 'bridges', 'network'].includes(type)
      ? 'coastal-light'
      : ['tents', 'lightup', 'nonogram'].includes(type)
        ? 'conservatory-study'
        : 'reading-room';
    return `<aside class="collection-atmosphere">${figure(id)}<div><span class="eyebrow">FROM THE COLLECTION</span><p>${id === 'coastal-light' ? 'The coastal study hangs beside the route tables.' : id === 'conservatory-study' ? 'The glasshouse painting belongs near a window.' : 'There is room for a book beside the puzzle.'}</p><small>Art from the museum collection. Your puzzle and its clues are below.</small></div></aside>`;
  }
  G.AlibiAtmosphere = { works, figure, invitation, family };
})(globalThis);
