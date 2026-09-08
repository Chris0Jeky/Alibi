/* Optional, locally bundled 3D presentation. The shared geometry remains the export source. */
import './pet-view.js';
import './scene-view.js';
import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  HemisphereLight,
  DirectionalLight,
  Color,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshLambertMaterial,
  DoubleSide,
  PCFSoftShadowMap,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';

const G = globalThis,
  Base = G.QWRealm.Renderer;
class LitRenderer extends Base {
  constructor(canvas) {
    super(canvas);
    this.mode = 'canvas';
    this.disposed = false;
    this.frame = 0;
    this.motion = false;
    this.lastFrame = 0;
    this.waterTime = { value: 0 };
    this.events = new AbortController();
    try {
      this.surface = document.createElement('canvas');
      this.gpu = new WebGLRenderer({
        canvas: this.surface,
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      });
      this.gpu.setPixelRatio(this.dpr);
      this.gpu.shadowMap.enabled = true;
      this.gpu.shadowMap.type = PCFSoftShadowMap;
      this.gpu.shadowMap.autoUpdate = false;
      this.world = new Scene();
      this.camera3D = new OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
      this.camera3D.up.set(0, 0, 1);
      this.hemi = new HemisphereLight('#e9f8ff', '#6c6954', 2.1);
      this.sun = new DirectionalLight('#fff1cf', 3.1);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      this.sun.shadow.bias = -0.0004;
      this.sun.shadow.normalBias = 0.04;
      this.world.add(this.hemi, this.sun, this.sun.target);
      this.solidMaterial = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
      this.waterMaterial = new MeshLambertMaterial({ vertexColors: true, side: DoubleSide });
      this.waterMaterial.onBeforeCompile = (shader) => {
        shader.uniforms.cityTime = this.waterTime;
        shader.vertexShader =
          'uniform float cityTime;\n' +
          shader.vertexShader.replace(
            '#include <begin_vertex>',
            '#include <begin_vertex>\ntransformed.z += sin(position.x*3.0+cityTime)*cos(position.y*2.0+cityTime*.7)*.018;',
          );
      };
      this.waterMaterial.customProgramCacheKey = () => 'alibi-water-v1';
      this.ray = new Raycaster();
      this.mode = 'webgl';
      this.surface.addEventListener(
        'webglcontextlost',
        (e) => {
          e.preventDefault();
          this.mode = 'canvas';
          this.stop();
          super.render();
        },
        { signal: this.events.signal },
      );
      this.surface.addEventListener(
        'webglcontextrestored',
        () => {
          this.mode = 'webgl';
          this.render();
          this.schedule();
        },
        { signal: this.events.signal },
      );
      document.addEventListener(
        'visibilitychange',
        () => {
          if (document.hidden) this.stop();
          else {
            this.render();
            this.schedule();
          }
        },
        { signal: this.events.signal },
      );
    } catch {
      this.gpu?.dispose();
      this.gpu = null;
    }
  }
  setScene(s) {
    if (this.disposed) return;
    this.scene = s;
    if (this.selection >= s.tiles.length) this.selection = -1;
    this.mesh = G.QWRealm.worldMeshes(s);
    if (this.gpu) {
      for (const object of this.objects || []) {
        this.world.remove(object);
        object.geometry.dispose();
      }
      const solid = { positions: [], colours: [], plots: [] },
        water = { positions: [], colours: [], plots: [] };
      const color = new Color();
      for (const tile of this.mesh)
        for (const face of tile.faces) {
          const t = s.tiles[tile.index];
          const isWater =
            t.ground === 'water' && face.v.every((v) => Math.abs(v[2] - tile.z) < 0.001);
          const batch = isWater ? water : solid;
          color.set(isWater ? '#3b98a8' : face.c);
          for (let i = 1; i < face.v.length - 1; i++) {
            for (const vertex of [face.v[0], face.v[i], face.v[i + 1]]) {
              batch.positions.push(...vertex);
              batch.colours.push(color.r, color.g, color.b);
            }
            batch.plots.push(tile.index);
          }
        }
      this.objects = [solid, water].map((batch, i) => {
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(batch.positions, 3));
        geometry.setAttribute('color', new Float32BufferAttribute(batch.colours, 3));
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        const mesh = new Mesh(geometry, i ? this.waterMaterial : this.solidMaterial);
        mesh.castShadow = !i;
        mesh.receiveShadow = true;
        mesh.userData.plots = batch.plots;
        this.world.add(mesh);
        return mesh;
      });
      this.gpu.shadowMap.needsUpdate = true;
    }
    this.render();
  }
  setMotion(enabled) {
    this.motion = !!enabled && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.motionPaused = false;
    this.slowFrames = 0;
    if (this.motion) this.schedule();
    else {
      this.stop();
      this.waterTime.value = 0;
      this.render();
    }
  }
  stop() {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
  schedule() {
    if (
      this.frame ||
      this.disposed ||
      !this.motion ||
      this.motionPaused ||
      document.hidden ||
      this.mode !== 'webgl'
    )
      return;
    this.frame = requestAnimationFrame((time) => {
      this.frame = 0;
      // Water moves at 20 fps; no background work while hidden or in reduced-motion mode.
      if (time - this.lastFrame >= 50) {
        this.lastFrame = time;
        this.waterTime.value = time / 1200;
        this.render();
        this.slowFrames = this.lastMs > 50 ? (this.slowFrames || 0) + 1 : 0;
        if (this.slowFrames >= 8) this.motionPaused = true;
      }
      this.schedule();
    });
  }
  render() {
    if (this.disposed) return;
    if (this.mode !== 'webgl') return super.render();
    if (!this.scene || !this.w || !this.objects) return;
    const start = performance.now(),
      n = this.scene.size,
      mid = n / 2,
      aspect = this.w / this.h;
    const span = Math.max(n * 0.53, (n * 0.79) / aspect) / this.zoom;
    const c = this.camera3D,
      a = (-this.angle * Math.PI) / 2;
    c.left = -span * aspect - (this.pan.x / this.w) * span * aspect * 2;
    c.right = span * aspect - (this.pan.x / this.w) * span * aspect * 2;
    c.top = span + (this.pan.y / this.h) * span * 2;
    c.bottom = -span + (this.pan.y / this.h) * span * 2;
    if (this.view === 'plan') c.position.set(mid, mid + 0.001, n * 2);
    else
      c.position.set(
        mid + n * (Math.cos(a) - Math.sin(a)),
        mid + n * (Math.sin(a) + Math.cos(a)),
        n * (this.view === 'diorama' ? 0.85 : 1.6),
      );
    c.lookAt(mid, mid, 0.4);
    c.updateProjectionMatrix();
    c.updateMatrixWorld();
    const night = this.scene.sky === 'night',
      sunset = this.scene.sky === 'sunset';
    if (this.shadowSky !== this.scene.sky) {
      this.shadowSky = this.scene.sky;
      this.gpu.shadowMap.needsUpdate = true;
    }
    this.world.background = new Color(night ? '#172d46' : sunset ? '#edc3a5' : '#d6e6e9');
    this.hemi.intensity = night ? 1.1 : 2;
    this.sun.intensity = night ? 1.4 : sunset ? 2.8 : 3;
    this.sun.color.set(night ? '#95bdf9' : sunset ? '#ffb272' : '#fff1d6');
    this.sun.position.set(mid - n * 0.6, mid - n * 0.5, n * (sunset ? 0.55 : 1.2));
    this.sun.target.position.set(mid, mid, 0);
    Object.assign(this.sun.shadow.camera, {
      left: -n,
      right: n,
      top: n,
      bottom: -n,
      near: 0.1,
      far: n * 4,
    });
    this.sun.shadow.camera.updateProjectionMatrix();
    if (this.gpuWidth !== this.w || this.gpuHeight !== this.h) {
      this.gpu.setSize(this.w, this.h, false);
      this.gpuWidth = this.w;
      this.gpuHeight = this.h;
    }
    this.gpu.render(this.world, c);
    const ctx = this.base.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.surface, 0, 0);
    this.lastMs = performance.now() - start;
    this.paint();
  }
  project(x, y, z = 0) {
    if (this.mode !== 'webgl' || !this.camera3D) return super.project(x, y, z);
    const p = new Vector3(x, y, z).project(this.camera3D);
    return [((p.x + 1) * this.w) / 2, ((1 - p.y) * this.h) / 2];
  }
  paint(selection = this.selection, ghost = this.ghost) {
    this.ghost = ghost;
    return super.paint(selection, ghost);
  }
  pick(x, y) {
    if (this.mode !== 'webgl') return super.pick(x, y);
    this.ray.setFromCamera(new Vector2((x / this.w) * 2 - 1, 1 - (y / this.h) * 2), this.camera3D);
    const hit = this.ray.intersectObjects(this.objects, false)[0];
    return hit ? hit.object.userData.plots[hit.faceIndex] : -1;
  }
  svg() {
    if (this.mode !== 'webgl') return super.svg();
    // Export the shared geometry at the same camera projection; SVG uses flat colours.
    super.render();
    const result = super.svg();
    this.render();
    return result;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stop();
    this.events.abort();
    for (const object of this.objects || []) object.geometry.dispose();
    this.solidMaterial?.dispose();
    this.waterMaterial?.dispose();
    this.sun?.shadow.map?.dispose();
    this.gpu?.dispose();
    this.gpu?.forceContextLoss();
    this.objects = [];
    this.mesh = [];
    this.faces = [];
  }
}
G.QWRealm.Renderer = LitRenderer;
