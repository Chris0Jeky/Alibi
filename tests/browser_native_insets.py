"""Computed-style fixtures using emitted styles, not Android device acceptance."""
from pathlib import Path
import json
import os
import subprocess

from playwright.sync_api import sync_playwright
from native_inset_payload import load_native_style
from native_inset_stylesheets import load_shared_styles
from native_inset_content import verify_content_reservation

ROOT = Path(__file__).resolve().parents[1]
HTML = """<main class="main"><p>Content</p></main><nav class="mobile-nav"><button>Menu</button></nav>
<dialog open class="quick-sheet">Actions</dialog><section class="bc-studio"><div class="bc-controls">Move</div></section>
<section class="hx-experience">House</section><nav class="hx-mobile"><a>One</a></nav>
<dialog open id="dialog" class="hx-sheet">House actions</dialog><div class="toast-container">Saved</div>"""
PROPERTIES = ["paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "height", "bottom"]
SELECTORS = [".main", ".mobile-nav", "dialog.quick-sheet", ".bc-studio", ".bc-controls",
             ".hx-experience", ".hx-mobile", "#dialog.hx-sheet", ".toast-container"]


def values(page):
    return page.evaluate("""({selectors, properties}) => Object.fromEntries(selectors.map(selector => {
      const style = getComputedStyle(document.querySelector(selector));
      return [selector, Object.fromEntries(properties.map(key => [key, style[key]]))];
    }))""", {"selectors": SELECTORS, "properties": PROPERTIES})


def close(actual, expected, label):
    assert abs(float(actual.removesuffix("px")) - expected) < 0.1, (label, actual, expected)


def verify_components(page, native_css, shared_css):
    checks = []
    viewports = [(390, 844), (700, 390), (760, 480), (760, 481), (761, 481),
                 (768, 800), (800, 800), (801, 800), (844, 390), (1000, 500),
                 (1024, 768), (1280, 900)]
    for width, height in viewports:
        page.set_viewport_size({"width": width, "height": height})
        for body in ("", 'class="block-motion-active"', 'data-house="true"'):
            # The payload parser verifies that the native layer precedes shared CSS.
            page.set_content(f"<style>{native_css}</style><style>{shared_css}</style><body {body}>{HTML}</body>")
            baseline = values(page)
            page.evaluate("document.documentElement.dataset.alibiTarget = 'android'")
            current = values(page)
            assert current == baseline, ("zero/fallback layout drift", width, height, body,
                {k: (baseline[k], current[k]) for k in baseline if baseline[k] != current[k]})
            checks.append(f"zero/fallback:{width}x{height}:{body}")
            page.evaluate("""() => {
                const style = document.documentElement.style;
                for (const [side, value] of Object.entries({top: 24, right: 41, bottom: 32, left: 19}))
                    style.setProperty('--safe-area-inset-' + side, value + 'px');
            }""")
            native = values(page)
            house_bottom = 0 if width >= 761 or (height <= 480 and width <= 760) else 116
            close(native[".hx-experience"]["paddingBottom"], house_bottom, "house content bottom")
            close(native[".hx-mobile"]["paddingBottom"], 40, "house dock bottom")
            close(native[".hx-mobile"]["paddingLeft"], 19, "house asymmetric left")
            close(native[".hx-mobile"]["paddingRight"], 41, "house asymmetric right")
            close(native["#dialog.hx-sheet"]["paddingBottom"], 56, "house sheet")
            if body == 'data-house="true"':
                close(native[".toast-container"]["bottom"], 124, "house toast")
            if width <= 800:
                close(native[".mobile-nav"]["paddingBottom"], 41, "main dock padding")
                close(native[".mobile-nav"]["height"], 97, "main dock height")
            if width <= 768:
                close(native["dialog.quick-sheet"]["paddingBottom"], 55, "quick sheet")
            if body == 'class="block-motion-active"':
                if width <= 760 or (600 <= width <= 1000 and height <= 500 and width > height):
                    close(native[".bc-studio"]["paddingTop"], 24, "block top")
                    close(native[".bc-studio"]["paddingBottom"], 32, "block bottom")
                if 600 <= width <= 1000 and height <= 500 and width > height:
                    close(native[".bc-studio"]["paddingRight"], 41, "block landscape right")
                    close(native[".bc-studio"]["paddingLeft"], 19, "block landscape left")
                if width <= 760:
                    close(native[".bc-controls"]["bottom"], 32, "block sticky actions")
            checks.append(f"injected:{width}x{height}:{body}")
            page.evaluate("""() => {
                for (const side of ['top', 'right', 'bottom', 'left'])
                    document.documentElement.style.setProperty('--safe-area-inset-' + side, '0px');
            }""")
            assert values(page) == baseline, ("live inset reset drift", width, height, body)
            checks.append(f"reset:{width}x{height}:{body}")
            page.evaluate("""() => {
                delete document.documentElement.dataset.alibiTarget;
                document.documentElement.style.setProperty('--safe-area-inset-bottom', '80px');
            }""")
            assert values(page) == baseline, ("PWA layout changed", width, height, body)
            checks.append(f"web-isolation:{width}x{height}:{body}")
    return checks


def main():
    # Missing/stale artifacts fail; there is no source-CSS fallback in this runner.
    native, payload = load_native_style(ROOT)
    shared, stylesheet_receipts = load_shared_styles(ROOT)
    payload['sharedStylesheets'] = stylesheet_receipts
    with sync_playwright() as p:
        options = {"headless": True}
        if os.environ.get("ALIBI_CHROMIUM_EXECUTABLE"):
            options["executable_path"] = os.environ["ALIBI_CHROMIUM_EXECUTABLE"]
        browser = p.chromium.launch(**options)
        page = browser.new_page()
        page.route("**/*", lambda route: route.abort())
        checks = verify_components(page, native, shared)
        checks.extend(verify_content_reservation(page, native, shared,
                      ROOT / 'test-results/native-insets/content-screenshots'))
        version = browser.version
        browser.close()
    out = ROOT / "test-results/native-insets"
    out.mkdir(parents=True, exist_ok=True)
    receipt = {"evidence": "chromium-computed-style-fixtures", "browser": version,
               "sourceSha": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip(),
               "sourceDirty": bool(subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip()),
               "payload": payload, "checks": checks, "physicalDeviceAccepted": False}
    (out / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(f"Native inset computed-style fixtures: {len(checks)} passed ({version}); no Android device claim.")


if __name__ == "__main__":
    main()
