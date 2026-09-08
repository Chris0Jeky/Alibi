'use strict';
// Retain selected CC0 OBJ sources, then bake their flat colour atlas into portable geometry.
const fs = require('node:fs'),
  path = require('node:path'),
  crypto = require('node:crypto'),
  sharp = require('sharp');
const root = path.resolve(__dirname, '..'),
  source = path.join(root, 'assets-source/quiet-wing/city');
const packs = {
  castle: [
    'tower-square-base',
    'tower-square-mid',
    'tower-square-top',
    'tower-square-roof',
    'tower-hexagon-base',
    'tower-hexagon-mid',
    'tower-hexagon-roof',
    'wall',
    'wall-corner',
    'wall-doorway',
    'stairs-stone',
    'bridge-straight',
  ],
  town: [
    'wall-window-shutters',
    'wall-wood-window-shutters',
    'wall-door',
    'wall-wood-door',
    'roof-gable',
    'roof-point',
    'tree',
    'tree-high',
    'lantern',
    'stall-red',
    'road',
    'road-bend',
  ],
};
const digest = (b) => crypto.createHash('sha256').update(b).digest('hex');
async function main() {
  // Collection is explicit; future builds use only the retained, repo-local inputs.
  for (const [i, pack] of ['castle', 'town'].entries()) {
    const from = process.argv[i + 2];
    if (!from) continue;
    const licence = fs.readFileSync(path.join(from, 'License.txt'));
    if (!licence.toString().includes('Creative Commons Zero, CC0'))
      throw Error('CC0 licence missing');
    const to = path.join(source, pack),
      models = path.join(from, 'Models/OBJ format');
    fs.mkdirSync(path.join(to, 'Textures'), { recursive: true });
    fs.writeFileSync(path.join(to, 'License.txt'), licence);
    fs.copyFileSync(
      path.join(models, 'Textures/colormap.png'),
      path.join(to, 'Textures/colormap.png'),
    );
    for (const name of packs[pack])
      for (const ext of ['obj', 'mtl'])
        fs.copyFileSync(path.join(models, name + '.' + ext), path.join(to, name + '.' + ext));
  }
  const output = {},
    receipts = [];
  for (const [pack, names] of Object.entries(packs)) {
    const dir = path.join(source, pack),
      atlas = fs.readFileSync(path.join(dir, 'Textures/colormap.png'));
    const { data, info } = await sharp(atlas)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (const name of names) {
      const bytes = fs.readFileSync(path.join(dir, name + '.obj'));
      const mtl = fs.readFileSync(path.join(dir, name + '.mtl'));
      if (!mtl.toString().includes('map_Kd Textures/colormap.png'))
        throw Error('Unexpected material texture');
      const vertices = [],
        uv = [],
        faces = [],
        colors = [];
      let texturedFaces = 0;
      const colorAt = ([u, v]) => {
        const x = Math.max(0, Math.min(info.width - 1, Math.floor(u * info.width)));
        const y = Math.max(0, Math.min(info.height - 1, Math.floor((1 - v) * info.height)));
        const offset = (y * info.width + x) * info.channels;
        return (
          '#' +
          [...data.subarray(offset, offset + 3)]
            .map((n) => n.toString(16).padStart(2, '0'))
            .join('')
        );
      };
      for (const line of bytes.toString().split(/\r?\n/)) {
        const [op, ...args] = line.trim().split(/\s+/);
        if (op === 'v') {
          const [x, y, z] = args.slice(0, 3).map(Number);
          if (![x, y, z].every(Number.isFinite)) throw Error('Nonfinite vertex');
          vertices.push([x + 0.5, 0.5 - z, y].map((n) => Math.round(n * 1e5) / 1e5));
        }
        if (op === 'vt') uv.push(args.slice(0, 2).map(Number));
        if (op === 'f') {
          const refs = args.map((a) => a.split('/').map(Number));
          if (
            refs.length < 3 ||
            refs.some(([v, t]) => v <= 0 || v > vertices.length || t <= 0 || t > uv.length)
          )
            throw Error('Unsupported OBJ face');
          const samples = refs.map(([, t]) => colorAt(uv[t - 1]));
          // Portable Canvas/SVG/OBJ use a face-centre colour; retain UVs for textured WebGL.
          const average = refs.reduce(
            (a, [, t]) => [a[0] + uv[t - 1][0] / refs.length, a[1] + uv[t - 1][1] / refs.length],
            [0, 0],
          );
          if (samples.some((c) => c !== samples[0]) || colorAt(average) !== samples[0])
            texturedFaces++;
          const sample = colorAt(average);
          let color = colors.indexOf(sample);
          if (color < 0) {
            color = colors.length;
            colors.push(sample);
          }
          faces.push([color, ...refs.map(([v]) => v - 1)]);
        }
      }
      if (!faces.length || vertices.length > 10000 || faces.length > 10000)
        throw Error('Model exceeds geometry budget');
      output[pack + '/' + name] = {
        v: vertices,
        f: faces,
        c: colors,
        height: Math.max(...vertices.map((v) => v[2])),
      };
      receipts.push({
        pack,
        model: name,
        objSHA256: digest(bytes),
        materialSHA256: digest(mtl),
        atlasSHA256: digest(atlas),
        vertices: vertices.length,
        faces: faces.length,
        texturedFaces,
        licence: 'CC0-1.0',
      });
    }
  }
  const asset = path.join(root, 'src/quiet-wing/assets/city-models.json');
  fs.writeFileSync(asset, JSON.stringify(output));
  fs.writeFileSync(
    path.join(source, 'receipt.json'),
    JSON.stringify(
      {
        recipe:
          'OBJ Y-up to Z-up; five-decimal positions; face-centre atlas colour approximation. Original UVs and atlases retained in source OBJ files.',
        assetSHA256: digest(fs.readFileSync(asset)),
        models: receipts,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(
    JSON.stringify({
      models: receipts.length,
      bytes: fs.statSync(asset).size,
      faces: receipts.reduce((n, r) => n + r.faces, 0),
    }),
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
