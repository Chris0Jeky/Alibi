/* Reproducible content generation. Run intentionally, not during normal builds. */
const fs = require('node:fs'),
  path = require('node:path');
require('../src/core.js');
const C = require('../src/engines.js'),
  X = C.extras,
  R = C.registry;
const ROOT = path.resolve(__dirname, '..');
let seed = 9042026;
function rnd() {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
}
const pick = (a) => a[Math.floor(rnd() * a.length)],
  shuffle = (a) =>
    a
      .map((x) => [rnd(), x])
      .sort((a, b) => a[0] - b[0])
      .map((x) => x[1]),
  range = C.range;
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/legacy.json'), 'utf8'));
pack.version = 2;
pack.title = 'Alibi · The complete cabinet';
pack.author = 'Alibi';
const titles = {
  dossier: [
    'The duplicate key',
    'A coat by the door',
    'The violet envelope',
    'The borrowed watch',
    'The gallery ledger',
    'A ticket to nowhere',
    'The last appointment',
    'The blue umbrella',
  ],
  witness: [
    'Four accounts of midnight',
    'The missing miniature',
    'A curious confession',
    'The sealed study',
    'The concert interval',
    'A room without a clock',
    'The courier’s story',
    'One last contradiction',
  ],
  lightup: [
    'First light',
    'The west passage',
    'Paper lanterns',
    'The night gallery',
    'A little illumination',
    'The quiet arcade',
    'Windows after dark',
    'Light the way',
  ],
  tents: [
    'A clearing in the woods',
    'Under the pines',
    'Camp by the stream',
    'No neighbours tonight',
    'The north meadow',
    'A place to rest',
    'Beyond the ridge',
    'A perfect little campsite',
  ],
  aquarium: [
    'A drop of blue',
    'The tide room',
    'Still waters',
    'The glass house',
    'An uneven shore',
    'Deep blue',
    'Water finds a way',
    'The final waterline',
  ],
  network: [
    'A signal in the static',
    'Switchboard',
    'The copper route',
    'The night operator',
    'Connected rooms',
    'Across the wire',
    'Every little connection',
    'An unbroken signal',
  ],
  trail: [
    'Follow the numbers',
    'The garden path',
    'A turn for the better',
    'Step by step',
    'The long way home',
    'Between the lines',
    'An unexpected turn',
    'No square left behind',
  ],
};
const settings = [
  'Briar House',
  'The Night Train',
  'Bellweather Gallery',
  'The Old Observatory',
  'The Glasshouse',
  'The Harbour Hotel',
  'The Reading Room',
  'The Winter Lodge',
];
function base(type, k, size) {
  return {
    id: `${type}-${String(k + 1).padStart(2, '0')}`,
    revision: 1,
    type,
    title: titles[type][k],
    subtitle: settings[k],
    size,
    difficulty: k < 2 ? 'Gentle' : k < 6 ? 'Steady' : 'Tricky',
  };
}
function unique(p, max = 180000) {
  try {
    return C.solve(p, null, 2, max).solutions.length === 1;
  } catch {
    return false;
  }
}
function accept(p) {
  C.validateDefinition(p);
  if (!unique(p, 250000)) throw Error('Not unique: ' + p.id);
  pack.puzzles.push(p);
  console.log(p.id, p.size, p.clues?.length || '');
}
for (let k = 0; k < 6; k++) {
  const p = C.createSceneDraft({
    seed: 190 + k * 33,
    title: [
      'At the observatory',
      'A letter never sent',
      'The locked conservatory',
      'The midnight auction',
      'After the storm',
      'The last invitation',
    ][k],
    setting: [
      'Briar House',
      'Bellweather Gallery',
      'The Glasshouse',
      'The Harbour Hotel',
      'The Winter Lodge',
      'Briar House',
    ][k],
    names: [
      ['Iris', 'Theo', 'Mina', 'Otto', 'Evelyn'],
      ['Vera', 'Leon', 'Nora', 'Silas', 'Arthur'],
      ['Ada', 'Jude', 'Rose', 'Hugo', 'Ellis'],
    ][k % 3],
  });
  p.id = 'scene-' + String(k + 13).padStart(2, '0');
  p.story = [
    'A final gathering in the old observatory ended in silence. All five people were somewhere in the house. Reconstruct their positions; the suspect who shared the victim’s room is the killer.',
    'After the private viewing, a letter was found beside the victim. Four guests insist they were elsewhere. Every clue in the file is true. Reconstruct the scene before making an accusation.',
    'The storm kept five guests indoors. By midnight, one was dead. Furniture fixes the shape of the scene. The remaining evidence will tell you who was alone with the victim.',
  ][k % 3];
  p.difficulty = k < 2 ? 'Gentle' : k < 4 ? 'Steady' : 'Tricky';
  accept(p);
}
const nameSets = [
  ['Iris', 'Theo', 'Mina', 'Otto'],
  ['Ada', 'Leon', 'Nora', 'Silas'],
  ['Vera', 'Jude', 'Rose', 'Hugo'],
  ['June', 'Miles', 'Felix', 'Ava'],
];
for (let k = 0; k < 8; k++) {
  const n = 4,
    p = base('dossier', k, n);
  p.people = nameSets[k % 4];
  p.categories = [
    {
      name: 'Room',
      values: [
        ['study', 'gallery', 'lounge', 'kitchen'],
        ['lobby', 'library', 'studio', 'terrace'],
      ][k % 2],
    },
    {
      name: 'Object',
      values: [
        ['brass key', 'blue envelope', 'pocket watch', 'ivory ticket'],
        ['silver pen', 'red notebook', 'glass pendant', 'leather case'],
      ][k % 2],
    },
  ];
  p.solution = [...shuffle(range(n)), ...shuffle(range(n))];
  p.targetItem = k % 4;
  p.story = `A small but valuable object disappeared from ${settings[k]}. Each person visited a different room and carried a different object. A reliable camera record links the theft to whoever carried the ${p.categories[1].values[p.targetItem]}. Match both categories, then identify that person.`;
  let pool = [];
  for (let cat = 0; cat < 2; cat++)
    for (let who = 0; who < n; who++) {
      pool.push({ kind: 'eq', cat, who, value: p.solution[cat * n + who] });
      for (let value = 0; value < n; value++)
        if (value !== p.solution[cat * n + who]) pool.push({ kind: 'ne', cat, who, value });
    }
  for (let who = 0; who < n; who++)
    pool.push({ kind: 'link', a: p.solution[who], b: p.solution[n + who] });
  p.clues = shuffle(pool);
  for (const cl of shuffle(p.clues.slice())) {
    const prev = p.clues;
    p.clues = p.clues.filter((c) => c !== cl);
    if (!p.clues.length || !unique(p)) p.clues = prev;
  }
  p.clues.sort((a, b) => (a.kind === 'link' ? -1 : b.kind === 'link' ? 1 : 0));
  accept(p);
}
for (let k = 0; k < 8; k++) {
  const p = base('witness', k, 4);
  p.people = nameSets[k % 4];
  p.story = `The ${['miniature portrait', 'sealed envelope', 'silver compass', 'gallery key'][k % 4]} vanished during a brief power cut at ${settings[k]}. Exactly one of these four people took it. Statements refer only to that theft; nobody else could have done it.`;
  for (let attempt = 0; attempt < 10000; attempt++) {
    p.solution = Math.floor(rnd() * 4);
    p.statements = range(k < 3 ? 4 : 5).map((_, i) => {
      const kind = pick(['is', 'not', 'oneof']);
      return {
        speaker: ['The porter', 'The cleaner', 'The courier', 'The caretaker', 'The musician'][i],
        kind,
        suspects: shuffle(range(4)).slice(0, kind === 'oneof' ? 2 : 1),
      };
    });
    p.trueCount = p.statements.filter((c) => X.truth(c, p.solution)).length;
    if (
      p.trueCount >= 1 &&
      p.trueCount < p.statements.length &&
      new Set(p.statements.map((c) => c.kind + c.suspects.slice().sort().join())).size ===
        p.statements.length &&
      unique(p)
    )
      break;
  }
  accept(p);
}
for (let k = 0; k < 8; k++) {
  let p;
  for (let attempt = 0; attempt < 5000; attempt++) {
    const n = k < 4 ? 5 : 6;
    p = base('lightup', k, n);
    p.walls = range(n * n).map(() => (rnd() < 0.25 ? -1 : -2));
    if (p.walls.filter((v) => v === -1).length < 4) continue;
    p.solution = range(n * n).map(() => 0);
    for (const i of shuffle(range(n * n).filter((i) => p.walls[i] === -2))) {
      const lit = X.litCells(p, { cells: p.solution });
      if (!lit.has(i)) p.solution[i] = 1;
    }
    p.walls = p.walls.map((v, i) =>
      v === -1 ? X.adj(i, n).filter((j) => p.solution[j] === 1).length : v,
    );
    if (unique(p)) {
      for (const i of shuffle(range(n * n).filter((i) => p.walls[i] >= 0))) {
        const old = p.walls[i];
        p.walls[i] = -1;
        if (!unique(p)) p.walls[i] = old;
      }
      break;
    }
  }
  accept(p);
}
for (let k = 0; k < 8; k++) {
  let p;
  for (let attempt = 0; attempt < 10000; attempt++) {
    const n = k < 4 ? 5 : 6;
    p = base('tents', k, n);
    const ts = [];
    for (const i of shuffle(range(n * n))) {
      if (ts.length === (n === 5 ? 5 : 7)) break;
      if (ts.every((j) => !X.near(i, j, n))) ts.push(i);
    }
    if (ts.length < (n === 5 ? 5 : 7)) continue;
    p.trees = [];
    let bad = false;
    for (const t of ts) {
      const choices = X.adj(t, n).filter((j) => !ts.includes(j) && !p.trees.includes(j));
      if (!choices.length) {
        bad = true;
        break;
      }
      p.trees.push(pick(choices));
    }
    if (bad) continue;
    p.solution = range(n * n).map((i) => (ts.includes(i) ? 1 : 0));
    const counts = X.lineCounts(p, p.solution);
    p.rowTargets = counts.rows;
    p.colTargets = counts.cols;
    if (unique(p)) break;
  }
  accept(p);
}
for (let k = 0; k < 8; k++) {
  let p;
  for (let attempt = 0; attempt < 10000; attempt++) {
    const n = k < 4 ? 5 : 6,
      pcount = n === 5 ? 6 : 7;
    p = base('aquarium', k, n);
    p.tanks = range(n * n).map(() => -1);
    const seeds = shuffle(range(n * n)).slice(0, pcount);
    seeds.forEach((v, i) => (p.tanks[v] = i));
    let unfilled = true;
    while (unfilled) {
      unfilled = false;
      const frontier = [];
      for (let i = 0; i < n * n; i++)
        if (p.tanks[i] === -1) {
          unfilled = true;
          const nei = X.adj(i, n).filter((j) => p.tanks[j] >= 0);
          if (nei.length) frontier.push([i, p.tanks[pick(nei)]]);
        }
      if (frontier.length) {
        const [i, t] = pick(frontier);
        p.tanks[i] = t;
      }
    }
    const rows = X.tankRows(p);
    if (rows.some((r) => r.length > 4)) continue;
    p.solution = rows.map((r) => Math.floor(rnd() * (r.length + 1)));
    const cells = X.aquariumCells(p, { levels: p.solution }),
      counts = X.lineCounts(p, cells);
    if (cells.filter((v) => v === 1).length < 6 || cells.filter((v) => v === 0).length < 5)
      continue;
    p.rowTargets = counts.rows;
    p.colTargets = counts.cols;
    if (unique(p)) break;
  }
  accept(p);
}
for (let k = 0; k < 8; k++) {
  let p;
  for (let attempt = 0; attempt < 500; attempt++) {
    const n = k < 3 ? 4 : k < 7 ? 5 : 6;
    p = base('network', k, n);
    const masks = range(n * n).map(() => 0),
      visited = new Set([0]),
      stack = [0];
    while (stack.length) {
      const i = stack[stack.length - 1],
        choices = range(4).filter((d) => X.step(i, d, n) >= 0 && !visited.has(X.step(i, d, n)));
      if (!choices.length) {
        stack.pop();
        continue;
      }
      const d = pick(choices),
        j = X.step(i, d, n);
      masks[i] |= X.bits[d];
      masks[j] |= X.op[d];
      visited.add(j);
      stack.push(j);
    }
    p.source = Math.floor((n * n) / 2);
    p.locked = [];
    const rotations = range(n * n).map(() => Math.floor(rnd() * 4));
    p.tiles = masks.map((m, i) => X.rot(m, rotations[i]));
    p.solution = masks.map((m, i) => range(4).find((r) => X.rot(p.tiles[i], r) === m));
    if (unique(p)) break;
  }
  accept(p);
}
function randomHamilton(n) {
  let nodes = 0;
  const used = new Set(),
    out = [];
  function go(i) {
    if (++nodes > 300000) return false;
    used.add(i);
    out.push(i);
    if (out.length === n * n) return true;
    const options = shuffle(X.adj(i, n).filter((j) => !used.has(j))).sort(
      (a, b) =>
        X.adj(a, n).filter((j) => !used.has(j)).length -
        X.adj(b, n).filter((j) => !used.has(j)).length,
    );
    for (const j of options) if (go(j)) return true;
    used.delete(i);
    out.pop();
    return false;
  }
  return go(pick(range(n * n))) ? out : null;
}
for (let k = 0; k < 8; k++) {
  const n = k < 3 ? 4 : 5,
    p = base('trail', k, n);
  let h;
  while (!h) h = randomHamilton(n);
  p.solution = range(n * n).map(() => 0);
  h.forEach((i, v) => (p.solution[i] = v + 1));
  p.givens = p.solution.slice();
  for (const i of shuffle(range(n * n).filter((i) => ![1, n * n].includes(p.solution[i])))) {
    const val = p.givens[i];
    p.givens[i] = 0;
    if (!unique(p, 120000)) p.givens[i] = val;
  }
  accept(p);
}
// Editorial metadata is additive; preserve old puzzle definitions/revisions for save compatibility.
for (const p of pack.puzzles) {
  p.collection = ['scene', 'dossier', 'witness'].includes(p.type)
    ? 'mystery'
    : ['lightup', 'tents', 'aquarium', 'network', 'nonogram', 'trail'].includes(p.type)
      ? 'visual'
      : 'classic';
  p.minutes =
    p.type === 'witness'
      ? [3, 5, 7][['Gentle', 'Steady', 'Tricky'].indexOf(p.difficulty)]
      : [5, 10, 15][['Gentle', 'Steady', 'Tricky'].indexOf(p.difficulty)];
}
fs.writeFileSync(path.join(ROOT, 'content/catalog.json'), JSON.stringify(pack, null, 2) + '\n');
const books = [
  {
    id: 'briar-house',
    title: 'The Briar House papers',
    tagline: 'A stolen key. A silent house. Four pieces of evidence.',
    setting: 'An old country house, after dark',
    color: 'green',
    icon: 'scene',
    intro:
      'An envelope arrives with no return address. Inside: a floor plan, four witness accounts, a torn photograph and a note asking you to reconstruct the last evening at Briar House. The puzzles form an anthology investigation; each chapter teaches a different kind of deduction.',
    chapters: [
      {
        id: 'witness-01',
        name: 'Conflicting accounts',
        brief: 'Start with the statements. Only the specified number can be true.',
      },
      {
        id: 'dossier-01',
        name: 'The duplicate key',
        brief: 'Match people, rooms and objects to identify the key’s carrier.',
      },
      {
        id: 'nonogram-05',
        name: 'The torn photograph',
        brief: 'Rebuild the shape left in the photograph.',
      },
      {
        id: 'scene-13',
        name: 'The last room',
        brief: 'Place everyone on the floor plan, then name the murderer.',
      },
    ],
    ending:
      'You have reconstructed the house’s four records: statements, possessions, a photograph and the final scene. The investigation is complete. Every puzzle remains available for another look.',
  },
  {
    id: 'night-train',
    title: 'The midnight departure',
    tagline: 'A stopped clock. A lost signal. Nobody leaves yet.',
    setting: 'An overnight train on the coast',
    color: 'blue',
    icon: 'network',
    intro:
      'The night train stops between stations. You have four records from the carriage and its signal box. Restore the signal, trace a route, compare the statements, then reconstruct the carriage. Each record is a standalone logic puzzle in this casebook.',
    chapters: [
      {
        id: 'network-01',
        name: 'A signal in the static',
        brief: 'Turn each tile until the whole network connects.',
      },
      {
        id: 'trail-02',
        name: 'The conductor’s route',
        brief: 'Follow the numbers through every square.',
      },
      {
        id: 'witness-06',
        name: 'The clockless room',
        brief: 'Test the witnesses’ accounts against the truth count.',
      },
      {
        id: 'scene-02',
        name: 'A quiet carriage',
        brief: 'Rebuild the scene before the train departs.',
      },
    ],
    ending:
      'The records are in order and the signal is clear. You have completed the midnight departure casebook.',
  },
  {
    id: 'glasshouse',
    title: 'Secrets under glass',
    tagline: 'Follow the water. Turn on the lights. Find the truth.',
    setting: 'A botanical conservatory in winter',
    color: 'amber',
    icon: 'aquarium',
    intro:
      'The conservatory caretaker has left four puzzles among the records. The water levels and lighting plan are the first pieces. An inventory and a floor plan complete the file. Solve them in sequence or open any chapter.',
    chapters: [
      {
        id: 'aquarium-02',
        name: 'The tide room',
        brief: 'Fill the glass tanks to match the edge clues.',
      },
      {
        id: 'lightup-03',
        name: 'Paper lanterns',
        brief: 'Light every floor tile without crossing beams.',
      },
      {
        id: 'dossier-03',
        name: 'The violet envelope',
        brief: 'Make the connections in the inventory.',
      },
      {
        id: 'scene-15',
        name: 'The locked conservatory',
        brief: 'Place the five people and close the case.',
      },
    ],
    ending:
      'Water, light, inventory and floor plan: the conservatory file is complete. The casebook is ready to archive.',
  },
];
fs.writeFileSync(path.join(ROOT, 'content/casebooks.json'), JSON.stringify(books, null, 2) + '\n');
console.log('TOTAL', pack.puzzles.length, 'TYPES', C.TYPES.length);
