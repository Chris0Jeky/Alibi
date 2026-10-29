"""Actual-control smoke for the standalone interval desk. No production UI is loaded."""

from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import threading
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
PROTOTYPE = ROOT / "prototypes/interval-desk"
EVIDENCE = Path(
    os.environ.get("ALIBI_INTERVAL_DESK_EVIDENCE_DIR", PROTOTYPE / "evidence")
).resolve()
try:
    EVIDENCE.relative_to(ROOT)
except ValueError:
    raise ValueError("browser evidence output must stay inside the repository") from None
EVENT_IDS = ["lantern", "bell", "gate", "ledger", "case"]
SOURCE_FILES = [
    PROTOTYPE / "index.html",
    PROTOTYPE / "desk.css",
    PROTOTYPE / "desk.mjs",
    PROTOTYPE / "model.mjs",
    Path(__file__),
]


class QuietStaticHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass


def start_server():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietStaticHandler, directory=str(PROTOTYPE))
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    return server


def read_schedule(page, panel_id):
    panel = page.locator(f"#{panel_id}")
    tables = panel.locator(".schedule-table")
    if tables.count() == 0:
        return None
    result = {}
    for row in tables.first.locator("tbody tr").all():
        result[row.locator("th").inner_text()] = row.locator("td").inner_text()
    return result


def assert_schedule_relation(schedule, before_name, after_name, truth):
    assert schedule, "The rendered control must retain a complete witness schedule"
    before = int(schedule[before_name].split(":")[1])
    after = int(schedule[after_name].split(":")[1])
    assert (before < after) is truth, (schedule, before_name, after_name, truth)


def compact_text(locator):
    return "".join(locator.inner_text().split())


def layout_is_bounded(page, width):
    measured = page.evaluate(
        """() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          body: document.body.scrollWidth,
          table: document.querySelector('.event-table').getBoundingClientRect().width,
          visibleControls: [...document.querySelectorAll('.event-controls input[type=range]')]
            .filter(el => el.getBoundingClientRect().width > 0).length
        })"""
    )
    assert measured["viewport"] == width
    assert measured["document"] <= width and measured["body"] <= width, measured
    assert measured["visibleControls"] == len(EVENT_IDS) * 2, measured


