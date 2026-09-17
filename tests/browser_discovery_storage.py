"""Real IndexedDB acceptance for the discovery-entitlement metadata CAS boundary."""

import asyncio
import json
import os
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(
    os.environ.get(
        "ALIBI_RESULTS", str(ROOT / "test-results" / "discovery-storage")
    )
)
URL = os.environ.get("ALIBI_URL", "http://127.0.0.1:8787").rstrip("/")
KEY = "test:discovery-entitlements-cas"
FUTURE_KEY = "test:discovery-entitlements-future"
MALFORMED_KEY = "test:discovery-entitlements-malformed"
OUT.mkdir(parents=True, exist_ok=True)
checks = []
errors = []


def check(value, label):
    assert value, label
    checks.append(label)
    print(f"PASS {label}", flush=True)


async def attempt(page, key, expected_generation, value):
    return await page.evaluate(
        """async ({key, expectedGeneration, value}) => {
          try {
            const saved = await window.__casStore.compareAndSwapMeta(
              key,
              expectedGeneration,
              value,
            );
            return {status: 'fulfilled', value: saved};
          } catch (error) {
            return {
              status: 'rejected',
              name: error?.name || 'Error',
              message: error?.message || String(error),
            };
          }
        }""",
        {
            "key": key,
            "expectedGeneration": expected_generation,
            "value": value,
        },
    )


async def read_meta(page, key):
    return await page.evaluate(
        "(recordKey) => window.__casStore.get('meta', recordKey)", key
    )


