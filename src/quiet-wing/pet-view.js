/* Presentation only: saved affection and walk clocks belong to the existing engine. */
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  ConeGeometry,
  CylinderGeometry,
  CircleGeometry,
  Shape,
  ShapeGeometry,
  DoubleSide,
  Box3,
  Vector3,
  AnimationMixer,
  AnimationUtils,
  TextureLoader,
  LoadingManager,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Keep embedded images as data URLs, which the site's existing image policy allows.
// GLTFLoader otherwise creates blob URLs and fetches them through ImageBitmapLoader.
function prepareGLB(bytes) {
  const view = new DataView(bytes),
    length = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length)));
  const bin = new Uint8Array(bytes, 28 + length);
  for (const image of json.images || []) {
    if (image.bufferView === undefined) continue;
    const source = json.bufferViews[image.bufferView];
    const data = bin.subarray(source.byteOffset || 0, (source.byteOffset || 0) + source.byteLength);
    let binary = '';
    for (let i = 0; i < data.length; i += 8192)
      binary += String.fromCharCode(...data.subarray(i, i + 8192));
    image.uri = 'data:' + image.mimeType + ';base64,' + btoa(binary);
    delete image.bufferView;
  }
  const encoded = new TextEncoder().encode(JSON.stringify(json));
  const padded = Math.ceil(encoded.length / 4) * 4;
  const result = new ArrayBuffer(28 + padded + bin.length),
    target = new DataView(result);
  target.setUint32(0, 0x46546c67, true);
  target.setUint32(4, 2, true);
  target.setUint32(8, result.byteLength, true);
  target.setUint32(12, padded, true);
  target.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(result, 20, padded).fill(32);
  new Uint8Array(result, 20, encoded.length).set(encoded);
  target.setUint32(20 + padded, bin.length, true);
  target.setUint32(24 + padded, 0x004e4942, true);
  new Uint8Array(result, 28 + padded).set(bin);
  return result;
}

// Nimbus is an original articulated model, with no disputed external model licence.
function cloudDragon() {
  const root = new Group(),
    wings = [],
    tail = new Group(),
    head = new Group();
  const colours = {
    body: '#86b9ae',
    belly: '#e8ebcf',
    wing: '#b8d5c1',
    horn: '#edcea0',
    eye: '#263f49',
  };
  const materials = Object.fromEntries(
    Object.entries(colours).map(([k, color]) => [
      k,
      new MeshStandardMaterial({ color, roughness: 0.84, flatShading: true, side: DoubleSide }),
    ]),
  );
  function ball(parent, material, position, scale, detail = 16) {
    const mesh = new Mesh(new SphereGeometry(1, detail, 10), materials[material]);
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    parent.add(mesh);
    return mesh;
  }
  ball(root, 'body', [0, 0.95, 0], [0.55, 0.73, 0.45]);
  ball(root, 'belly', [0, 0.91, 0.37], [0.39, 0.53, 0.12]);
  for (const side of [-1, 1]) {
    ball(root, 'body', [side * 0.38, 0.26, 0.2], [0.26, 0.18, 0.39]);
    ball(root, 'body', [side * 0.48, 0.97, 0.18], [0.17, 0.35, 0.17]);
    const wing = new Group();
    wing.position.set(side * 0.4, 1.12, -0.1);
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(side * 0.52, 0.85, side * 1.05, 0.62);
    shape.lineTo(side * 0.95, 0.1);
    shape.quadraticCurveTo(side * 0.67, 0.34, side * 0.48, -0.15);
    shape.closePath();
    wing.add(new Mesh(new ShapeGeometry(shape), materials.wing));
    root.add(wing);
    wings.push(wing);
  }
  head.position.set(0, 1.7, 0.04);
  root.add(head);
  ball(head, 'body', [0, 0, 0], [0.58, 0.5, 0.47]);
  ball(head, 'belly', [0, -0.14, 0.4], [0.39, 0.23, 0.23]);
  for (const side of [-1, 1]) {
    ball(head, 'eye', [side * 0.27, 0.08, 0.405], [0.065, 0.12, 0.055]);
    ball(head, 'belly', [side * 0.28 - 0.018, 0.12, 0.455], [0.019, 0.027, 0.014]);
    const horn = new Mesh(new ConeGeometry(0.11, 0.37, 8), materials.horn);
    horn.position.set(side * 0.36, 0.43, -0.08);
    horn.rotation.z = side * -0.2;
    head.add(horn);
  }
  root.add(tail);
  tail.position.set(0, 0.55, -0.27);
  for (let i = 0; i < 6; i++)
    ball(
      tail,
      'body',
      [Math.sin(i * 0.3) * 0.35, -0.05 * i, -0.16 * i],
      [0.25 - i * 0.028, 0.23 - i * 0.026, 0.28 - i * 0.027],
    );
  root.userData.animate = (t, action) => {
    head.rotation.z = Math.sin(t * 1.4) * (action === 'pet' ? 0.14 : 0.035);
    head.rotation.x = action === 'nap' ? 0.22 : action === 'treat' ? Math.sin(t * 5) * 0.1 : 0;
    tail.rotation.y = Math.sin(t * 1.9) * 0.25;
    wings.forEach((wing, i) => {
      wing.rotation.y = (i ? -1 : 1) * (0.24 + Math.sin(t * (action === 'play' ? 8 : 2)) * 0.22);
    });
  };
  return root;
}

