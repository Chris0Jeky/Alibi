/* Shared 3D geometry -> Canvas, WebGL, SVG and Wavefront OBJ. */
(function (G) {
  'use strict';
  const E = G.QWEngine;
  const importedCache = new Map();
  const LIBRARY_PIECES = {
    cottage: 'cottage-small',
    barn: 'farm-barn',
    farm: 'crop-rows',
    orchard: 'orchard',
    tree: 'tree-oak',
  };
  function imported(type, palette, rotation) {
    const libraryPiece = LIBRARY_PIECES[type],
      library = G.QWLibraryModels,
      libraryReady = libraryPiece && library?.[libraryPiece],
      pack = libraryReady ? library : G.QWCityModels;
    if (!pack) return null;
    const key = `${libraryReady ? 'library' : 'city'}:${type}:${palette}:${rotation}`;
    if (importedCache.has(key)) return importedCache.get(key);
    const faces = [];
    function add(id, turn = 0, up = 0, scale = 1) {
      const m = pack[id];
      if (!m) throw Error('Missing city model: ' + id);
      for (const [colour, ...indices] of m.f) {
        let color = m.c[colour];
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
        if (
          (id.includes('roof') && (g > r * 1.1 || b > r * 1.2)) ||
          (libraryReady && color === '#b76d52')
        )
          color = E.PALETTES[palette][1];
        faces.push({
          c: color,
          v: indices.map((i) => {
            let [x, y, z] = m.v[i];
            x = (x - 0.5) * scale + 0.5;
            y = (y - 0.5) * scale + 0.5;
            z = z * scale + up;
            for (let r = 0; r < (turn + rotation) % 4; r++) [x, y] = [1 - y, x];
            return [x, y, z];
          }),
        });
      }
    }
    const pieces = {
      castlebase: 'tower-square-base',
      castlefloor: 'tower-square-mid',
      castletop: 'tower-square-top',
      castleroof: 'tower-square-roof',
      castlecorner: 'wall-corner',
      castlestairs: 'stairs-stone',
      wall: 'wall',
      gate: 'wall-doorway',
      bridge: 'bridge-straight',
    };
    if (libraryReady) add(libraryPiece);
    else if (pieces[type]) add('castle/' + pieces[type]);
    else if (type === 'tower') {
      add('castle/tower-hexagon-base');
      add('castle/tower-hexagon-mid', 0, 1.31);
      add('castle/tower-hexagon-roof', 0, 1.77);
    } else if (type === 'keep') {
      add('castle/tower-square-base');
      add('castle/tower-square-mid', 0, 1.01);
      add('castle/tower-square-top', 0, 2.02);
    } else if (['cottage', 'townhouse', 'inn', 'library', 'barn'].includes(type)) {
      const floors = ['townhouse', 'library'].includes(type) ? 2 : 1;
      const wood = ['inn', 'barn'].includes(type) ? 'wood-' : '';
      for (let z = 0; z < floors; z++)
        for (let r = 0; r < 4; r++)
          add(`town/wall-${wood}${r === 0 && z === 0 ? 'door' : 'window-shutters'}`, r, z);
      add('town/' + (type === 'library' ? 'roof-point' : 'roof-gable'), 0, floors);
    } else if (type === 'tree' || type === 'pine')
      add('town/' + (type === 'tree' ? 'tree' : 'tree-high'), 0, 0, 0.65);
    else if (type === 'lamp') add('town/lantern');
    else if (type === 'market') add('town/stall-red', 0, 0, 1.4);
    else return null;
    importedCache.set(key, faces);
    return faces;
  }
  const shade = (hex, k) => {
    let a = hex.replace('#', '');
    if (a.length !== 6) return hex;
    return (
      '#' +
      [0, 2, 4]
        .map((i) =>
          Math.round(Math.min(255, parseInt(a.slice(i, i + 2), 16) * k))
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  };
  function model(type, palette = 'terracotta', rotation = 0, time = 0) {
    const asset = imported(type, palette, rotation);
    if (asset) return asset;
    const faces = [],
      p = E.PALETTES[palette] || E.PALETTES.terracotta;
    let wall = p[0],
      roof = p[1],
      wood = '#71584a',
      stone = '#c9cab5',
      ink = '#3f5558',
      glass = '#597a81';
    const poly = (v, c) => faces.push({ v, c });
    function box(x, y, z, w, d, h, c = wood) {
      let A = [x, y, z],
        B = [x + w, y, z],
        C = [x + w, y + d, z],
        D = [x, y + d, z],
        a = [x, y, z + h],
        b = [x + w, y, z + h],
        c1 = [x + w, y + d, z + h],
        d1 = [x, y + d, z + h];
      poly([A, D, C, B], shade(c, 0.62));
      poly([A, B, b, a], shade(c, 0.86));
      poly([B, C, c1, b], shade(c, 0.75));
      poly([C, D, d1, c1], shade(c, 0.89));
      poly([D, A, a, d1], shade(c, 0.79));
      poly([a, b, c1, d1], c);
    }
    function cone(x, y, z, r, h, c, n = 8) {
      let top = [x, y, z + h];
      for (let i = 0; i < n; i++) {
        let a = (i * 2 * Math.PI) / n,
          b = ((i + 1) * 2 * Math.PI) / n;
        poly(
          [
            [x + Math.cos(a) * r, y + Math.sin(a) * r, z],
            [x + Math.cos(b) * r, y + Math.sin(b) * r, z],
            top,
          ],
          shade(c, 0.85 + 0.15 * Math.sin(a + 1)),
        );
      }
    }
    function cylinder(x, y, z, r, h, c, n = 10) {
      let cap = [];
      for (let i = 0; i < n; i++) {
        let a = (i * 2 * Math.PI) / n,
          b = ((i + 1) * 2 * Math.PI) / n,
          A = [x + Math.cos(a) * r, y + Math.sin(a) * r, z],
          B = [x + Math.cos(b) * r, y + Math.sin(b) * r, z];
        poly(
          [A, B, [B[0], B[1], z + h], [A[0], A[1], z + h]],
          shade(c, 0.85 + 0.13 * Math.sin(a + 1)),
        );
        cap.push([A[0], A[1], z + h]);
      }
      poly(cap, c);
    }
    function gable(x, y, z, w, d, h, c) {
      poly(
        [
          [x, y, z],
          [x + w, y, z],
          [x + w / 2, y, z + h],
        ],
        shade(wall, 0.93),
      );
      poly(
        [
          [x + w, y + d, z],
          [x, y + d, z],
          [x + w / 2, y + d, z + h],
        ],
        shade(wall, 0.8),
      );
      poly(
        [
          [x, y, z],
          [x + w / 2, y, z + h],
          [x + w / 2, y + d, z + h],
          [x, y + d, z],
        ],
        shade(c, 0.92),
      );
      poly(
        [
          [x + w / 2, y, z + h],
          [x + w, y, z],
          [x + w, y + d, z],
          [x + w / 2, y + d, z + h],
        ],
        shade(c, 1.1),
      );
      for (let k = 1; k < 5; k++) {
        let q = k / 5;
        box(x + (q * w) / 2 - 0.006, y, z + q * h, 0.012, d, 0.009, shade(c, 0.79));
        box(x + w - (q * w) / 2 - 0.006, y, z + q * h, 0.012, d, 0.009, shade(c, 0.88));
      }
    }
    function window(x, y, z, w = 0.13, h = 0.18, axis = 0) {
      if (!axis) {
        box(x, y, z, w, 0.025, h, wood);
        box(x + 0.017, y + 0.026, z + 0.017, w - 0.034, 0.009, h - 0.034, glass);
        box(x + w / 2 - 0.009, y + 0.04, z + 0.012, 0.018, 0.012, h - 0.023, wall);
      } else {
        box(x, y, z, 0.025, w, h, wood);
        box(x + 0.027, y + 0.017, z + 0.017, 0.008, w - 0.034, h - 0.034, glass);
      }
    }
    function house(h = 0.68, w = 0.72, d = 0.7) {
      box(0.5 - w / 2, 0.5 - d / 2, 0, w, d, h, wall);
      gable(0.5 - w / 2 - 0.07, 0.5 - d / 2 - 0.065, h, w + 0.14, d + 0.13, 0.35, roof);
      box(0.18, 0.18, h + 0.1, 0.12, 0.15, 0.35, stone);
      box(0.17, 0.17, h + 0.4, 0.14, 0.17, 0.05, wood);
      box(0.4, 0.5 + d / 2 + 0.005, 0, 0.18, 0.026, 0.29, wood);
      box(0.44, 0.5 + d / 2 + 0.035, 0.04, 0.1, 0.009, 0.21, shade(wood, 1.2));
      window(0.23, 0.5 + d / 2 + 0.005, 0.4);
      window(0.63, 0.5 + d / 2 + 0.005, 0.4);
      window(0.5 + w / 2 + 0.005, 0.25, 0.3, 0.12, 0.17, 1);
    }
    function flag(z) {
      box(0.46, 0.46, z, 0.035, 0.035, 0.57, wood);
      poly(
        [
          [0.5, 0.48, z + 0.52],
          [0.81, 0.48, z + 0.44],
          [0.5, 0.48, z + 0.31],
        ],
        roof,
      );
    }
    function tree(x = 0.5, y = 0.5, z = 0, small = 1, fruit = false) {
      cylinder(x, y, z, 0.055 * small, 0.38 * small, wood, 6);
      cone(x, y, z + 0.32 * small, 0.34 * small, 0.28 * small, '#72936b', 8);
      cone(x, y, z + 0.46 * small, 0.3 * small, 0.31 * small, '#90ae7d', 8);
      cone(x, y, z + 0.65 * small, 0.22 * small, 0.19 * small, '#a2b986', 8);
      if (fruit)
        for (let i = 0; i < 5; i++) {
          let a = i * 1.3;
          box(
            x + Math.cos(a) * 0.23,
            y + Math.sin(a) * 0.23,
            z + 0.5,
            0.055,
            0.055,
            0.055,
            '#cf7c54',
          );
        }
    }
    function fence() {
      for (let i = 0; i < 5; i++) box(0.1 + i * 0.19, 0.86, 0, 0.04, 0.04, 0.25, wood);
      box(0.1, 0.855, 0.08, 0.8, 0.045, 0.03, wood);
      box(0.1, 0.855, 0.18, 0.8, 0.045, 0.03, wood);
    }
    switch (type) {
      case 'cottage':
        house();
        break;
      case 'townhouse':
        house(1.05, 0.65, 0.7);
        window(0.3, 0.858, 0.73, 0.12, 0.17);
        window(0.6, 0.858, 0.73, 0.12, 0.17);
        box(0.14, 0.13, 0.61, 0.72, 0.75, 0.035, wood);
        break;
      case 'inn':
        house(0.92, 0.8, 0.8);
        for (let i = 0; i < 3; i++) box(0.12 + i * 0.36, 0.903, 0.03, 0.035, 0.02, 0.86, wood);
        box(0.1, 0.902, 0.54, 0.81, 0.021, 0.03, wood);
        poly(
          [
            [0.17, 0.932, 0.57],
            [0.19, 0.932, 0.57],
            [0.44, 0.932, 0.87],
            [0.42, 0.932, 0.87],
          ],
          wood,
        );
        box(0.9, 0.55, 0.6, 0.025, 0.07, 0.4, wood);
        box(0.9, 0.55, 0.83, 0.18, 0.03, 0.03, wood);
        box(1.04, 0.55, 0.69, 0.13, 0.05, 0.13, '#cbac66');
        break;
      case 'library':
        house(0.83, 0.85, 0.76);
        window(0.22, 0.89, 0.28, 0.17, 0.37);
        window(0.63, 0.89, 0.28, 0.17, 0.37);
        box(0.35, 0.935, 0.72, 0.3, 0.02, 0.09, '#caaf6e');
        break;
      case 'barn':
        house(0.64, 0.8, 0.8);
        box(0.32, 0.919, 0.03, 0.4, 0.03, 0.43, shade(roof, 0.85));
        box(0.5, 0.95, 0.03, 0.024, 0.01, 0.43, wall);
        break;
      case 'stone':
        box(0.03, 0.03, 0, 0.94, 0.94, 0.56, stone);
        for (let j = 1; j < 3; j++) {
          box(0.02, 0.975, j * 0.18, 0.96, 0.012, 0.01, shade(stone, 0.73));
          box(0.975, 0.025, j * 0.18, 0.012, 0.95, 0.01, shade(stone, 0.73));
        }
        break;
      case 'timber':
        box(0.04, 0.04, 0, 0.92, 0.92, 0.6, wall);
        for (let i = 0; i < 3; i++) {
          box(0.04 + i * 0.445, 0.966, 0, 0.025, 0.012, 0.6, wood);
          box(0.966, 0.04 + i * 0.445, 0, 0.012, 0.025, 0.6, wood);
        }
        box(0.04, 0.966, 0.3, 0.92, 0.012, 0.025, wood);
        box(0.966, 0.04, 0.3, 0.012, 0.92, 0.025, wood);
        break;
      case 'roof':
        gable(-0.02, -0.02, 0.04, 1.04, 1.04, 0.55, roof);
        break;
      case 'spire':
        cone(0.5, 0.5, 0, 0.62, 1.1, roof, 8);
        flag(0.88);
        break;
      case 'keep':
        box(0.04, 0.05, 0, 0.92, 0.9, 1.3, wall);
        box(0, 0, 1.25, 1, 1, 0.12, stone);
        for (let i = 0; i < 4; i++) {
          box(i * 0.27, 0, 1.36, 0.16, 0.15, 0.19, stone);
          box(i * 0.27, 0.85, 1.36, 0.16, 0.15, 0.19, stone);
          if (i > 0 && i < 3) {
            box(0, i * 0.27, 1.36, 0.15, 0.16, 0.19, stone);
            box(0.85, i * 0.27, 1.36, 0.15, 0.16, 0.19, stone);
          }
        }
        window(0.19, 0.959, 0.67, 0.13, 0.28);
        window(0.66, 0.959, 0.67, 0.13, 0.28);
        window(0.959, 0.23, 0.7, 0.13, 0.28, 1);
        box(0.35, 0.96, 0, 0.3, 0.025, 0.46, wood);
        box(0.2, 0.22, 1.37, 0.6, 0.56, 0.36, wall);
        gable(0.14, 0.16, 1.73, 0.72, 0.69, 0.45, roof);
        flag(2.06);
        break;
      case 'tower':
        cylinder(0.5, 0.5, 0, 0.35, 1.36, stone, 12);
        cylinder(0.5, 0.5, 1.27, 0.41, 0.15, wall, 12);
        for (let i = 0; i < 8; i++) {
          let a = (i * Math.PI) / 4;
          box(
            0.5 + Math.cos(a) * 0.31 - 0.075,
            0.5 + Math.sin(a) * 0.31 - 0.075,
            1.4,
            0.15,
            0.15,
            0.2,
            wall,
          );
        }
        window(0.45, 0.847, 0.82, 0.1, 0.26);
        cone(0.5, 0.5, 1.5, 0.27, 0.48, roof, 8);
        flag(1.83);
        break;
      case 'wall':
        box(0, 0.33, 0, 1, 0.33, 0.64, stone);
        box(0, 0.31, 0.57, 1, 0.37, 0.1, wall);
        for (let i = 0; i < 4; i++) box(i * 0.27, 0.31, 0.66, 0.18, 0.37, 0.17, wall);
        for (let i = 1; i < 4; i++) box(0, 0.665, i * 0.15, 1, 0.009, 0.009, shade(stone, 0.76));
        break;
      case 'gate':
        box(0.03, 0.3, 0, 0.25, 0.43, 0.95, stone);
        box(0.72, 0.3, 0, 0.25, 0.43, 0.95, stone);
        box(0.28, 0.3, 0.7, 0.44, 0.43, 0.25, stone);
        gable(0, 0.24, 0.95, 1, 0.55, 0.33, roof);
        box(0.27, 0.72, 0.65, 0.46, 0.035, 0.05, wood);
        break;
      case 'windmill':
        cylinder(0.5, 0.5, 0, 0.28, 0.97, wall, 8);
        cone(0.5, 0.5, 0.93, 0.37, 0.49, roof, 8);
        for (let k = 0; k < 4; k++) {
          let a = (k * Math.PI) / 2 + time * 0.0003,
            u = Math.sin(a),
            v = Math.cos(a),
            cx = 0.5,
            cz = 0.89;
          poly(
            [
              [cx + u * 0.08 - v * 0.05, 0.845, cz + v * 0.08 + u * 0.05],
              [cx + u * 0.73 - v * 0.1, 0.845, cz + v * 0.73 + u * 0.1],
              [cx + u * 0.73 + v * 0.1, 0.845, cz + v * 0.73 - u * 0.1],
              [cx + u * 0.08 + v * 0.05, 0.845, cz + v * 0.08 - u * 0.05],
            ],
            '#e7d6ab',
          );
        }
        box(0.47, 0.86, 0.86, 0.07, 0.04, 0.07, wood);
        break;
      case 'farm':
        box(0.04, 0.05, 0, 0.91, 0.9, 0.055, '#a88d60');
        for (let row = 0; row < 4; row++) {
          box(0.08, 0.12 + row * 0.2, 0.06, 0.8, 0.09, 0.035, '#7b6850');
          for (let i = 0; i < 5; i++)
            cone(
              0.15 + i * 0.15,
              0.16 + row * 0.2,
              0.09,
              0.053,
              0.11,
              row % 2 ? '#90ac5b' : '#d2ba69',
              4,
            );
        }
        fence();
        break;
      case 'orchard':
        tree(0.5, 0.43, 0, 0.95, true);
        fence();
        break;
      case 'tree':
        tree();
        break;
      case 'pine':
        cylinder(0.5, 0.5, 0, 0.06, 0.35, wood);
        for (let i = 0; i < 3; i++)
          cone(0.5, 0.5, 0.22 + i * 0.26, 0.37 - i * 0.075, 0.53, shade('#598879', 1 + i * 0.1), 7);
        break;
      case 'flowers':
        for (let i = 0; i < 14; i++) {
          let x = 0.13 + ((i * 37) % 73) / 100,
            y = 0.12 + ((i * 53) % 74) / 100;
          box(x, y, 0, 0.018, 0.018, 0.14 + (i % 3) * 0.04);
          cone(
            x,
            y,
            0.14 + (i % 3) * 0.04,
            0.045,
            0.04,
            ['#d79285', '#e3c96c', '#b49cc4'][i % 3],
            6,
          );
        }
        break;
      case 'pond':
        cylinder(0.5, 0.5, 0, 0.43, 0.06, '#9bafa0', 12);
        cylinder(0.5, 0.5, 0.061, 0.37, 0.015, '#77aaaa', 12);
        for (let i = 0; i < 3; i++)
          cylinder(0.35 + i * 0.12, 0.4 + i * 0.09, 0.081, 0.07, 0.008, '#96ad6a', 7);
        break;
      case 'market':
        for (let x of [0.13, 0.85]) for (let y of [0.17, 0.8]) box(x, y, 0, 0.04, 0.04, 0.65, wood);
        box(0.08, 0.61, 0.08, 0.84, 0.22, 0.31, wood);
        for (let i = 0; i < 5; i++)
          gable(0.05 + i * 0.18, 0.09, 0.66, 0.18, 0.81, 0.13, i % 2 ? '#ebd8a9' : roof);
        for (let i = 0; i < 5; i++)
          box(0.16 + i * 0.14, 0.66, 0.39, 0.1, 0.1, 0.06, i % 2 ? '#88a568' : '#d2995b');
        break;
      case 'well':
        cylinder(0.5, 0.5, 0, 0.29, 0.27, stone, 12);
        cylinder(0.5, 0.5, 0.271, 0.2, 0.007, ink);
        for (let x of [0.15, 0.81]) box(x, 0.45, 0, 0.04, 0.07, 0.71, wood);
        gable(0.05, 0.22, 0.72, 0.9, 0.56, 0.3, roof);
        break;
      case 'lamp':
        box(0.44, 0.44, 0, 0.13, 0.13, 0.08, stone);
        box(0.485, 0.485, 0.08, 0.03, 0.03, 0.83, wood);
        box(0.41, 0.41, 0.84, 0.18, 0.18, 0.23, '#f4d98d');
        cone(0.5, 0.5, 1.07, 0.16, 0.13, wood, 4);
        break;
      case 'bridge':
        for (let i = 0; i < 9; i++)
          box(i * 0.115, 0.14, 0.08 + Math.sin((i / 8) * Math.PI) * 0.09, 0.105, 0.72, 0.05, wood);
        for (let x of [0.08, 0.85])
          for (let y of [0.14, 0.85]) box(x, y, 0.06, 0.035, 0.035, 0.34, wood);
        box(0, 0.13, 0.37, 1, 0.035, 0.035, wood);
        box(0, 0.85, 0.37, 1, 0.035, 0.035, wood);
        break;
      case 'bench':
        box(0.15, 0.35, 0.2, 0.72, 0.24, 0.06, wood);
        box(0.15, 0.31, 0.27, 0.72, 0.04, 0.22, wood);
        for (let x of [0.21, 0.74]) box(x, 0.36, 0, 0.06, 0.15, 0.22, ink);
        break;
      case 'boat':
        poly(
          [
            [0.1, 0.25, 0.08],
            [0.5, 0.06, 0.08],
            [0.9, 0.25, 0.08],
            [0.81, 0.77, 0.08],
            [0.5, 0.93, 0.08],
            [0.19, 0.77, 0.08],
          ],
          wood,
        );
        box(0.48, 0.4, 0.07, 0.025, 0.025, 0.8, wood);
        poly(
          [
            [0.5, 0.42, 0.84],
            [0.5, 0.42, 0.23],
            [0.91, 0.42, 0.26],
          ],
          roof,
        );
        poly(
          [
            [0.47, 0.42, 0.73],
            [0.47, 0.42, 0.26],
            [0.2, 0.42, 0.27],
          ],
          '#e4d6b2',
        );
        break;
    }
    // Object rotation is independent from camera rotation.
    if (rotation)
      for (const f of faces)
        f.v = f.v.map(([x, y, z]) => {
          for (let i = 0; i < rotation; i++) [x, y] = [1 - y, x];
          return [x, y, z];
        });
    return faces;
  }
  const HEIGHT = {
    stone: 0.56,
    timber: 0.6,
    roof: 0.6,
    spire: 1.6,
    castlebase: 1.01,
    castlefloor: 1.01,
    castletop: 0.3,
    castleroof: 2.01,
  };
  function worldMeshes(scene) {
    let tiles = [];
    for (let y = 0; y < scene.size; y++)
      for (let x = 0; x < scene.size; x++) {
        let t = scene.tiles[y * scene.size + x],
          z = t.height * 0.43,
          faces = [],
          g = {
            meadow: '#a6b58d',
            path: '#a6b58d',
            stone: '#b8b6a6',
            water: '#76a8a8',
            sand: '#dbc99b',
          }[t.ground];
        const push = (v, c) => faces.push({ v, c });
        push(
          [
            [x, y, z],
            [x + 1, y, z],
            [x + 1, y + 1, z],
            [x, y + 1, z],
          ],
          g,
        );
        for (let side of [
          [
            [x, y, -0.5],
            [x + 1, y, -0.5],
            [x + 1, y, z],
            [x, y, z],
          ],
          [
            [x + 1, y, -0.5],
            [x + 1, y + 1, -0.5],
            [x + 1, y + 1, z],
            [x + 1, y, z],
          ],
          [
            [x + 1, y + 1, -0.5],
            [x, y + 1, -0.5],
            [x, y + 1, z],
            [x + 1, y + 1, z],
          ],
          [
            [x, y + 1, -0.5],
            [x, y, -0.5],
            [x, y, z],
            [x, y + 1, z],
          ],
        ])
          push(side, shade(t.ground === 'water' ? '#6b9193' : '#8c9c82', 0.85));
        if (t.ground === 'path') {
          const links = roadLinks(scene, y * scene.size + x);
          const height = (u, v) => {
            if (v < 0.25 && links[0] !== null)
              return z + Math.max(0, links[0] - t.height) * 0.43 * (0.25 - v) * 4;
            if (u > 0.75 && links[1] !== null)
              return z + Math.max(0, links[1] - t.height) * 0.43 * (u - 0.75) * 4;
            if (v > 0.75 && links[2] !== null)
              return z + Math.max(0, links[2] - t.height) * 0.43 * (v - 0.75) * 4;
            if (u < 0.25 && links[3] !== null)
              return z + Math.max(0, links[3] - t.height) * 0.43 * (0.25 - u) * 4;
            return z;
          };
          const paved = (u, v) =>
            (u >= 0.25 && u <= 0.75 && v >= 0.25 && v <= 0.75) ||
            (u >= 0.25 &&
              u <= 0.75 &&
              ((v < 0.25 && links[0] !== null) || (v > 0.75 && links[2] !== null))) ||
            (v >= 0.25 &&
              v <= 0.75 &&
              ((u > 0.75 && links[1] !== null) || (u < 0.25 && links[3] !== null)));
          for (let row = 0; row < 4; row++)
            for (let col = 0; col < 4; col++) {
              if (!paved((col + 0.5) / 4, (row + 0.5) / 4)) continue;
              const u = col / 4,
                v = row / 4,
                gap = 0.012;
              const corners = [
                [u + gap, v + gap],
                [u + 0.25 - gap, v + gap],
                [u + 0.25 - gap, v + 0.25 - gap],
                [u + gap, v + 0.25 - gap],
              ];
              push(
                corners.map(([a, b]) => [x + a, y + b, height(a, b) + 0.007]),
                (row + col) % 2 ? '#c9b795' : '#dbcaab',
              );
            }
        }
        let level = z;
        for (const item of t.items) {
          for (const f of model(item.type, item.palette, item.rot))
            faces.push({ v: f.v.map(([a, b, c]) => [a + x, b + y, c + level]), c: f.c });
          level += HEIGHT[item.type] || 0.8;
        }
        tiles.push({ x, y, z, faces, index: y * scene.size + x });
      }
    return tiles;
  }
  function roadLinks(scene, index) {
    const x = index % scene.size,
      y = Math.floor(index / scene.size),
      tile = scene.tiles[index];
    return [
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
      [x - 1, y],
    ].map(([a, b]) => {
      if (a < 0 || b < 0 || a >= scene.size || b >= scene.size) return null;
      const next = scene.tiles[b * scene.size + a];
      return Math.abs(next.height - tile.height) <= 1 &&
        (next.ground === 'path' ||
          next.items.some((piece) => ['bridge', 'gate'].includes(piece.type)))
        ? next.height
        : null;
    });
  }
  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.zoom = 1;
      this.pan = { x: 0, y: 0 };
      this.angle = 0;
      this.view = 'isometric';
      this.scene = null;
      this.hit = [];
      this.faces = [];
      this.unit = 30;
      this.dpr = Math.min(devicePixelRatio || 1, 2);
      this.base = document.createElement('canvas');
      this.lastMs = 0;
      this.selection = -1;
    }
    setScene(s) {
      this.scene = s;
      if (this.selection >= s.tiles.length) this.selection = -1;
      this.mesh = worldMeshes(s);
      this.render();
    }
    rotatePoint(x, y) {
      const m = this.scene?.size || 14;
      x -= m / 2;
      y -= m / 2;
      for (let i = 0; i < this.angle; i++) [x, y] = [-y, x];
      return [x, y];
    }
    project(x, y, z = 0) {
      let [u, v] = this.rotatePoint(x, y),
        k = this.unit * this.zoom;
      if (this.view === 'plan')
        return [this.w / 2 + this.pan.x + u * k * 1.38, this.h * 0.52 + this.pan.y + v * k * 1.38];
      let h = this.view === 'diorama' ? 0.34 : 0.52;
      return [
        this.w / 2 + this.pan.x + (u - v) * k,
        this.h * 0.57 + this.pan.y + (u + v) * k * h - z * k * 1.17,
      ];
    }
    resize() {
      const b = this.canvas.getBoundingClientRect();
      if (!b.width || !b.height) return;
      this.w = b.width;
      this.h = b.height;
      this.unit = Math.min(this.w / (this.scene.size * 2 + 3), this.h / (this.scene.size + 4));
      this.canvas.width = Math.round(this.w * this.dpr);
      this.canvas.height = Math.round(this.h * this.dpr);
      this.base.width = this.canvas.width;
      this.base.height = this.canvas.height;
      this.render();
    }
    visible(v) {
      if (v.length < 3) return false;
      const [a, b, c] = v,
        ab = b.map((n, i) => n - a[i]),
        ac = c.map((n, i) => n - a[i]);
      let nx = ab[1] * ac[2] - ab[2] * ac[1],
        ny = ab[2] * ac[0] - ab[0] * ac[2],
        nz = ab[0] * ac[1] - ab[1] * ac[0];
      for (let i = 0; i < this.angle; i++) [nx, ny] = [-ny, nx];
      return this.view === 'plan' ? nz > 0 : nx + ny + nz * 1.5 > 0;
    }
    render() {
      if (!this.scene || !this.w) return;
      let start = performance.now(),
        c = this.base.getContext('2d');
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      c.clearRect(0, 0, this.w, this.h);
      let colors = {
        morning: ['#dbe7dd', '#a8c4bb'],
        sunset: ['#efdfc5', '#c5ad9b'],
        night: ['#293e4a', '#47616a'],
      }[this.scene.sky] || ['#dbe7dd', '#a8c4bb'];
      let grad = c.createLinearGradient(0, 0, 0, this.h);
      grad.addColorStop(0, colors[0]);
      grad.addColorStop(1, colors[1]);
      c.fillStyle = grad;
      c.fillRect(0, 0, this.w, this.h);
      c.fillStyle = this.scene.sky === 'night' ? '#435b66' : '#eff0d7';
      c.beginPath();
      c.arc(this.w * 0.82, this.h * 0.14, 29, 0, Math.PI * 2);
      c.fill();
      // An understated topographic backdrop, not an image dependency.
      c.strokeStyle = this.scene.sky === 'night' ? '#ffffff0b' : '#ffffff25';
      c.lineWidth = 1;
      for (let i = 0; i < 7; i++) {
        c.beginPath();
        c.ellipse(
          this.w * 0.48,
          this.h * 0.62,
          this.w * 0.29 + i * 33,
          this.h * 0.18 + i * 14,
          -0.09,
          0,
          Math.PI * 2,
        );
        c.stroke();
      }
      this.hit = [];
      this.faces = [];
      let tiles = this.mesh.slice().sort((a, b) => {
        let [ax, ay] = this.rotatePoint(a.x, a.y),
          [bx, by] = this.rotatePoint(b.x, b.y);
        return ax + ay - bx - by;
      });
      for (const tile of tiles) {
        let faces = tile.faces.filter((f) => this.visible(f.v));
        faces.sort((a, b) => this.depth(a) - this.depth(b));
        for (let f of faces) {
          let points = f.v.map((v) => this.project(...v));
          if (
            points.every((p) => p[0] < -100) ||
            points.every((p) => p[0] > this.w + 100) ||
            points.every((p) => p[1] < -100) ||
            points.every((p) => p[1] > this.h + 100)
          )
            continue;
          let colour = this.scene.sky === 'night' ? shade(f.c, 0.62) : f.c;
          this.polygon(c, points, colour);
          this.faces.push({ v: f.v, p: points, c: colour, index: tile.index });
        }
        this.hit.push({
          index: tile.index,
          p: [
            [tile.x, tile.y, tile.z],
            [tile.x + 1, tile.y, tile.z],
            [tile.x + 1, tile.y + 1, tile.z],
            [tile.x, tile.y + 1, tile.z],
          ].map((v) => this.project(...v)),
        });
      }
      this.lastMs = performance.now() - start;
      this.paint();
    }
    depth(f) {
      return (
        f.v.reduce((v, p) => {
          let [x, y] = this.rotatePoint(p[0], p[1]);
          return v + x + y + p[2] * 1.5;
        }, 0) / f.v.length
      );
    }
    polygon(c, p, fill, stroke = '#46585455') {
      if (!p.length) return;
      c.beginPath();
      c.moveTo(...p[0]);
      for (let i = 1; i < p.length; i++) c.lineTo(...p[i]);
      c.closePath();
      c.fillStyle = fill;
      c.fill();
      if (stroke) {
        c.strokeStyle = stroke;
        c.lineWidth = 0.55;
        c.stroke();
      }
    }
    paint(selection = this.selection, ghost = null) {
      this.selection = selection;
      const c = this.ctx;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.drawImage(this.base, 0, 0);
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (selection >= 0) {
        const t = this.scene.tiles[selection],
          x = selection % this.scene.size,
          y = Math.floor(selection / this.scene.size),
          z = t.height * 0.43;
        const p = [
          [x, y, z + 0.03],
          [x + 1, y, z + 0.03],
          [x + 1, y + 1, z + 0.03],
          [x, y + 1, z + 0.03],
        ].map((v) => this.project(...v));
        this.polygon(c, p, '#fff1b94d', '#faf0b9');
        if (ghost) {
          let level = z + t.items.reduce((a, i) => a + (HEIGHT[i.type] || 0.8), 0);
          c.globalAlpha = 0.65;
          for (const f of model(ghost.type, ghost.palette, ghost.rot).filter((f) =>
            this.visible(f.v),
          )) {
            this.polygon(
              c,
              f.v.map(([a, b, d]) => this.project(x + a, y + b, level + d)),
              f.c,
              '#fff7d8',
            );
          }
          c.globalAlpha = 1;
        }
      }
    }
    pick(px, py) {
      for (let i = this.faces.length - 1; i >= 0; i--)
        if (inPoly(px, py, this.faces[i].p)) return this.faces[i].index;
      return -1;
    }
    svg() {
      let esc = (x) =>
        String(x).replace(
          /[&<>"']/g,
          (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c],
        );
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}"><title>${esc(this.scene.name)}</title><rect width="100%" height="100%" fill="#dbe7dd"/><g stroke="#465854" stroke-opacity=".4" stroke-width=".5" stroke-linejoin="round">${this.faces.map((f) => `<polygon fill="${f.c}" points="${f.p.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ')}"/>`).join('')}</g><text x="24" y="${this.h - 24}" font-family="Georgia,serif" fill="#294d50" font-size="16">${esc(this.scene.name)} · Alibi</text></svg>`;
    }
    obj() {
      let output = ['# Alibi realm schema 1. Z is up. Units are plots.', 'mtllib realm.mtl'],
        mats = {},
        idx = 1;
      for (const t of this.mesh) {
        output.push(`o plot_${t.x}_${t.y}`);
        for (const f of t.faces) {
          let key = 'm' + f.c.slice(1);
          mats[key] = f.c;
          output.push('usemtl ' + key);
          for (const v of f.v) output.push('v ' + v.map((n) => n.toFixed(5)).join(' '));
          output.push('f ' + f.v.map((_, i) => idx + i).join(' '));
          idx += f.v.length;
        }
      }
      let mtl = Object.entries(mats)
        .map(
          ([name, hex]) =>
            `newmtl ${name}\nKd ${[0, 2, 4].map((i) => (parseInt(hex.slice(1 + i, 3 + i), 16) / 255).toFixed(5)).join(' ')}\nKa 0.2 0.2 0.2\nd 1\n`,
        )
        .join('\n');
      return { obj: output.join('\n'), mtl };
    }
  }
  function inPoly(x, y, p) {
    let inside = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const a = p[i],
        b = p[j];
      if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
        inside = !inside;
    }
    return inside;
  }
  function thumbnail(type, palette = 'terracotta') {
    let fs = model(type, palette).map((f) => ({ c: f.c, v: f.v }));
    let pr = ([x, y, z]) => [60 + (x - y) * 35, 76 + (x + y - 1) * 17 - z * 32];
    let visible = (v) => {
      const [a, b, c] = v;
      let u = b.map((n, i) => n - a[i]),
        w = c.map((n, i) => n - a[i]);
      return (
        u[1] * w[2] - u[2] * w[1] + u[2] * w[0] - u[0] * w[2] + (u[0] * w[1] - u[1] * w[0]) * 1.5 >
        0
      );
    };
    fs = fs
      .filter((f) => visible(f.v))
      .sort(
        (a, b) =>
          a.v.reduce((n, p) => n + p[0] + p[1] + p[2] * 1.5, 0) / a.v.length -
          b.v.reduce((n, p) => n + p[0] + p[1] + p[2] * 1.5, 0) / b.v.length,
      );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" aria-hidden="true"><ellipse cx="60" cy="89" rx="35" ry="11" fill="#293e4a12"/><g stroke="#46585470" stroke-width=".65" stroke-linejoin="round">${fs
      .map(
        (f) =>
          `<polygon fill="${f.c}" points="${f.v
            .map((p) =>
              pr(p)
                .map((x) => x.toFixed(1))
                .join(','),
            )
            .join(' ')}"/>`,
      )
      .join('')}</g></svg>`;
  }
  G.QWRealm = { Renderer, model, worldMeshes, roadLinks, thumbnail, shade, HEIGHT };
})(typeof window === 'undefined' ? globalThis : window);
