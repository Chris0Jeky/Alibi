'use strict';
// Exports the current QWPets SVG geometry as named, layered practical-state rigs.
const fs = require('node:fs'),
  path = require('node:path'),
  vm = require('node:vm'),
  sharp = require('sharp');
const root = path.resolve(__dirname, '..', '..'),
  out = path.join(root, 'assets-source/library/companions');
const states = ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'];
const source = fs.readFileSync(path.join(root, 'src/quiet-wing/pets.js'), 'utf8'),
  sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const pets = sandbox.window.QWPets;
const style = `<style>
svg{background:#f4ead4}.pet-tail{transform-origin:180px 215px}.pet-head{transform-origin:150px 155px}.pet-arm{transform-origin:105px 205px}.pet-hearts,.pet-zzz{opacity:0}.state-look .pet-head{transform:rotate(-7deg)}.state-attention .pet-ears{transform:translateY(-5px)}.state-happy .pet-hearts,.state-celebrate .pet-hearts,.state-sleepy .pet-zzz{opacity:1}.state-sleepy .pet-eyes{opacity:0}.state-pet .pet-head{transform:rotate(9deg)}.state-feed .pet-arm{transform:rotate(-18deg)}.state-celebrate .pet-body{transform:translateY(-15px)}@media(prefers-reduced-motion:reduce){*{animation:none!important}}</style>`;
function rig(species, state) {
  let svg = pets.svg(species, state, `${pets.INFO[species].name} · ${state}`);
  svg = svg
    .replace('class="pet-svg', 'class="state-' + state + ' pet-svg')
    .replace('><ellipse cx="153"', '>' + style + '<ellipse cx="153"')
    .replace('class="pet-tail"', 'id="tail" class="pet-tail"')
    .replace('class="pet-head"', 'id="head" class="pet-head"')
    .replace('class="pet-body"', 'id="body" class="pet-body"')
    .replace('class="pet-arm"', 'id="arm" class="pet-arm"')
    .replace('class="pet-eyes"', 'id="eyes" class="pet-eyes"')
    .replace('class="pet-hearts"', 'id="hearts" class="pet-hearts"')
    .replace('class="pet-zzz"', 'id="sleep" class="pet-zzz"');
  return svg;
}
async function main() {
  fs.mkdirSync(path.join(out, 'rigs'), { recursive: true });
  fs.mkdirSync(path.join(out, 'thumbnails'), { recursive: true });
  const catalogue = [];
  for (const species of Object.keys(pets.INFO)) {
    const derivatives = [];
    for (const state of states) {
      const file = `rigs/${species}-${state}.svg`,
        data = rig(species, state);
      fs.writeFileSync(path.join(out, file), data);
      await sharp(Buffer.from(data))
        .png()
        .resize(300, 300)
        .toFile(path.join(out, 'thumbnails', `${species}-${state}.png`));
      derivatives.push(file, `thumbnails/${species}-${state}.png`);
    }
    catalogue.push({
      id: species,
      category: 'companion-rig',
      status: 'current',
      source: 'src/quiet-wing/pets.js',
      derivatives,
      metadata: {
        viewBox: '0 0 300 300',
        layers: ['tail', 'body', 'arm', 'head', 'eyes', 'hearts', 'sleep'],
        states,
      },
      provenance:
        'Original Alibi layered vector geometry. Existing 3D candidate and licence records remain in assets-source/quiet-wing/companions/.',
      integrationReference: 'src/quiet-wing/pets.js and src/quiet-wing/pet-view.js',
    });
  }
  fs.writeFileSync(
    path.join(out, 'catalogue.json'),
    JSON.stringify({ schemaVersion: 1, assets: catalogue }, null, 2) + '\n',
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