async def main():
    runtime = None
    final_state = None
    async with async_playwright() as pw:
        launch = {"headless": True, "args": ["--no-sandbox"]}
        if os.environ.get("CHROMIUM_PATH"):
            launch["executable_path"] = os.environ["CHROMIUM_PATH"]
        elif Path("/usr/bin/chromium").exists():
            launch["executable_path"] = "/usr/bin/chromium"
        browser = await pw.chromium.launch(**launch)
        try:
            context = await browser.new_context()
            page_a = await context.new_page()
            page_b = await context.new_page()
            for page in (page_a, page_b):
                page.set_default_timeout(7000)
                page.on("pageerror", lambda error: errors.append(str(error)))
            await asyncio.gather(
                page_a.goto(URL + "/#/home"),
                page_b.goto(URL + "/#/home"),
            )
            await asyncio.gather(
                page_a.locator("#main").wait_for(state="visible"),
                page_b.locator("#main").wait_for(state="visible"),
            )
            runtime = await page_a.evaluate(
                "({version: ALIBI_CONFIG.version, build: ALIBI_CONFIG.build})"
            )
            modes = await asyncio.gather(
                page_a.evaluate(
                    """async () => {
                      window.__casStore = await new AlibiStorage.Store().init();
                      return window.__casStore.mode;
                    }"""
                ),
                page_b.evaluate(
                    """async () => {
                      window.__casStore = await new AlibiStorage.Store().init();
                      return window.__casStore.mode;
                    }"""
                ),
            )
            check(modes == ["indexeddb", "indexeddb"], "Both tabs use IndexedDB")

            await page_a.evaluate(
                """async (keys) => {
                  await new Promise((resolve, reject) => {
                    const tx = window.__casStore.db.transaction('meta', 'readwrite');
                    const store = tx.objectStore('meta');
                    for (const key of keys) store.delete(key);
                    tx.oncomplete = resolve;
                    tx.onerror = () => reject(tx.error || new Error('cleanup failed'));
                    tx.onabort = () => reject(tx.error || new Error('cleanup aborted'));
                  });
                }""",
                [KEY, FUTURE_KEY, MALFORMED_KEY],
            )

            first = await page_a.evaluate(
                """async (key) => {
                  const candidate = {
                    schema: 1,
                    generation: 1,
                    receipts: [],
                    owned: [],
                    outbox: [],
                  };
                  const pending = window.__casStore.compareAndSwapMeta(key, 0, candidate);
                  candidate.receipts.push('mutated-after-call');
                  const saved = await pending;
                  const stored = await window.__casStore.get('meta', key);
                  return {candidate, saved, stored};
                }""",
                KEY,
            )
            check(first["saved"]["generation"] == 1, "Absent metadata starts at generation one")
            check(
                first["saved"] == first["stored"],
                "Committed metadata is returned exactly",
            )
            check(
                first["stored"]["receipts"] == []
                and first["candidate"]["receipts"] == ["mutated-after-call"],
                "CAS clones the caller before the asynchronous transaction",
            )

            left = {
                "schema": 1,
                "generation": 2,
                "writer": "left-tab",
                "receipts": [],
                "owned": [],
                "outbox": [],
            }
            right = {
                "schema": 1,
                "generation": 2,
                "writer": "right-tab",
                "receipts": [],
                "owned": [],
                "outbox": [],
            }
            left_result, right_result = await asyncio.gather(
                attempt(page_a, KEY, 1, left),
                attempt(page_b, KEY, 1, right),
            )
            outcomes = [left_result, right_result]
            fulfilled = [item for item in outcomes if item["status"] == "fulfilled"]
            rejected = [item for item in outcomes if item["status"] == "rejected"]
            check(
                len(fulfilled) == 1 and len(rejected) == 1,
                "Concurrent tab writers produce one commit and one conflict",
            )
            check(
                rejected[0]["name"] == "GenerationConflictError",
                "The stale tab receives a typed generation conflict",
            )
            final_state = await read_meta(page_a, KEY)
            check(
                final_state == fulfilled[0]["value"]
                and final_state["generation"] == 2,
                "The losing transaction cannot replace the committed state",
            )

            stale = await attempt(
                page_b,
                KEY,
                1,
                {
                    "schema": 1,
                    "generation": 2,
                    "writer": "stale-retry",
                },
            )
            check(
                stale["status"] == "rejected"
                and stale["name"] == "GenerationConflictError",
                "A later stale retry remains rejected",
            )
            unchanged = await read_meta(page_a, KEY)
            check(unchanged == final_state, "A rejected retry leaves bytes unchanged")

            await page_a.evaluate(
                """async ({key, value}) => {
                  await window.__casStore.put('meta', key, value);
                }""",
                {
                    "key": FUTURE_KEY,
                    "value": {"schema": 2, "generation": 7, "future": True},
                },
            )
            future = await attempt(
                page_b,
                FUTURE_KEY,
                7,
                {"schema": 1, "generation": 8, "replacement": "old-reader"},
            )
            check(
                future["status"] == "rejected"
                and future["name"] == "ProtectedRecordError",
                "A future-schema record is protected from an older writer",
            )
            future_stored = await read_meta(page_a, FUTURE_KEY)
            check(
                future_stored == {"schema": 2, "generation": 7, "future": True},
                "Future metadata is preserved exactly",
            )

            await page_a.evaluate(
                """async ({key, value}) => {
                  await window.__casStore.put('meta', key, value);
                }""",
                {
                    "key": MALFORMED_KEY,
                    "value": {"schema": 1, "generation": "seven", "payload": "keep"},
                },
            )
            malformed = await attempt(
                page_b,
                MALFORMED_KEY,
                0,
                {"schema": 1, "generation": 1, "replacement": "empty"},
            )
            check(
                malformed["status"] == "rejected"
                and malformed["name"] == "ProtectedRecordError",
                "Malformed existing metadata is protected rather than treated as empty",
            )
            malformed_stored = await read_meta(page_a, MALFORMED_KEY)
            check(
                malformed_stored
                == {"schema": 1, "generation": "seven", "payload": "keep"},
                "Malformed metadata remains available for recovery",
            )
            check(not errors, "No browser page errors")
            await context.close()
        finally:
            await browser.close()

    receipt = {
        "passed": True,
        "checks": checks,
        "errors": errors,
        "runtime": runtime,
        "origin": URL,
        "finalState": final_state,
        "scope": (
            "real Chromium, two same-origin tabs and the real alibi-device IndexedDB; "
            "does not wire discovery receipts into runtime rewards"
        ),
    }
    (OUT / "receipt.json").write_text(json.dumps(receipt, indent=2), encoding="utf-8")
    print(json.dumps(receipt, indent=2), flush=True)


if __name__ == "__main__":
    asyncio.run(main())
