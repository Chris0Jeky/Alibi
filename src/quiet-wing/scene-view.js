/* One demand-rendered view shared by the field-notes scenes and module cabinet. */
import {
  WebGLRenderer,
  Scene,
  HemisphereLight,
  DirectionalLight,
  PerspectiveCamera,
  Box3,
  Vector3,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
function release(root) {
  root?.traverse((node) => {
    node.geometry?.dispose();
    for (const material of [].concat(node.material || [])) {
      for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
      material.dispose();
    }
  });
}
class SceneView {
  constructor(host, url, report) {
    this.host = host;
    this.report = report;
    this.events = new AbortController();
    this.angle = Math.PI / 4;
    this.zoom = 1;
    this.ready = this.load(url).catch(() => {
      if (!this.disposed) {
        this.fallback();
        report('The illustrated view is available. 3D could not load.');
      }
    });
  }
  async load(url) {
    this.canvas = document.createElement('canvas');
    this.canvas.setAttribute('aria-hidden', 'true');
    this.renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.scene = new Scene();
    this.scene.add(new HemisphereLight('#fff5db', '#375661', 2.4));
    const light = new DirectionalLight('#ffe3b2', 3);
    light.position.set(-4, 8, 5);
    this.scene.add(light);
    this.camera = new PerspectiveCamera(40, 1, 0.01, 200);
    const response = await fetch(url, {
      signal: AbortSignal.any([this.events.signal, AbortSignal.timeout(15000)]),
    });
    if (!response.ok) throw Error('Model unavailable');
    const gltf = await new GLTFLoader().parseAsync(await response.arrayBuffer(), '');
    if (this.disposed) {
      release(gltf.scene);
      return;
    }
    this.model = gltf.scene;
    const box = new Box3().setFromObject(this.model);
    this.size = box.getSize(new Vector3()).length();
    this.model.position.sub(box.getCenter(new Vector3()));
    this.scene.add(this.model);
    this.host.append(this.canvas);
    this.host.classList.add('folio-3d');
    this.canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        this.fallback();
        this.report('3D paused. The illustration remains available.');
      },
      { signal: this.events.signal },
    );
    this.observer = new ResizeObserver(() => this.draw());
    this.observer.observe(this.host);
    this.draw();
    this.report('3D ready. Turn or zoom to explore.');
  }
  draw() {
    if (this.disposed || !this.model || !this.host.classList.contains('folio-3d')) return;
    const width = Math.max(1, this.host.clientWidth),
      height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const distance = (this.size * 1.35 * Math.max(1, 1 / this.camera.aspect)) / this.zoom;
    this.camera.position.set(
      Math.sin(this.angle) * distance,
      distance * 0.72,
      Math.cos(this.angle) * distance,
    );
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
  turn(amount) {
    this.angle += amount;
    this.draw();
  }
  magnify(amount) {
    this.zoom = Math.min(1.5, Math.max(0.7, this.zoom + amount));
    this.draw();
  }
  fallback() {
    this.host.classList.remove('folio-3d');
    this.canvas?.remove();
    this.observer?.disconnect();
  }
  dispose() {
    this.disposed = true;
    this.events.abort();
    this.fallback();
    release(this.model);
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
  }
}
globalThis.QWSceneView = SceneView;
