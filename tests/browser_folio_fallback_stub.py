"""Exercise Folio control state with a deterministic SceneView lifecycle stub."""
from pathlib import Path
import os

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
failures = []


def check(condition, label):
    print(("PASS " if condition else "FAIL ") + label, flush=True)
    if not condition:
        failures.append(label)


with sync_playwright() as p:
    browser_args = {"headless": True, "args": ["--no-sandbox"]}
    if os.environ.get("CHROMIUM_PATH"):
        browser_args["executable_path"] = os.environ["CHROMIUM_PATH"]
    browser = p.chromium.launch(**browser_args)
    page = browser.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_content('<main id="folio-host"></main>')
    page.evaluate(
        """() => {
          const piece = (title, model) => ({
            title, model, image: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',
            credit: 'Test credit'
          });
          globalThis.ALIBI_CONFIG = { standalone: false };
          globalThis.ALIBI_QUIET_CONFIG = { sources: 'https://example.invalid/credits' };
          globalThis.QWExperience = {
            bytes: 0, build: 'stub-test', files: [], companions: [], audio: [], films: [], editorial: [],
            scenes: [piece('Garden room', 'garden.glb')],
            modules: [piece('Stone tower', 'tower.glb'), piece('Willow tree', 'willow.glb')]
          };
          globalThis.sceneViews = [];
          // Explicit lifecycle stub: this exercises Folio's real DOM/controller wiring,
          // while readiness and fallback are driven deterministically without GPU claims.
          globalThis.QWSceneView = class SceneViewLifecycleStub {
            constructor(stage, model, report) {
              this.stage = stage;
              this.model = model;
              this.report = report;
              this.disposed = false;
              this.ready = Promise.resolve().then(() => {
                if (this.disposed) return;
                this.canvas = document.createElement('canvas');
                this.canvas.setAttribute('aria-hidden', 'true');
                this.stage.append(this.canvas);
                this.stage.classList.add('folio-3d');
              });
              sceneViews.push(this);
            }
            dispose() {
              this.disposed = true;
              this.stage.classList.remove('folio-3d');
              this.canvas?.remove();
            }
            fallback(text = '3D paused. The illustration remains available.') {
              this.stage.classList.remove('folio-3d');
              this.canvas?.remove();
              this.report(text);
            }
          };
        }"""
    )
    page.add_script_tag(path=str(ROOT / "src/quiet-wing/folio.js"))
    page.evaluate("globalThis.folioMount = QWFolio.mount(document.querySelector('#folio-host'))")

    controls = page.locator("[data-turn], [data-zoom]")
    page.locator('[data-folio-tab="models"]').click()
    check(controls.count() == 4 and controls.evaluate_all("els => els.every(el => el.disabled)"), "all four controls start disabled")

    page.locator("#folio-open-3d").click()
    page.wait_for_function("sceneViews.length === 1 && sceneViews[0].stage.classList.contains('folio-3d')")
    check(controls.evaluate_all("els => els.every(el => !el.disabled)"), "successful ready enables turn and zoom controls")

    page.evaluate("sceneViews[0].fallback()")
    status = page.locator("#folio-model-status")
    check(controls.evaluate_all("els => els.every(el => el.disabled)"), "fallback report disables all four controls")
    check(status.is_visible() and "illustration remains available" in status.inner_text(), "fallback status remains visible")

    page.locator("#folio-open-3d").click()
    page.wait_for_function("sceneViews.length === 2 && sceneViews[1].stage.classList.contains('folio-3d')")
    check(controls.evaluate_all("els => els.every(el => !el.disabled)"), "reopening a view enables controls after readiness")

    page.locator('[data-piece="1"]').click()
    check(status.inner_text() == "Illustrated view. Open 3D to turn this piece.", "model change restores the illustrated status")
    page.evaluate("sceneViews[1].report('STALE model callback')")
    check(status.inner_text() == "Illustrated view. Open 3D to turn this piece.", "old model callback is ignored after selection changes")
    check(controls.evaluate_all("els => els.every(el => el.disabled)"), "model change leaves controls disabled")

    page.locator("#folio-open-3d").click()
    page.wait_for_function("sceneViews.length === 3 && sceneViews[2].stage.classList.contains('folio-3d')")
    page.locator('[data-folio-tab="portraits"]').click()
    page.evaluate("sceneViews[2].report('STALE navigation callback')")
    check(page.locator("#folio-model-status").count() == 0, "old view callback is ignored after tab navigation")

    page.locator('[data-folio-tab="models"]').click()
    page.locator("#folio-open-3d").click()
    page.wait_for_function("sceneViews.length === 4 && sceneViews[3].stage.classList.contains('folio-3d')")
    status = page.locator("#folio-model-status")
    page.evaluate("folioMount.dispose()")
    current_status = status.inner_text()
    check(controls.evaluate_all("els => els.every(el => el.disabled)"), "folio disposal disables turn and zoom controls")
    page.evaluate("sceneViews[3].report('STALE disposal callback')")
    check(status.inner_text() == current_status, "old view callback is ignored after folio disposal")
    check(not errors, f"no uncaught browser errors: {errors}")
    browser.close()

if failures:
    raise AssertionError("; ".join(failures))
print("Folio controller lifecycle stub checks passed; no real WebGL context-loss was exercised.")
