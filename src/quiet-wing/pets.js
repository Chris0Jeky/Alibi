/* Original layered vector companions. Movements are presentation only, never simulation ticks. */
(function (G) {
  'use strict';
  const INFO = {
    cat: {
      name: 'Miso',
      species: 'Library cat',
      note: 'An expert on warm books and inconvenient naps.',
      colour: '#d4aa79',
    },
    fox: {
      name: 'Fern',
      species: 'Woodland fox',
      note: 'Collects interesting leaves. Occasionally returns with the wrong leaf.',
      colour: '#d38b61',
    },
    owl: {
      name: 'Pip',
      species: 'Little owl',
      note: 'A very small companion with very strong opinions about the moon.',
      colour: '#a99b7c',
    },
    dragon: {
      name: 'Nimbus',
      species: 'Cloud dragon',
      note: 'Breathes little clouds, rather than anything hazardous.',
      colour: '#8da99e',
    },
  };
  function svg(species = 'cat', action = 'idle', label = 'Companion') {
    if (G.QWCompanionArt?.[species]) {
      const state =
        { groom: 'happy', treat: 'feed', nap: 'sleepy', play: 'celebrate' }[action] || action;
      const safe = String(label).replace(
        /[<>&"']/g,
        (x) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[x],
      );
      return G.QWCompanionArt[species]
        .replace('state-idle', 'state-' + state)
        .replace('action-idle', 'action-' + action)
        .replace(/aria-label="[^"]*"/, 'aria-label="' + safe + '"');
    }
    const q = INFO[species] || INFO.cat,
      c = q.colour,
      esc = (s) =>
        String(s).replace(
          /[<>&"']/g,
          (x) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[x],
        );
    let ears =
      species === 'owl'
        ? `<path d="M92 114 L77 56 L128 79 M170 80 L222 55 L207 117" fill="${c}"/>`
        : species === 'dragon'
          ? '<path d="M101 89 Q84 41 106 44 L123 79 M174 77 Q192 34 198 45 L192 93" fill="#efd9b2"/>'
          : `<path d="M92 115 L78 44 Q109 48 129 85 M170 83 Q193 50 224 46 L209 116" fill="${c}"/><path d="M94 86 L88 58 L116 85 M185 86 L215 59 L209 89" fill="#d9978f" stroke="none"/>`;
    let head =
      species === 'owl'
        ? `<ellipse cx="150" cy="132" rx="75" ry="67" fill="${c}"/><path d="M88 98 Q116 77 150 113 Q182 78 212 98 Q223 156 187 171 Q163 178 150 156 Q130 184 103 166 Q80 150 88 98" fill="#f0e5c7" stroke="none"/>`
        : `<path d="M78 130 Q79 82 150 83 Q220 80 225 130 Q229 182 150 191 Q73 183 78 130Z" fill="${c}"/>`;
    let snout =
      species === 'fox'
        ? '<path d="M82 142 Q114 137 150 170 Q180 139 221 143 Q211 183 151 191 Q91 182 82 142" fill="#f2dfc0" stroke="none"/>'
        : species === 'dragon'
          ? '<ellipse cx="151" cy="162" rx="34" ry="19" fill="#d9e1c7" stroke="none"/>'
          : '';
    let eye = species === 'owl' ? 21 : 16;
    let tail =
      species === 'fox'
        ? '<path d="M177 232 Q264 246 249 152 Q241 140 234 155 Q222 197 188 189 Q170 194 177 232" fill="#d28a5d"/><path d="M247 177 Q257 145 239 147 Q230 150 228 173Z" fill="#f3e7cf" stroke="none"/>'
        : species === 'dragon'
          ? '<path d="M189 231 Q265 256 261 207 Q251 228 219 204Z" fill="#8ca99b"/><path d="M251 226 L268 217 L265 240Z" fill="#e8c394"/>'
          : species === 'owl'
            ? '<path d="M181 229 L199 264 L166 255Z" fill="#8d8068"/>'
            : `<path d="M194 229 Q254 240 242 194 Q234 169 232 146" fill="none" stroke="${c}" stroke-width="25" stroke-linecap="round"/><path d="M232 150 L231 143" stroke="#8f7560" stroke-width="20" stroke-linecap="round"/>`;
    let wings =
      species === 'dragon'
        ? '<g class="pet-wings"><path d="M100 199 Q53 156 42 165 L45 209 L81 223 L109 220Z" fill="#b5c6b2"/><path d="M202 197 Q250 160 260 167 L253 211 L217 226 L196 222Z" fill="#b5c6b2"/><path d="M56 178 L82 219 M247 178 L220 222" stroke="#79978b"/></g>'
        : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300" role="img" aria-label="${esc(label)}" class="pet-svg pet-${species} action-${action}"><ellipse cx="153" cy="269" rx="75" ry="13" fill="#29494d1c"/><g stroke="#525b57" stroke-width="2.6" stroke-linejoin="round"><g class="pet-tail">${tail}</g>${wings}<g class="pet-body"><path d="M102 173 Q75 204 93 248 Q143 279 209 247 Q228 199 190 174Z" fill="${c}"/><ellipse cx="151" cy="221" rx="40" ry="39" fill="${species === 'owl' ? '#ede1be' : '#efe1c4'}" stroke="none"/>${species === 'owl' ? '<path d="M122 216 l7 7 7-7 M153 222 l7 7 7-7 M141 243 l7 7 7-7" fill="none"/>' : ''}<g class="pet-feet"><ellipse cx="111" cy="257" rx="24" ry="11" fill="${c}"/><ellipse cx="190" cy="257" rx="24" ry="11" fill="${c}"/></g><g class="pet-arm"><path d="M100 195 Q81 203 92 224 Q106 229 115 216" fill="${c}"/></g><path d="M200 195 Q219 204 208 225 Q194 230 187 217" fill="${c}"/></g><g class="pet-head">${ears}${head}${snout}<g class="pet-eyes"><ellipse cx="117" cy="133" rx="${eye}" ry="${eye + 5}" fill="#526167" stroke="none"/><ellipse cx="184" cy="133" rx="${eye}" ry="${eye + 5}" fill="#526167" stroke="none"/><ellipse cx="119" cy="138" rx="${eye - 6}" ry="${eye - 3}" fill="${species === 'dragon' ? '#b2cdb8' : '#bea269'}" stroke="none"/><ellipse cx="186" cy="138" rx="${eye - 6}" ry="${eye - 3}" fill="${species === 'dragon' ? '#b2cdb8' : '#bea269'}" stroke="none"/><ellipse cx="119" cy="133" rx="5" ry="12" fill="#35484d" stroke="none"/><ellipse cx="186" cy="133" rx="5" ry="12" fill="#35484d" stroke="none"/><circle cx="111" cy="126" r="5" fill="#fffbea" stroke="none"/><circle cx="179" cy="126" r="5" fill="#fffbea" stroke="none"/></g><path class="sleep-eyes" d="M101 136 Q117 147 131 135 M170 136 Q185 147 199 135" fill="none" stroke-width="4"/><ellipse cx="94" cy="156" rx="12" ry="6" fill="#d58f84" opacity=".65" stroke="none"/><ellipse cx="208" cy="156" rx="12" ry="6" fill="#d58f84" opacity=".65" stroke="none"/>${species === 'owl' ? '<path d="M141 151 L152 145 L160 151 L151 165Z" fill="#dab96d"/>' : '<path d="M144 156 Q150 151 158 156 L151 162Z" fill="#705a55"/><path d="M151 163 Q142 174 135 165 M151 163 Q159 174 166 165" fill="none" stroke-width="2"/>'}${species === 'cat' ? '<path d="M135 85 L143 101 M151 83 L154 101 M168 86 L166 102 M85 139 L99 143 M203 143 L217 138" stroke="#a27e5e" stroke-width="4"/>' : ''}</g></g><g class="pet-hearts" fill="#cb817c"><path d="M53 94 C33 72 17 88 53 113 C89 88 73 72 53 94Z"/><path d="M257 84 C245 69 231 83 257 99 C282 83 270 70 257 84Z"/></g><g class="pet-zzz" fill="#668681" font-family="Georgia" font-size="24"><text x="221" y="81">z</text><text x="242" y="57">z</text></g></svg>`;
  }
  G.QWPets = { INFO, svg };
})(window);
