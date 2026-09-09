'use strict';

// Converts the selected original Realm GLBs into the compact geometry used by
// Canvas, WebGL, SVG and OBJ exports. Source GLBs are glTF Y-up; Quiet Wing
// stores one-plot geometry with Z up.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', '..');
const source = path.join(root, 'assets-source', 'library', 'realm', 'glb');
const details = path.join(root, 'assets-source', 'library', 'realm', 'details');
const output = path.join(root, 'src', 'quiet-wing', 'assets', 'library-models.json');
const MODELS = {
  'cottage-small': path.join(source, 'cottage-small.glb'),
  'farm-barn': path.join(source, 'farm-barn.glb'),
  'crop-rows': path.join(source, 'crop-rows.glb'),
  orchard: path.join(source, 'orchard.glb'),
  'tree-oak': path.join(source, 'tree-oak.glb'),
  boat: path.join(details, 'boat.glb'),
  bench: path.join(details, 'bench.glb'),
  'well-fountain': path.join(details, 'well-fountain.glb'),
};
const componentSize = { 5121: 1, 5123: 2, 5125: 4, 5126: 4 };
const componentReader = {
  5121: (view, offset) => view.getUint8(offset),
  5123: (view, offset) => view.getUint16(offset, true),
  5125: (view, offset) => view.getUint32(offset, true),
  5126: (view, offset) => view.getFloat32(offset, true),
};
const arity = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readGlb(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2)
    throw Error(`Expected a glTF 2.0 GLB: ${file}`);
  let offset = 12,
    json,
    binary;
  while (offset < bytes.length) {
    const length = bytes.readUInt32LE(offset),
      kind = bytes.readUInt32LE(offset + 4),
      chunk = bytes.subarray(offset + 8, offset + 8 + length);
    if (kind === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').trim());
    if (kind === 0x004e4942) binary = chunk;
    offset += length + 8;
  }
  if (!json || !binary) throw Error(`GLB is missing JSON or binary data: ${file}`);
  return { json, binary };
}

function accessor(glb, index) {
  const a = glb.json.accessors[index],
    view = glb.json.bufferViews[a.bufferView];
  if (!a || !view || !componentReader[a.componentType] || !arity[a.type])
    throw Error(`Unsupported accessor ${index}`);
  const width = arity[a.type],
    size = componentSize[a.componentType],
    stride = view.byteStride || width * size,
    base = (view.byteOffset || 0) + (a.byteOffset || 0),
    data = new DataView(glb.binary.buffer, glb.binary.byteOffset, glb.binary.byteLength),
    read = componentReader[a.componentType];
  const values = [];
  for (let i = 0; i < a.count; i++) {
    const row = [];
    for (let j = 0; j < width; j++) row.push(read(data, base + i * stride + j * size));
    values.push(width === 1 ? row[0] : row);
  }
  return values;
}

function hex(material = {}) {
  const value = material.pbrMetallicRoughness?.baseColorFactor || [0.7, 0.7, 0.7];
  return (
    '#' +
    value
      .slice(0, 3)
      .map((channel) =>
        Math.round(Math.max(0, Math.min(1, channel)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}

function convert(file) {
  const glb = readGlb(file),
    result = { v: [], f: [], c: [] },
    colours = new Map();
  for (const mesh of glb.json.meshes || [])
    for (const primitive of mesh.primitives || []) {
      if (primitive.mode !== undefined && primitive.mode !== 4)
        throw Error(`Only triangle geometry is supported in ${file}`);
      const positions = accessor(glb, primitive.attributes?.POSITION);
      const indices =
        primitive.indices === undefined
          ? positions.map((_, index) => index)
          : accessor(glb, primitive.indices);
      if (indices.length % 3) throw Error(`Triangle indices are incomplete in ${file}`);
      const colour = hex(glb.json.materials?.[primitive.material]);
      let colourIndex = colours.get(colour);
      if (colourIndex === undefined) {
        colourIndex = result.c.length;
        result.c.push(colour);
        colours.set(colour, colourIndex);
      }
      const start = result.v.length;
      // The masters are two Blender units across. GLB converts Blender Z-up to
      // glTF Y-up, so [x, y, z] becomes [x, z, y] after scaling to one plot.
      for (const [x, y, z] of positions)
        result.v.push([+(x / 2 + 0.5).toFixed(5), +(z / 2 + 0.5).toFixed(5), +(y / 2).toFixed(5)]);
      // Swapping glTF Y and Z changes handedness, so reverse each triangle to
      // retain the outward-facing winding used by the Canvas and WebGL paths.
      for (let i = 0; i < indices.length; i += 3)
        result.f.push([
          colourIndex,
          start + indices[i],
          start + indices[i + 2],
          start + indices[i + 1],
        ]);
    }
  if (!result.v.length || !result.f.length) throw Error(`No triangle geometry found in ${file}`);
  return result;
}

function build() {
  return Object.fromEntries(Object.entries(MODELS).map(([name, file]) => [name, convert(file)]));
}

function main() {
  const data = JSON.stringify(build());
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8').trim() !== data)
      throw Error('library-models.json is stale; run node tools/assets/import-library-models.cjs');
    return;
  }
  fs.writeFileSync(output, data + '\n');
}

if (require.main === module) main();
module.exports = { MODELS, build, convert };
