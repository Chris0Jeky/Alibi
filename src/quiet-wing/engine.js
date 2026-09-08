/* Pure, versioned state rules. No DOM, network, stored answers or clocks inside reducers. */
(function (G) {
  'use strict';
  const Calm = typeof module !== 'undefined' ? require('./calm.js') : G.QWCalm;
  const VERSION = 1,
    SIZE = 14,
    MAX_STACK = 4,
    clone = (x) => JSON.parse(JSON.stringify(x)),
    clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const TYPES = {
    cottage: ['Homes', 'Cottage', 'A little plaster house with a tiled roof.'],
    townhouse: ['Homes', 'Town house', 'A tall house for narrow streets.'],
    inn: ['Homes', 'Wayside inn', 'Half-timbered walls and a striped sign.'],
    library: ['Homes', 'Reading room', 'A quiet building with tall windows.'],
    tower: ['Castle', 'Round tower', 'A watchtower, merlons and a little pennant.'],
    keep: ['Castle', 'Great keep', 'The centrepiece of a tiny realm.'],
    wall: ['Castle', 'Curtain wall', 'Rotates to frame a courtyard.'],
    gate: ['Castle', 'Gatehouse', 'An open arch into your town.'],
    stone: ['Modules', 'Stone cube', 'A stackable foundation or wall module.'],
    timber: ['Modules', 'Timber cube', 'A stackable timber-framed floor.'],
    roof: ['Modules', 'Gabled roof', 'A roof that can cap a stack.'],
    spire: ['Modules', 'Spire roof', 'A pointed tower cap.'],
    farm: ['Countryside', 'Kitchen garden', 'Small, neatly planted rows.'],
    barn: ['Countryside', 'Red barn', 'A farm building with double doors.'],
    windmill: ['Countryside', 'Windmill', 'Four wooden sails over the fields.'],
    orchard: ['Countryside', 'Orchard', 'A fruit tree and a woven fence.'],
    tree: ['Nature', 'Round tree', 'A generous little crown.'],
    pine: ['Nature', 'Pine tree', 'Three tiers of evergreen.'],
    flowers: ['Nature', 'Flower patch', 'A bright scatter of wildflowers.'],
    pond: ['Nature', 'Lily pond', 'A shallow pool, reeds and lily pads.'],
    market: ['Details', 'Market stall', 'A striped canopy for a busy square.'],
    well: ['Details', 'Village well', 'A stone well under a pitched roof.'],
    lamp: ['Details', 'Lantern', 'A warm light for the lane.'],
    bridge: ['Details', 'Footbridge', 'A wooden span for shallow waterways.'],
    bench: ['Details', 'Garden bench', 'A place to watch the world.'],
    boat: ['Details', 'Little boat', 'A small red-sailed boat.'],
    castlebase: [
      'Modules',
      'Castle foundation',
      'Kenney stone tower foundation. Supports another floor.',
    ],
    castlefloor: ['Modules', 'Castle floor', 'A modular stone floor. Stack up to four pieces.'],
    castletop: ['Modules', 'Battlements', 'Crenellations to finish a tower.'],
    castleroof: ['Modules', 'Castle roof', 'A tall roof for a modular tower.'],
    castlecorner: ['Castle', 'Corner wall', 'Turn a castle wall through a right angle.'],
    castlestairs: ['Castle', 'Stone steps', 'An exterior stairway for the courtyard.'],
  };
  const SUPPORTS = ['stone', 'timber', 'castlebase', 'castlefloor'];
  const TERRAIN = ['meadow', 'stone', 'path', 'water', 'sand'];
  const PALETTES = {
    terracotta: ['#e8cf9a', '#c66b4c', '#657c74'],
    rose: ['#dfaa92', '#a94f51', '#596d68'],
    sage: ['#b6c5a1', '#6c8876', '#9b674e'],
    ochre: ['#e7c271', '#a45848', '#748a8d'],
    lavender: ['#c9bcda', '#766492', '#7c8c7c'],
  };
  const SIZES = [14, 20, 28];
  function emptyScene(size = SIZE) {
    if (!SIZES.includes(size)) throw Error('Choose a 14, 20 or 28 plot island.');
    return {
      schema: VERSION,
      kind: 'alibi-realm',
      id: 'little-bellweather',
      name: 'Little Bellweather',
      size,
      tiles: Array.from({ length: size * size }, () => ({
        ground: 'meadow',
        height: 0,
        items: [],
      })),
      camera: { angle: 0, view: 'isometric', zoom: 1 },
      sky: 'morning',
      pet: 'cat',
    };
  }
  function preset(which = 'harbour') {
    const s = emptyScene();
    s.name =
      which === 'harbour'
        ? 'Little Bellweather'
        : which === 'garden'
          ? 'The Walled Garden'
          : 'An Unwritten Island';
    if (which === 'empty') return s;
    const at = (x, y) => s.tiles[y * SIZE + x],
      put = (x, y, type, palette = 'terracotta', rot = 0) => {
        at(x, y).items.push({ type, palette, rot });
      };
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        let t = at(x, y);
        if (x < 2 || y > 11 || ((x + y) % 17 === 0 && x < 4)) {
          t.ground = 'water';
        } else if (x >= 7 && y <= 6) {
          t.height = 1;
          t.ground = 'stone';
        }
        if (x >= 8 && y <= 4) t.height = 2;
        if ((x === 5 || y === 8 || (x === 10 && y > 6)) && t.ground !== 'water') t.ground = 'path';
      }
    if (which === 'harbour') {
      put(10, 2, 'keep');
      put(8, 1, 'tower', 'sage');
      put(12, 1, 'tower');
      put(8, 4, 'tower', 'lavender');
      put(12, 4, 'tower');
      for (let x = 9; x < 12; x++) {
        put(x, 1, 'wall', 'terracotta', 0);
        if (x !== 10) put(x, 4, 'wall');
      }
      put(10, 4, 'gate');
      [
        [4, 3],
        [6, 3],
        [4, 5],
        [6, 6],
        [7, 8],
        [8, 9],
        [10, 7],
        [11, 9],
        [4, 10],
      ].forEach(([x, y], i) =>
        put(x, y, i % 3 === 0 ? 'townhouse' : 'cottage', Object.keys(PALETTES)[i % 5], i % 2),
      );
      put(7, 5, 'library', 'sage');
      put(6, 10, 'inn', 'rose');
      put(10, 10, 'market');
      put(9, 8, 'well');
      put(3, 7, 'windmill');
      put(3, 9, 'farm');
      put(4, 8, 'farm');
      put(11, 6, 'farm');
      put(12, 6, 'barn', 'rose');
      put(2, 5, 'bridge');
      put(1, 8, 'boat');
      put(9, 6, 'lamp');
      put(7, 10, 'bench');
      [
        [3, 2],
        [6, 1],
        [12, 10],
        [12, 8],
        [3, 10],
        [5, 11],
        [9, 11],
        [11, 11],
      ].forEach(([x, y], i) => put(x, y, i % 2 ? 'pine' : 'tree', 'sage'));
      put(7, 11, 'flowers');
    } else {
      for (let y = 2; y < 11; y++)
        for (let x = 2; x < 12; x++) {
          at(x, y).height = 0;
          at(x, y).ground = 'meadow';
        }
      for (let x = 2; x <= 11; x++) {
        put(x, 2, 'wall');
        put(x, 10, 'wall');
      }
      for (let y = 3; y < 10; y++) {
        put(2, y, 'wall', 'sage', 1);
        put(11, y, 'wall', 'sage', 1);
      }
      at(6, 10).items = [];
      put(6, 10, 'gate');
      for (let x = 4; x < 10; x++)
        for (let y = 4; y < 9; y += 2)
          put(x, y, x % 3 === 0 ? 'farm' : x % 2 ? 'flowers' : 'orchard');
      put(7, 5, 'pond');
      put(6, 3, 'library', 'sage');
      put(5, 9, 'bench');
    }
    return s;
  }
  function validateScene(x) {
    if (!x || x.schema !== VERSION || x.kind !== 'alibi-realm')
      throw Error('Unsupported realm format. Your current realm has not changed.');
    if (!SIZES.includes(x.size) || !Array.isArray(x.tiles) || x.tiles.length !== x.size * x.size)
      throw Error('A realm must have 14, 20 or 28 plots on each side.');
    if (typeof x.name !== 'string' || x.name.length > 64)
      throw Error('Realm names must be 64 characters or fewer.');
    const y = emptyScene(x.size);
    y.name = x.name.trim() || 'Untitled realm';
    y.id = typeof x.id === 'string' ? x.id.slice(0, 80) : y.id;
    y.tiles = x.tiles.map((t) => {
      if (
        !t ||
        !TERRAIN.includes(t.ground) ||
        !Number.isInteger(t.height) ||
        t.height < 0 ||
        t.height > 4 ||
        !Array.isArray(t.items) ||
        t.items.length > MAX_STACK
      )
        throw Error('Invalid terrain or excessive stack height.');
      if (
        t.items.slice(0, -1).some((o) => !SUPPORTS.includes(o?.type)) ||
        (t.ground === 'water' &&
          t.items.length &&
          !['stone', 'bridge', 'boat'].includes(t.items[0]?.type))
      )
        throw Error('A stack needs supporting cubes; water needs a foundation.');
      return {
        ground: t.ground,
        height: t.height,
        items: t.items.map((o) => {
          if (
            !o ||
            !Object.hasOwn(TYPES, o.type) ||
            !Object.hasOwn(PALETTES, o.palette) ||
            !Number.isInteger(o.rot) ||
            o.rot < 0 ||
            o.rot > 3
          )
            throw Error('Unknown model, colour, or rotation.');
          return { type: o.type, palette: o.palette, rot: o.rot };
        }),
      };
    });
    if (
      x.camera &&
      ['isometric', 'diorama', 'plan'].includes(x.camera.view) &&
      Number.isInteger(x.camera.angle) &&
      x.camera.angle >= 0 &&
      x.camera.angle <= 3 &&
      Number.isFinite(x.camera.zoom)
    )
      y.camera = {
        view: x.camera.view,
        angle: x.camera.angle,
        zoom: clamp(x.camera.zoom, 0.55, 2.7),
      };
    if (['morning', 'sunset', 'night'].includes(x.sky)) y.sky = x.sky;
    if (['cat', 'fox', 'owl', 'dragon'].includes(x.pet)) y.pet = x.pet;
    return y;
  }
  function editScene(s, a) {
    const index = a.index;
    if (!Number.isInteger(index) || index < 0 || index >= s.tiles.length)
      return { error: 'Choose a plot on the island.' };
    const t = s.tiles[index],
      n = clone(t);
    if (a.kind === 'build') {
      if (!Object.hasOwn(TYPES, a.type) || !Object.hasOwn(PALETTES, a.palette))
        return { error: 'Choose a model and colour.' };
      if (n.items.length >= MAX_STACK)
        return { error: 'Four modules is the stack limit. Remove one first.' };
      if (n.items.length && !SUPPORTS.includes(n.items.at(-1).type))
        return { error: 'Stack on a stone or timber cube. Remove the top model first.' };
      if (n.ground === 'water' && !n.items.length && !['bridge', 'boat', 'stone'].includes(a.type))
        return { error: 'Use a bridge, boat or stone foundation on water.' };
      n.items.push({
        type: a.type,
        palette: a.palette,
        rot: Number.isInteger(a.rot) ? ((a.rot % 4) + 4) % 4 : 0,
      });
    } else if (a.kind === 'erase') {
      if (!n.items.length) return { error: 'This plot is already empty.' };
      n.items.pop();
    } else if (a.kind === 'paint') {
      if (!TERRAIN.includes(a.ground)) return { error: 'Unknown ground.' };
      if (
        a.ground === 'water' &&
        n.items.length &&
        !['bridge', 'boat', 'stone'].includes(n.items[0].type)
      )
        return { error: 'Clear the building before flooding its plot.' };
      n.ground = a.ground;
    } else if (a.kind === 'raise') n.height = clamp(n.height + 1, 0, 4);
    else if (a.kind === 'lower') n.height = clamp(n.height - 1, 0, 4);
    else if (a.kind === 'turn') {
      if (!n.items.length) return { error: 'There is no model to turn.' };
      n.items.at(-1).rot = (n.items.at(-1).rot + 1) % 4;
    } else return { error: 'Unknown edit.' };
    if (JSON.stringify(t) === JSON.stringify(n)) return { error: 'No change at this plot.' };
    return { index, before: clone(t), after: n };
  }
  function applyEdit(s, patch, undo = false) {
    const n = clone(s);
    n.tiles[patch.index] = clone(undo ? patch.before : patch.after);
    return n;
  }
  function newState(now) {
    return {
      schema: 1,
      revision: 0,
      scene: preset(),
      pets: {
        selected: 'cat',
        names: { cat: 'Miso', fox: 'Fern', owl: 'Pip', dragon: 'Nimbus' },
        bond: { cat: 0, fox: 0, owl: 0, dragon: 0 },
        trip: null,
      },
      garden: { pots: Array.from({ length: 6 }, () => null), pressed: 0, visits: 0 },
      classics: {},
      badges: {},
      stats: {
        built: 0,
        removed: 0,
        exports: 0,
        petActions: 0,
        harvests: 0,
        walks: 0,
        views: [],
        species: [],
        solves: [],
        artSeen: [],
      },
      settings: { sound: false, haptic: false, motion: true, zen: false },
      savedAt: now,
    };
  }
  const CROPS = {
    clover: { name: 'Clover', seconds: 120, colour: '#8bb392' },
    lavender: { name: 'Lavender', seconds: 300, colour: '#a291c8' },
    sunflower: { name: 'Sunflower', seconds: 600, colour: '#efc457' },
  };
  function growth(pot, now) {
    if (!pot || !CROPS[pot.seed]) return 0;
    return clamp(
      Math.max(0, Math.min(now - pot.plantedAt, 8 * 3600000)) / (CROPS[pot.seed].seconds * 1000),
      0,
      1,
    );
  }
  function plant(s, i, seed, now) {
    if (!Number.isInteger(i) || i < 0 || i >= 6 || !CROPS[seed] || s.garden.pots[i]) return false;
    s.garden.pots[i] = { seed, plantedAt: now };
    return true;
  }
  function harvest(s, i, now) {
    const p = s.garden.pots[i];
    if (!p || growth(p, now) < 1) return false;
    s.garden.pots[i] = null;
    s.garden.pressed++;
    s.stats.harvests++;
    return true;
  }
  function classicInitial(id) {
    if (Calm?.definitions[id]) return Calm.initial(id);
    if (/^hanoi[345]$/.test(id)) {
      let n = +id.at(-1);
      return { id, n, pegs: [Array.from({ length: n }, (_, i) => n - i), [], []], moves: 0 };
    }
    if (/^slide-(town|wave|portrait|bedroom|sunday)$/.test(id)) {
      let tiles = [1, 2, 3, 4, 5, 6, 7, 8, 0],
        r = [...id].reduce((n, c) => n + c.charCodeAt(0), 17),
        previous = -1;
      for (let i = 0; i < 44; i++) {
        let z = tiles.indexOf(0),
          next = [z - 3, z + 3, z - 1, z + 1].filter(
            (k) =>
              k >= 0 &&
              k < 9 &&
              Math.abs((k % 3) - (z % 3)) + Math.abs(Math.floor(k / 3) - Math.floor(z / 3)) === 1 &&
              k !== previous,
          );
        r = (r * 1664525 + 1013904223) >>> 0;
        let k = next[r % next.length];
        [tiles[z], tiles[k]] = [tiles[k], tiles[z]];
        previous = z;
      }
      return { id, tiles, moves: 0 };
    }
    if (id === 'river') return { id, side: [0, 0, 0, 0], moves: 0 };
    if (id === 'jugs') return { id, v: [0, 0], moves: 0 };
    if (id === 'queens') return { id, q: [], moves: 0 };
    if (id === 'magic') return { id, values: [1, 2, 3, 4, 5, 6, 7, 8, 9], moves: 0 };
    if (id === 'knight') return { id, path: [], moves: 0 };
    throw Error('Unknown classic');
  }
  function classicMove(state, a) {
    if (Calm?.definitions[state.id]) return Calm.move(state, a);
    const s = clone(state);
    let error = '';
    if (s.id.startsWith('hanoi')) {
      if (![0, 1, 2].includes(a.from) || ![0, 1, 2].includes(a.to) || a.from === a.to)
        return { error: 'Choose two different pegs.' };
      const n = s.pegs[a.from].at(-1),
        top = s.pegs[a.to].at(-1);
      if (!n) return { error: 'That peg is empty.' };
      if (top && n > top) return { error: 'A larger disc cannot sit on a smaller disc.' };
      s.pegs[a.from].pop();
      s.pegs[a.to].push(n);
    } else if (s.id.startsWith('slide-')) {
      let k = a.cell,
        z = s.tiles.indexOf(0);
      if (
        !Number.isInteger(k) ||
        k < 0 ||
        k >= 9 ||
        Math.abs((k % 3) - (z % 3)) + Math.abs(Math.floor(k / 3) - Math.floor(z / 3)) !== 1
      )
        return { error: 'Only tiles next to the empty space can slide.' };
      [s.tiles[z], s.tiles[k]] = [s.tiles[k], s.tiles[z]];
    } else if (s.id === 'river') {
      const item = a.item;
      if (!Number.isInteger(item) || item < 0 || item > 3)
        return { error: 'Choose the ferryman or a passenger.' };
      if (item && s.side[item] !== s.side[0])
        return { error: 'That passenger is on the other bank.' };
      s.side[0] ^= 1;
      if (item) s.side[item] ^= 1;
      if (s.side[1] === s.side[2] && s.side[1] !== s.side[0])
        error = 'The wolf would be alone with the goat.';
      if (s.side[2] === s.side[3] && s.side[2] !== s.side[0])
        error = 'The goat would be alone with the cabbage.';
    } else if (s.id === 'jugs') {
      const caps = [3, 5],
        i = a.i,
        j = 1 - i;
      if (![0, 1].includes(i)) return { error: 'Choose a jug.' };
      if (a.kind === 'fill') s.v[i] = caps[i];
      else if (a.kind === 'empty') s.v[i] = 0;
      else if (a.kind === 'pour') {
        let k = Math.min(s.v[i], caps[j] - s.v[j]);
        s.v[i] -= k;
        s.v[j] += k;
      } else error = 'Unknown jug move.';
      if (s.v.toString() === state.v.toString()) error = 'That move would not change the water.';
    } else if (s.id === 'queens') {
      const k = a.cell;
      if (!Number.isInteger(k) || k < 0 || k >= 64) return { error: 'Choose a square.' };
      if (s.q.includes(k)) s.q = s.q.filter((v) => v !== k);
      else {
        const x = k % 8,
          y = Math.floor(k / 8);
        if (
          s.q.some(
            (v) =>
              v % 8 === x ||
              Math.floor(v / 8) === y ||
              Math.abs((v % 8) - x) === Math.abs(Math.floor(v / 8) - y),
          )
        )
          error = 'A queen already attacks this square.';
        else s.q.push(k);
      }
    } else if (s.id === 'magic') {
      if (
        !Number.isInteger(a.from) ||
        !Number.isInteger(a.to) ||
        a.from < 0 ||
        a.to < 0 ||
        a.from >= 9 ||
        a.to >= 9 ||
        a.from === a.to
      )
        return { error: 'Choose two tiles to swap.' };
      [s.values[a.from], s.values[a.to]] = [s.values[a.to], s.values[a.from]];
    } else if (s.id === 'knight') {
      let k = a.cell;
      if (!Number.isInteger(k) || k < 0 || k >= 25) return { error: 'Choose a square.' };
      if (s.path.includes(k)) error = 'Visit each square only once.';
      else if (s.path.length) {
        let p = s.path.at(-1),
          dx = Math.abs((k % 5) - (p % 5)),
          dy = Math.abs(Math.floor(k / 5) - Math.floor(p / 5));
        if (dx * dy !== 2) error = 'A knight moves two squares, then one sideways.';
      }
      if (!error) s.path.push(k);
    }
    if (error) return { error };
    s.moves++;
    return { state: s, won: classicWon(s) };
  }
  function classicWon(s) {
    if (Calm?.definitions[s.id]) return Calm.won(s);
    if (s.id.startsWith('slide-')) return s.tiles.every((n, i) => n === (i + 1) % 9);
    if (s.id.startsWith('hanoi')) return s.pegs[2].length === s.n;
    if (s.id === 'river') return s.side.every((x) => x === 1);
    if (s.id === 'jugs') return s.v.includes(4);
    if (s.id === 'queens') return s.q.length === 8;
    if (s.id === 'knight') return s.path.length === 25;
    if (s.id === 'magic') {
      const v = s.values;
      return [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
      ].every((q) => q.reduce((a, i) => a + v[i], 0) === 15);
    }
    return false;
  }
  const BADGES = [
    ['first-stone', 'First stone', 'Place your first model.', (s) => s.stats.built >= 1],
    ['hamlet', 'Village maker', 'Place 10 models.', (s) => s.stats.built >= 10],
    ['borough', 'A town of your own', 'Place 50 models.', (s) => s.stats.built >= 50],
    [
      'castle',
      'Castle keeper',
      'Have a keep and four towers.',
      (s) =>
        s.scene.tiles.flatMap((t) => t.items).filter((i) => i.type === 'tower').length >= 4 &&
        s.scene.tiles.some((t) => t.items.some((i) => i.type === 'keep')) &&
        s.stats.built > 0,
    ],
    [
      'gardener',
      'A green corner',
      'Place three different nature models.',
      (s) =>
        new Set(
          s.scene.tiles
            .flatMap((t) => t.items)
            .filter((i) => TYPES[i.type][0] === 'Nature')
            .map((i) => i.type),
        ).size >= 3 && s.stats.built > 0,
    ],
    [
      'architect',
      'Above the rooftops',
      'Build a three-module stack.',
      (s) => s.scene.tiles.some((t) => t.items.length >= 3),
    ],
    [
      'new-angle',
      'Another perspective',
      'Use all three camera views.',
      (s) => s.stats.views.length >= 3,
    ],
    ['postcard', 'Wish you were here', 'Export a realm postcard.', (s) => s.stats.exports >= 1],
    [
      'maker',
      'The model-maker',
      'Export your realm as a 3D model.',
      (s) => s.stats.objExports >= 1,
    ],
    ['hello', 'A new friend', 'Interact with a companion.', (s) => s.stats.petActions >= 1],
    [
      'menagerie',
      'Four little friends',
      'Spend time with all four species.',
      (s) => s.stats.species.length >= 4,
    ],
    [
      'kindred',
      'Familiar company',
      'Interact with companions 20 times.',
      (s) => s.stats.petActions >= 20,
    ],
    [
      'wanderer',
      'There and back',
      'Collect a completed woodland stroll.',
      (s) => s.stats.walks >= 1,
    ],
    ['seed', 'First shoots', 'Plant something.', (s) => s.stats.planted >= 1],
    ['pressed', 'Between the pages', 'Harvest your first bloom.', (s) => s.stats.harvests >= 1],
    ['herbarium', 'Small herbarium', 'Collect six blooms.', (s) => s.stats.harvests >= 6],
    [
      'hanoi',
      'Patient hands',
      'Complete a Hanoi tower.',
      (s) => s.stats.solves.some((x) => x.startsWith('hanoi')),
    ],
    [
      'ferryman',
      'A safe crossing',
      'Solve the river crossing.',
      (s) => s.stats.solves.includes('river'),
    ],
    ['measure', 'Precisely four', 'Solve the water jugs.', (s) => s.stats.solves.includes('jugs')],
    [
      'queens',
      'A quiet court',
      'Place eight peaceful queens.',
      (s) => s.stats.solves.includes('queens'),
    ],
    [
      'lo-shu',
      'Fifteen everywhere',
      'Solve the Lo Shu square.',
      (s) => s.stats.solves.includes('magic'),
    ],
    [
      'knight',
      'Every square',
      'Complete the knight’s tour.',
      (s) => s.stats.solves.includes('knight'),
    ],
    [
      'scholar',
      'The classical shelf',
      'Solve six different classic families.',
      (s) =>
        new Set(
          s.stats.solves
            .filter((x) => !x.startsWith('slide-'))
            .map((x) => (x.startsWith('hanoi') ? 'hanoi' : x)),
        ).size >= 6,
    ],
    [
      'restorer',
      'A picture, restored',
      'Finish a sliding picture puzzle.',
      (s) => s.stats.solves.some((x) => x.startsWith('slide-')),
    ],
    [
      'curator',
      'A closer look',
      'Open three museum artwork records.',
      (s) => s.stats.artSeen.length >= 3,
    ],
  ];
  function award(s, now) {
    const fresh = [];
    for (const [id, , , test] of BADGES) {
      if (!s.badges[id] && test(s)) {
        s.badges[id] = now;
        fresh.push(id);
      }
    }
    return fresh;
  }
  function validateState(o) {
    if (!o || o.schema !== 1) throw Error('Unknown save version. Kept unchanged.');
    let n = newState(Date.now());
    n.scene = validateScene(o.scene);
    if (!o.pets || !['cat', 'fox', 'owl', 'dragon'].includes(o.pets.selected))
      throw Error('Invalid companion.');
    n.pets.selected = o.pets.selected;
    for (const k of ['cat', 'fox', 'owl', 'dragon']) {
      n.pets.names[k] =
        typeof o.pets.names?.[k] === 'string' ? o.pets.names[k].slice(0, 30) : n.pets.names[k];
      n.pets.bond[k] = clamp(Number(o.pets.bond?.[k]) || 0, 0, 100000);
    }
    if (
      o.pets.trip &&
      Number.isFinite(o.pets.trip.started) &&
      Number.isFinite(o.pets.trip.duration) &&
      o.pets.trip.duration >= 30000 &&
      o.pets.trip.duration <= 3600000
    )
      n.pets.trip = {
        started: Math.min(o.pets.trip.started, Date.now()),
        duration: o.pets.trip.duration,
        species: ['cat', 'fox', 'owl', 'dragon'].includes(o.pets.trip.species)
          ? o.pets.trip.species
          : n.pets.selected,
      };
    if (!o.garden || !Array.isArray(o.garden.pots) || o.garden.pots.length !== 6)
      throw Error('Invalid garden.');
    n.garden.pots = o.garden.pots.map((p) => {
      if (!p) return null;
      if (!CROPS[p.seed] || !Number.isFinite(p.plantedAt)) throw Error('Invalid seed.');
      return { seed: p.seed, plantedAt: Math.min(p.plantedAt, Date.now()) };
    });
    n.garden.pressed = clamp(+o.garden.pressed || 0, 0, 1e6);
    for (const k of Object.keys(n.settings))
      n.settings[k] = typeof o.settings?.[k] === 'boolean' ? o.settings[k] : n.settings[k];
    for (const k of [
      'built',
      'removed',
      'exports',
      'objExports',
      'petActions',
      'harvests',
      'walks',
      'planted',
    ])
      n.stats[k] = clamp(+o.stats?.[k] || 0, 0, 1e7);
    for (const k of ['views', 'species', 'solves', 'artSeen'])
      n.stats[k] = Array.isArray(o.stats?.[k])
        ? o.stats[k].filter((x) => typeof x === 'string').slice(0, 100)
        : [];
    n.badges = {};
    for (const [id] of BADGES) if (Number.isFinite(o.badges?.[id])) n.badges[id] = o.badges[id];
    n.classics = {};
    /* Imported sessions are replay-validated, not trusted final boards. */ for (const [
      id,
      v,
    ] of Object.entries(o.classics || {})) {
      try {
        let st = classicInitial(id);
        if (!Array.isArray(v.actions) || v.actions.length > 5000) continue;
        for (const a of v.actions) {
          const r = classicMove(st, a);
          if (r.error) throw Error();
          st = r.state;
        }
        n.classics[id] = { actions: clone(v.actions), state: st };
      } catch {}
    }
    n.savedAt = Number.isFinite(o.savedAt) ? o.savedAt : Date.now();
    n.revision = Number.isInteger(o.revision) && o.revision >= 0 ? o.revision : 0;
    return n;
  }
  G.QWEngine = {
    VERSION,
    SIZE,
    SIZES,
    TYPES,
    SUPPORTS,
    TERRAIN,
    PALETTES,
    CROPS,
    BADGES,
    clone,
    clamp,
    preset,
    emptyScene,
    editScene,
    applyEdit,
    validateScene,
    newState,
    growth,
    plant,
    harvest,
    classicInitial,
    classicMove,
    classicWon,
    award,
    validateState,
  };
  if (typeof module !== 'undefined') module.exports = G.QWEngine;
})(typeof window === 'undefined' ? globalThis : window);
