import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (id) => document.getElementById(id);
const family = $('family'),
  piece = $('piece'),
  state = $('state'),
  canvas = $('canvas'),
  companion = $('companion');
const states = ['idle', 'look', 'attention', 'happy', 'sleepy', 'pet', 'feed', 'celebrate'];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let realm,
  companions,
  renderer,
  scene,
  camera,
  active,
  raf = 0,
  request = 0;

function title(value) {
  return value.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function realmItems() {
  return [...realm.assets, ...realm.scenes, ...(realm.master ? [realm.master] : [])];
}
function values() {
  return family.value === 'realm' ? realmItems() : companions.assets;
}
function current() {
  return values().find((asset) => asset.id === piece.value);
}
function local(path) {
  return path.replace(/^assets-source\/library\//, '');
}
function glbPath(asset) {
  return local(asset.derivatives.find((path) => path.endsWith('.glb')));
}
function thumbnail(asset) {
  const value = asset.derivatives.find((path) => path.endsWith('.png'));
  return value && local(value);
}
function downloadPath(asset) {
  return local(asset.derivatives.find((path) => path.endsWith('.blend')) || asset.derivatives.find((path) => path.endsWith('.glb')) || asset.derivatives[0]);
}
function facts(asset) {
  const metadata = asset.metadata || {};
  return [
    ['Status', asset.status],
    ['Design', asset.design],
    ['Source', asset.source],
    ['Bounds', metadata.size?.join(' × ') || metadata.viewBox || 'composed scene'],
    ['Rights', metadata.rights ? `${metadata.rights.author} · ${metadata.rights.licenceVersion}` : 'See provenance'],
    ['Provenance', asset.provenance],
  ]
    .map(([key, value]) => `<dt>${key}</dt><dd>${value}</dd>`)
    .join('');
}
function stopLoop() {
  cancelAnimationFrame(raf);
  raf = 0;
}
function disposeActive() {
  active?.traverse?.((node) => {
    node.geometry?.dispose();
    for (const material of [].concat(node.material || [])) material?.dispose?.();
  });
  active?.removeFromParent();
  active = null;
}
function fallback(asset, message) {
  stopLoop();
  canvas.hidden = true;
  companion.hidden = true;
  companion.replaceChildren();
  const image = $('static');
  image.src = thumbnail(asset) || '';
  image.hidden = false;
  image.alt = `${asset.title} static preview`;
  $('fallback').textContent = message;
  $('fallback').hidden = false;
}
function useRenderer(asset) {
  if (renderer) return true;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xf4ead4, 0x173e49, 2));
    const light = new THREE.DirectionalLight(0xfff3d6, 3);
    light.position.set(3, 6, 4);
    scene.add(light);
    camera = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    return true;
  } catch (error) {
    fallback(asset, 'Static thumbnail shown because WebGL is unavailable.');
    return false;
  }
}
function resize() {
  if (!renderer || !camera || canvas.hidden) return;
  const width = Math.max(canvas.clientWidth, 1),
    height = Math.max(canvas.clientHeight, 1);
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}
function positionCamera(size) {
  const alternate = $('camera').value === 'alternate';
  camera.position.set(
    alternate ? -size * 1.55 : size * 1.7,
    size * 1.25,
    alternate ? size * 1.2 : size * 1.7,
  );
  camera.lookAt(0, size * 0.18, 0);
}
function draw() {
  if (!renderer || !scene || !camera) return;
  if (active && $('motion').checked && !reduced.matches) active.rotation.y += 0.004;
  renderer.render(scene, camera);
}
function loop() {
  draw();
  if (family.value === 'realm' && $('motion').checked && !reduced.matches)
    raf = requestAnimationFrame(loop);
}
function treatment() {
  document.documentElement.dataset.treatment = $('treatment').value;
  if (!active) return;
  active.traverse((node) => {
    if (node.isMesh && node.material)
      node.material.emissive?.set($('treatment').value === 'invalid' ? '#5b1f26' : '#000000');
  });
  draw();
}
async function showRealm(asset, token) {
  if (!useRenderer(asset)) return;
  canvas.hidden = false;
  companion.hidden = true;
  companion.replaceChildren();
  $('static').hidden = true;
  $('fallback').hidden = true;
  stopLoop();
  disposeActive();
  resize();
  try {
    const gltf = await new GLTFLoader().loadAsync(glbPath(asset));
    if (token !== request) {
      gltf.scene.traverse((node) => node.geometry?.dispose());
      return;
    }
    active = gltf.scene;
    scene.add(active);
    const bounds = new THREE.Box3().setFromObject(active),
      center = bounds.getCenter(new THREE.Vector3()),
      size = bounds.getSize(new THREE.Vector3()).length() || 1;
    active.position.sub(center);
    positionCamera(size);
    treatment();
    draw();
    if ($('motion').checked && !reduced.matches) raf = requestAnimationFrame(loop);
  } catch (error) {
    if (token === request)
      fallback(asset, 'Static thumbnail shown because this GLB could not load.');
  }
}
function companionPath(asset) {
  return `companions/rigs/${asset.id}-${state.value || states[0]}.svg`;
}
async function showCompanion(asset, token) {
  stopLoop();
  disposeActive();
  canvas.hidden = true;
  $('static').hidden = true;
  $('fallback').hidden = true;
  companion.hidden = false;
  try {
    const response = await fetch(companionPath(asset));
    if (!response.ok) throw Error(response.status);
    const text = await response.text();
    if (token !== request) return;
    const doc = new DOMParser().parseFromString(text, 'image/svg+xml'),
      svg = document.importNode(doc.documentElement, true);
    svg.classList.add('inline-rig');
    svg.classList.toggle('animate', $('motion').checked && !reduced.matches);
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `${asset.title} in ${state.value} state`);
    companion.replaceChildren(svg);
  } catch (error) {
    if (token === request)
      fallback(asset, 'Static thumbnail shown because this companion rig could not load.');
  }
}
function populate() {
  piece.innerHTML = values()
    .map((asset) => `<option value="${asset.id}">${asset.title || title(asset.id)}</option>`)
    .join('');
  $('state-label').hidden = family.value === 'realm';
  $('camera-label').hidden = family.value !== 'realm';
  $('treatment-label').hidden = family.value !== 'realm';
  render();
}
function render() {
  const asset = current();
  if (!asset) return;
  request += 1;
  const token = request;
  $('title').textContent = asset.title || title(asset.id);
  $('detail').textContent =
    family.value === 'realm'
      ? 'Portable self-contained GLB preview. Placement and treatment controls only affect this preview.'
      : 'Existing named SVG layers are inlined for a state transition; they never alter game state.';
  $('facts').innerHTML = facts(asset);
  const download = $('download');
  download.href = downloadPath(asset);
  download.download = downloadPath(asset).split('/').pop();
  const source = $('source-link');
  source.href = '/' + asset.source;
  source.textContent = asset.source.includes('tools/') ? 'View generator source' : 'View source record';
  if (family.value === 'realm') showRealm(asset, token);
  else showCompanion(asset, token);
}
async function load() {
  try {
    [realm, companions] = await Promise.all(
      ['realm/catalogue.json', 'companions/catalogue.json'].map((url) =>
        fetch(url).then((response) => {
          if (!response.ok) throw Error(response.status);
          return response.json();
        }),
      ),
    );
    populate();
  } catch (error) {
    $('fallback').textContent = 'The local asset catalogue could not load.';
    $('fallback').hidden = false;
  }
}
family.onchange = populate;
piece.onchange = render;
state.innerHTML = states.map((value) => `<option value="${value}">${value}</option>`).join('');
state.onchange = render;
$('camera').onchange = render;
$('treatment').onchange = treatment;
$('motion').onchange = render;
$('previous').onclick = () => {
  piece.selectedIndex = (piece.selectedIndex + piece.options.length - 1) % piece.options.length;
  render();
};
$('next').onclick = () => {
  piece.selectedIndex = (piece.selectedIndex + 1) % piece.options.length;
  render();
};
reduced.onchange = render;
addEventListener('resize', () => {
  resize();
  draw();
});
load();