function release(root) {
  const geometry = new Set(),
    materials = new Set(),
    textures = new Set();
  root?.traverse((object) => {
    if (object.geometry) geometry.add(object.geometry);
    for (const m of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!m) continue;
      materials.add(m);
      for (const value of Object.values(m)) if (value?.isTexture) textures.add(value);
    }
    object.skeleton?.dispose();
  });
  geometry.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
  textures.forEach((t) => t.dispose());
}

class PetView {
  constructor(host, species, url, motion) {
    this.host = host;
    this.species = species;
    this.motion = motion;
    this.action = 'idle';
    this.events = new AbortController();
    this.frame = 0;
    this.elapsed = 0;
    this.mode = 'loading';
    this.media = matchMedia('(prefers-reduced-motion: reduce)');
    this.media.addEventListener('change', () => this.setMotion(this.motion), {
      signal: this.events.signal,
    });
    document.addEventListener('visibilitychange', () => this.schedule(), {
      signal: this.events.signal,
    });
    this.ready = this.load(url).catch(() => {
      if (!this.disposed) this.fallback();
    });
  }
  async load(url) {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'pet-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.gpu = new WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
    this.gpu.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.world = new Scene();
    this.camera = new PerspectiveCamera(32, 1, 0.1, 50);
    this.camera.position.set(3.5, 2.5, 5.7);
    this.camera.lookAt(0, 1, 0);
    this.world.add(new HemisphereLight('#fff9e6', '#607c6d', 2.5));
    const sun = new DirectionalLight('#fff4d6', 3);
    sun.position.set(-3, 5, 4);
    this.world.add(sun);
    if (this.species === 'dragon') this.model = cloudDragon();
    else {
      if (!url) throw Error('Portrait unavailable');
      const response = await fetch(url, {
        signal: AbortSignal.any([this.events.signal, AbortSignal.timeout(15000)]),
      });
      if (!response.ok) throw Error('Portrait unavailable');
      const manager = new LoadingManager();
      manager.addHandler(/^data:image\//, new TextureLoader());
      const gltf = await new GLTFLoader(manager).parseAsync(
        prepareGLB(await response.arrayBuffer()),
        '',
      );
      if (this.disposed) {
        release(gltf.scene);
        return;
      }
      this.model = gltf.scene;
      this.mixer = new AnimationMixer(this.model);
      if (this.species === 'owl') {
        this.clips = {
          idle: AnimationUtils.subclip(gltf.animations[0], 'owl-idle', 0, 29, 24),
          play: AnimationUtils.subclip(gltf.animations[0], 'owl-walk', 90, 119, 24),
        };
      } else if (this.species === 'fox')
        this.clips = {
          idle: gltf.animations.find((a) => a.name === 'Survey'),
          play: gltf.animations.find((a) => a.name === 'Run'),
        };
      else this.clips = { idle: gltf.animations[0], play: gltf.animations[0] };
      this.mixer.clipAction(this.clips.idle).play();
      this.mixer.update(0.15);
      // Normalize authoring units while keeping each skeleton and its animation intact.
      const box = new Box3().setFromObject(this.model),
        size = box.getSize(new Vector3()),
        center = box.getCenter(new Vector3());
      const scale = Math.min(2.1 / size.y, 3 / Math.max(size.x, size.z));
      this.model.scale.multiplyScalar(scale);
      this.model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    }
    this.actor = new Group();
    this.actor.add(this.model);
    this.world.add(this.actor);
    const mat = new MeshStandardMaterial({
      color: '#8b9c85',
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    });
    const shadow = new Mesh(new CircleGeometry(1, 48), mat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(1.1, 0.68, 1);
    shadow.position.y = 0.01;
    this.world.add(shadow);
    this.prop = new Group();
    this.world.add(this.prop);
    this.canvas.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault();
        this.fallback();
      },
      { signal: this.events.signal },
    );
    this.host.append(this.canvas);
    this.host.classList.add('portrait-3d');
    this.mode = 'webgl';
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.host);
    this.resize();
    this.setAction(this.action);
  }
  resize() {
    if (this.disposed || this.mode !== 'webgl') return;
    const width = this.host.clientWidth || 320,
      height = this.host.clientHeight || 320;
    this.gpu.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.render();
  }
  setAction(action) {
    this.action = action;
    this.elapsed = 0;
    if (this.mode !== 'webgl') return;
    this.mixer?.stopAllAction();
    if (this.mixer)
      this.mixer
        .clipAction(this.clips[action] || this.clips.idle)
        .reset()
        .play();
    release(this.prop);
    this.prop.clear();
    const material = new MeshStandardMaterial({
      color: action === 'play' ? '#cd916a' : action === 'treat' ? '#d6b172' : '#b48799',
      roughness: 0.65,
    });
    let item;
    if (action === 'play' || action === 'treat')
      item = new Mesh(new SphereGeometry(action === 'play' ? 0.18 : 0.1, 16, 10), material);
    else if (action === 'groom')
      item = new Mesh(new CylinderGeometry(0.09, 0.09, 0.4, 12), material);
    else if (action === 'pet') {
      const shape = new Shape();
      shape.moveTo(0, 0.05);
      shape.bezierCurveTo(-0.25, 0.3, -0.35, -0.05, 0, -0.25);
      shape.bezierCurveTo(0.35, -0.05, 0.25, 0.3, 0, 0.05);
      item = new Mesh(new ShapeGeometry(shape), material);
    } else material.dispose();
    if (item) {
      this.prop.add(item);
      item.position.set(0.9, 0.6, 0.7);
    }
    this.pose(0);
    this.render();
    this.schedule();
  }
  pose(dt) {
    this.elapsed += dt;
    const t = this.elapsed,
      action = this.action;
    this.mixer?.update(action === 'nap' ? 0 : dt);
    this.model?.userData.animate?.(t, action);
    this.actor.position.y = action === 'play' ? Math.abs(Math.sin(t * 4)) * 0.15 : 0;
    this.actor.rotation.y =
      action === 'play' ? Math.sin(t * 2) * 0.35 : action === 'groom' ? Math.sin(t * 2) * 0.06 : 0;
    this.actor.rotation.z = action === 'nap' ? -0.12 : 0;
    this.prop.position.y =
      action === 'pet'
        ? 1 + (t % 2) * 0.2
        : action === 'play'
          ? Math.abs(Math.sin(t * 3)) * 0.2
          : 0;
    this.prop.rotation.z = action === 'groom' ? Math.sin(t * 6) * 0.35 : 0;
  }
  render() {
    if (this.mode === 'webgl' && !this.disposed) this.gpu.render(this.world, this.camera);
  }
  setMotion(value) {
    this.motion = value;
    this.motionPaused = false;
    this.slowFrames = 0;
    this.schedule();
  }
  schedule() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    if (
      this.disposed ||
      this.mode !== 'webgl' ||
      !this.motion ||
      this.media.matches ||
      document.hidden ||
      this.motionPaused ||
      this.action === 'nap'
    )
      return;
    this.last = performance.now();
    const tick = (now) => {
      this.frame = 0;
      if (this.disposed || this.mode !== 'webgl') return;
      if (now - this.last >= 1000 / 30) {
        this.pose(Math.min(0.1, (now - this.last) / 1000));
        this.last = now;
        const start = performance.now();
        this.render();
        this.slowFrames = performance.now() - start > 50 ? (this.slowFrames || 0) + 1 : 0;
        if (this.slowFrames >= 8) {
          this.motionPaused = true;
          return;
        }
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  fallback() {
    this.mode = 'illustration';
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.resizeObserver?.disconnect();
    this.host.classList.remove('portrait-3d');
    this.canvas?.remove();
    release(this.world);
    this.mixer?.stopAllAction();
    this.gpu?.dispose();
    this.gpu?.forceContextLoss();
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    this.fallback();
    this.mixer?.uncacheRoot(this.model);
    this.world = null;
    this.model = null;
  }
}
globalThis.QWPetView = PetView;
