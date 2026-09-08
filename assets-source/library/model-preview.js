import * as THREE from '../../node_modules/three/build/three.module.js';
import { GLTFLoader } from '../../node_modules/three/examples/jsm/loaders/GLTFLoader.js';
const $ = (id) => document.getElementById(id),
  family = $('family'),
  piece = $('piece'),
  state = $('state'),
  canvas = $('canvas'),
  image = $('companion');
const states = ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'];
let realm,
  companions,
  renderer,
  scene,
  camera,
  active,
  spin = 0,
  raf = 0;
async function load() {
  [realm, companions] = await Promise.all(
    ['realm/catalogue.json', 'companions/catalogue.json'].map((x) =>
      fetch(x).then((r) => r.json()),
    ),
  );
  populate();
}
function values() {
  return family.value === 'realm' ? realm.assets : companions.assets;
}
function populate() {
  piece.innerHTML = values()
    .map((x) => `<option value="${x.id}">${x.id.replaceAll('-', ' ')}</option>`)
    .join('');
  $('state-label').hidden = family.value === 'realm';
  render();
}
function selected() {
  return values().find((x) => x.id === piece.value);
}
function facts(x) {
  const m = x.metadata || {};
  return [
    ['Status', x.status],
    ['Source', x.source],
    ['Pivot', m.pivot?.join(', ') || 'layered SVG root'],
    ['Bounds', m.size?.join(' × ') || m.viewBox],
    ['Provenance', x.provenance],
  ]
    .map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`)
    .join('');
}
function clear() {
  cancelAnimationFrame(raf);
  renderer?.dispose();
  canvas.replaceWith(canvas.cloneNode());
  canvas = document.querySelector('#canvas');
  image.hidden = true;
  canvas.hidden = false;
}
async function render() {
  const x = selected();
  $('title').textContent = x.id.replaceAll('-', ' ');
  $('detail').textContent =
    family.value === 'realm'
      ? 'Exported GLB with embedded material data and an editable Blender master.'
      : 'Current companion silhouette exported as a named layered SVG rig.';
  $('facts').innerHTML = facts(x);
  if (family.value === 'companions') {
    canvas.hidden = true;
    image.hidden = false;
    const s = state.value || states[0];
    image.src = `companions/rigs/${x.id}-${s}.svg`;
    image.alt = `${x.id} in ${s} state`;
    return;
  }
  canvas.hidden = false;
  image.hidden = true;
  renderer?.dispose();
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.01, 100);
  camera.position.set(3, 2.5, 4);
  scene.add(new THREE.HemisphereLight(0xf4ead4, 0x173e49, 2));
  const light = new THREE.DirectionalLight(0xfff3d6, 3);
  light.position.set(3, 6, 4);
  scene.add(light);
  try {
    const gltf = await new GLTFLoader().loadAsync(`realm/glb/${x.id}.glb`);
    active = gltf.scene;
    scene.add(active);
    const b = new THREE.Box3().setFromObject(active),
      c = b.getCenter(new THREE.Vector3()),
      n = b.getSize(new THREE.Vector3()).length() || 1;
    active.position.sub(c);
    camera.position.set(n * 1.7, n * 1.25, n * 1.7);
    camera.lookAt(0, n * 0.18, 0);
    animate();
  } catch (e) {
    $('fallback').hidden = false;
  }
}
function animate() {
  if (!renderer || !scene) return;
  active.rotation.y +=
    $('motion').checked && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.004 : 0;
  renderer.render(scene, camera);
  raf = requestAnimationFrame(animate);
}
family.onchange = populate;
piece.onchange = render;
state.innerHTML = states.map((s) => `<option>${s}</option>`).join('');
state.onchange = render;
$('previous').onclick = () => {
  piece.selectedIndex = (piece.selectedIndex + piece.options.length - 1) % piece.options.length;
  render();
};
$('next').onclick = () => {
  piece.selectedIndex = (piece.selectedIndex + 1) % piece.options.length;
  render();
};
$('motion').onchange = () => {};
addEventListener('resize', () => renderer && render());
load();