def run():
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    server = start_server()
    host, port = server.server_address
    origin = f"http://{host}:{port}"
    results = {
        "format": "postern-interval-desk-browser-1",
        "sourceSha256": {
            str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
            for path in SOURCE_FILES
        },
        "viewports": [],
        "screenshots": [],
        "externalRequests": [],
        "pageErrors": [],
    }
    try:
        with sync_playwright() as playwright:
            launch = {"headless": True}
            if os.environ.get("ALIBI_CHROMIUM"):
                launch["executable_path"] = os.environ["ALIBI_CHROMIUM"]
            browser = playwright.chromium.launch(**launch)
            results["chromium"] = browser.version
            for width, height in [(320, 740), (1280, 900)]:
                context = browser.new_context(
                    viewport={"width": width, "height": height},
                    reduced_motion="reduce",
                )
                page = context.new_page()
                errors = results["pageErrors"]
                external = results["externalRequests"]
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on(
                    "request",
                    lambda request: external.append(request.url)
                    if not request.url.startswith(origin)
                    else None,
                )
                page.goto(f"{origin}/index.html", wait_until="networkidle")
                page.locator("#model-status").wait_for()
                assert page.title().startswith("The night ledger at Fenmere")
                assert page.locator(".event-table tbody tr").count() == 5
                assert [
                    page.locator(f"#event-row-{event_id}").get_attribute("data-event-id")
                    for event_id in EVENT_IDS
                ] == EVENT_IDS
                event_ids = [
                    page.locator(f"#event-row-{event_id}").get_attribute("data-event-id")
                    for event_id in EVENT_IDS
                ]
                assert "Ambiguous:" in page.locator("#model-status").inner_text()
                assert page.locator("#classification").get_attribute("data-verdict") == "possible"
                assert_schedule_relation(
                    read_schedule(page, "witnesses"),
                    "West gate opens",
                    "Fog bell sounds",
                    True,
                )
                # The page renders two witness cards; check them independently instead of relying
                # on the selected claim's answer label.
                cards = page.locator("#witnesses .witness-card")
                assert cards.count() == 2
                support = read_schedule(page, "witnesses")
                assert support is not None
                counterexample_text = cards.nth(1).inner_text()
                assert "makes the selected claim false" in counterexample_text
                counterexample = {}
                for row in cards.nth(1).locator(".schedule-table tbody tr").all():
                    counterexample[row.locator("th").inner_text()] = row.locator("td").inner_text()
                assert_schedule_relation(
                    counterexample,
                    "West gate opens",
                    "Fog bell sounds",
                    False,
                )

                story_text = page.locator("#clues").inner_text()
                model_count = page.locator("#model-status").inner_text()
                page.locator("#story-toggle").focus()
                page.keyboard.press("Enter")
                assert page.locator("#story-copy").is_hidden()
                assert page.locator("#story-toggle").get_attribute("aria-pressed") == "false"
                assert page.locator("#clues").inner_text() == story_text
                assert [
                    page.locator(f"#event-row-{event_id}").get_attribute("data-event-id")
                    for event_id in EVENT_IDS
                ] == event_ids
                assert page.locator("#model-status").inner_text() == model_count
                page.keyboard.press("Enter")
                assert page.locator("#story-copy").is_visible()

                # Keyboard operation changes a real native range control and keeps focus in place.
                low = page.locator("#range-lantern-earliest")
                low.focus()
                page.keyboard.press("ArrowRight")
                assert low.input_value() == "2"
                assert low.evaluate("el => el === document.activeElement")
                assert compact_text(page.locator("#window-lantern")) == "20:02–20:05"
                page.locator("#undo").focus()
                page.keyboard.press("Enter")
                assert low.input_value() == "1"

                # A native Earlier control narrows only the hypothetical interval. The fixed
                # clock window remains visible and unchanged.
                page.locator("#earlier-bell").click()
                assert compact_text(page.locator("#window-bell")) == "20:03–20:06"
                assert compact_text(page.locator("#event-row-bell td").nth(1)) == "20:03–20:07"
                page.locator("#undo").click()
                assert compact_text(page.locator("#window-bell")) == "20:03–20:07"
                page.locator("#later-gate").click()
                assert compact_text(page.locator("#window-gate")) == "20:03–20:06"
                assert compact_text(page.locator("#event-row-gate td").nth(1)) == "20:02–20:06"
                page.locator("#undo").click()
                assert compact_text(page.locator("#window-gate")) == "20:02–20:06"

                # The timeline is optional, read-only and equivalent to the table, while table
                # controls remain visible and operable underneath it.
                page.locator("#timeline-toggle").click()
                assert page.locator("#timeline").is_visible()
                assert page.locator("#timeline-rows .timeline-row").count() == 5
                assert page.locator("#timeline-toggle").get_attribute("aria-expanded") == "true"
                for event_id in EVENT_IDS:
                    table_interval = compact_text(page.locator(f"#window-{event_id}"))
                    axis_interval = page.locator(f"#timeline-window-{event_id}").inner_text()
                    assert axis_interval == table_interval, event_id
                    assert page.locator(f"#event-row-{event_id}").is_visible()
                assert page.locator("#timeline input, #timeline button").count() == 0
                assert page.locator("audio, video").count() == 0
                layout_is_bounded(page, width)

                if width == 320:
                    image = EVIDENCE / "interval-desk-320.png"
                    page.locator("#timeline-toggle").click()
                    page.screenshot(path=str(image), full_page=True)
                    results["screenshots"].append(str(image.relative_to(ROOT)))

                    # Boundary controls can express an inconsistent hypothetical model without
                    # deleting fixed evidence; the interface must not classify a claim vacuously.
                    lamp_low = page.locator("#range-lantern-earliest")
                    lamp_low.focus()
                    page.keyboard.press("End")
                    assert compact_text(page.locator("#window-lantern")) == "20:05–20:05"
                    bell_high = page.locator("#range-bell-latest")
                    bell_high.focus()
                    page.keyboard.press("Home")
                    page.keyboard.press("ArrowRight")
                    assert compact_text(page.locator("#window-bell")) == "20:03–20:04"
                    assert "No schedules fit" in page.locator("#model-status").inner_text()
                    assert page.locator("#classification").get_attribute("data-verdict") == "no-schedules"
                    assert "Not classified" in page.locator("#classification").inner_text()
                    assert "zero-schedule" in page.locator("#model-status").inner_text()
                    for card in page.locator("#witnesses .witness-card").all():
                        assert "zero-schedule model" in card.inner_text()

                    # A single-minute interval at the final tick must remain inside the
                    # read-only timeline instead of spilling past the narrow viewport.
                    page.locator("#range-case-earliest").focus()
                    page.keyboard.press("End")
                    assert compact_text(page.locator("#window-case")) == "20:08–20:08"
                    page.locator("#timeline-toggle").click()
                    band_bounds = page.locator("#timeline-band-case").evaluate(
                        """band => {
                          const track = band.parentElement.getBoundingClientRect();
                          const marker = band.getBoundingClientRect();
                          return { left: marker.left, right: marker.right,
                            trackLeft: track.left, trackRight: track.right };
                        }"""
                    )
                    assert band_bounds["left"] >= band_bounds["trackLeft"] - 1, band_bounds
                    assert band_bounds["right"] <= band_bounds["trackRight"] + 1, band_bounds
                    layout_is_bounded(page, width)

                    page.locator("#restart").click()
                    assert "Ambiguous:" in page.locator("#model-status").inner_text()
                    assert page.locator("#range-lantern-earliest").input_value() == "1"
                    assert page.locator("#range-bell-latest").input_value() == "7"
                    assert page.locator("#timeline").is_hidden()
                    assert page.locator("#story-copy").is_visible()

                    # All three epistemic classifications use the same fixed problem and retain
                    # the relevant witness or counterexample.
                    page.locator("#claim-select").select_option("lantern-before-case")
                    assert page.locator("#classification").get_attribute("data-verdict") == "necessary"
                    assert "No counterexample exists" in page.locator("#witnesses").inner_text()
                    page.locator("#claim-select").select_option("case-before-bell")
                    assert page.locator("#classification").get_attribute("data-verdict") == "impossible"
                    assert "No admissible schedule supports" in page.locator("#witnesses").inner_text()
                    page.locator("#claim-select").select_option("gate-before-bell")
                    assert page.locator("#classification").get_attribute("data-verdict") == "possible"
                    assert cards.count() == 2
                else:
                    image = EVIDENCE / "interval-desk-1280.png"
                    page.screenshot(path=str(image), full_page=True)
                    results["screenshots"].append(str(image.relative_to(ROOT)))

                results["viewports"].append(
                    {
                        "width": width,
                        "height": height,
                        "eventRows": page.locator(".event-table tbody tr").count(),
                        "workingControls": page.locator(".event-controls input[type=range]").count(),
                        "model": page.locator("#model-status").inner_text(),
                        "actualControls": "passed",
                    }
                )
                context.close()

            assert not results["externalRequests"], results["externalRequests"]
            assert not results["pageErrors"], results["pageErrors"]
            browser.close()
    finally:
        server.shutdown()
        server.server_close()

    results["screenshots"] = [
        {
            "path": path,
            "bytes": (ROOT / path).stat().st_size,
            "sha256": hashlib.sha256((ROOT / path).read_bytes()).hexdigest(),
        }
        for path in results["screenshots"]
    ]
    (EVIDENCE / "browser-receipt.json").write_text(
        json.dumps(results, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    run()
