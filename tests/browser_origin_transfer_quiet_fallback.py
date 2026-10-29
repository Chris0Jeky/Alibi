"""Real two-tab Quiet fallback writer regressions; other domain ports are synthetic.

This executes the production createDevicePorts Quiet writer and actual IndexedDB
transactions. It does not accept a destructive five-domain player import.
"""
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "src" / "origin-transfer.js"
KEY = "alibi-quiet-wing-v1:fallback"
FALLBACK_ONLY_SENTINEL = "ALIBI-ISSUE-746-FALLBACK-ONLY"
FALLBACK_RAW = '''{
  "schema": 1,
  "revision": 1,
  "scene": { "room": "original" },
  "fallbackOnly": "ALIBI-ISSUE-746-FALLBACK-ONLY"
}'''


class FixturePage(BaseHTTPRequestHandler):
    def do_GET(self):
        body = b'<!doctype html><title>Quiet fallback synchronization fixture</title>'
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_args):
        pass


SEED_QUIET = """state => new Promise((resolve, reject) => {
    const request = indexedDB.open('alibi-quiet-wing-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('saves');
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('saves', 'readwrite');
        if (state === null) tx.objectStore('saves').delete('state');
        else tx.objectStore('saves').put(state, 'state');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
    };
})"""

APPLY = """async ({kind, target, fallbackKey}) => {
    const api = window.AlibiOriginTransfer;
    const original = {schema: 1, revision: 1, scene: {room: 'original'}};
    const next = target === 'empty'
        ? null
        : {schema: 1, revision: 2, scene: {room: 'imported'}};
    const sample = (quietState) => ({
        cabinet: {
            format: 'alibi-backup',
            schemaVersion: 1,
            runs: [],
            packs: [],
            settings: {},
            preferences: {}
        },
        club: {schema: 1, settings: {}, runs: {}, records: [], stamps: [], visit: 0, lastHero: -1},
        quiet: {kind: 'alibi-quiet-wing-backup', schema: 1, state: quietState},
        castle: {
            format: 'alibi-castle',
            version: 1,
            scope: 'Wrenmere Chapter I only',
            state: null,
            mode: 'local',
            record: null
        },
        challenges: {format: 'alibi-challenges', schema: 1, runs: []}
    });
    const memory = sample(original);
    const device = api.createDevicePorts({});
    if (kind === 'retained' || kind === 'active') {
        const state = JSON.parse(localStorage.getItem(fallbackKey));
        window.QWApp = kind === 'active' ? {state, disposed: false} : {disposed: true};
        if (kind === 'retained') window.QWRetainedState = state;
    }
    const ports = {
        async read(name) {
            return name === 'quiet' ? device.read(name) : structuredClone(memory[name]);
        },
        async write(name, value, attempted) {
            if (name === 'quiet') return device.write(name, value, attempted);
            memory[name] = structuredClone(value);
        },
        retain: (value) => device.retain(value),
        release: () => device.release()
    };
    const descriptorName = kind === 'remove-failure' ? 'removeItem' : 'setItem';
    const descriptor = Object.getOwnPropertyDescriptor(Storage.prototype, descriptorName);
    let injected = false;
    Object.defineProperty(Storage.prototype, descriptorName, {
        ...descriptor,
        value: function (key, value) {
            const shouldFail = key === fallbackKey && (
                kind === 'remove-failure'
                    ? true
                    : kind === 'set-failure' || kind === 'fallback-only'
                        ? JSON.parse(value).revision === 2
                        : true
            );
            if (shouldFail) {
                injected = true;
                throw new DOMException('forced fallback write rejection', 'QuotaExceededError');
            }
            return descriptor.value.call(this, key, value);
        }
    });
    let result;
    try {
        const exported = await api.exportOriginTransfer(sample(next));
        const validated = await api.validateOriginTransfer(JSON.stringify(exported));
        try {
            result = {
                outcome: await api.applyOriginTransfer(validated, ports, {confirmed: true}),
                error: null
            };
        } catch (error) {
            result = {outcome: null, error: {name: error.name, message: error.message}};
        }
    } finally {
        Object.defineProperty(Storage.prototype, descriptorName, descriptor);
    }
    return {...result, injected};
}"""

OBSERVE = """() => new Promise((resolve, reject) => {
    const read = (name, store, key) => new Promise((done, fail) => {
        const request = indexedDB.open(name);
        request.onerror = () => fail(request.error);
        request.onsuccess = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(store)) {
                db.close();
                done(undefined);
                return;
            }
            const tx = db.transaction(store, 'readonly');
            const get = tx.objectStore(store).get(key), count = tx.objectStore(store).count(key);
            tx.oncomplete = () => { db.close(); done({value: get.result, present: count.result > 0}); };
            tx.onabort = () => { db.close(); fail(tx.error); };
        };
    });
    Promise.all([
        read('alibi-quiet-wing-v1', 'saves', 'state'),
        read('alibi-origin-recovery', 'copies', 'pending')
    ]).then(([quiet, recovery]) => {
        let fallback = null;
        const raw = localStorage.getItem('alibi-quiet-wing-v1:fallback');
        if (raw) fallback = JSON.parse(raw);
        resolve({
            quiet: quiet?.value ?? null,
            quietPresent: !!quiet?.present,
            recovery: recovery?.value ?? null,
            fallback,
            fallbackRaw: raw
        });
    }, reject);
})"""


def run_case(browser, server_port, kind):
    context = browser.new_context()
    try:
        importer, observer = context.new_page(), context.new_page()
        url = f"http://127.0.0.1:{server_port}/"
        importer.goto(url)
        observer.goto(url)
        initial = {"schema": 1, "revision": 1, "scene": {"room": "original"}}
        importer.evaluate(SEED_QUIET, None if kind in ("fallback-only", "retained", "active") else initial)
        if kind != "no-fallback":
            importer.evaluate(
                "(raw) => localStorage.setItem('alibi-quiet-wing-v1:fallback', raw)",
                FALLBACK_RAW,
            )
        importer.add_script_tag(content=SOURCE.read_text(encoding="utf-8"))
        target = "empty" if kind == "remove-failure" else "new"
        result = importer.evaluate(
            APPLY,
            {"kind": kind, "target": target, "fallbackKey": KEY},
        )
        recovery_exists = importer.evaluate(
            "async () => (await indexedDB.databases()).some(db => db.name === 'alibi-origin-recovery')"
        )
        observed = observer.evaluate(OBSERVE)
        return {"apply": result, "observed": observed, "recoveryExistedBeforeObservation": recovery_exists}
    finally:
        context.close()


def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), FixturePage)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        with sync_playwright() as playwright:
            options = {"headless": True}
            if os.environ.get("ALIBI_CHROMIUM_EXECUTABLE"):
                options["executable_path"] = os.environ["ALIBI_CHROMIUM_EXECUTABLE"]
            browser = playwright.chromium.launch(**options)
            try:
                set_failure = run_case(browser, server.server_port, "set-failure")
                assert set_failure["apply"]["injected"], set_failure
                assert set_failure["apply"]["error"] is not None, set_failure
                assert set_failure["apply"]["outcome"] is None, set_failure
                assert (
                    "Existing saves were not changed"
                    in set_failure["apply"]["error"]["message"]
                ), set_failure
                assert set_failure["observed"]["quiet"] == {
                    "schema": 1, "revision": 1, "scene": {"room": "original"}
                }, set_failure
                assert set_failure["observed"]["fallback"] == {
                    "schema": 1,
                    "revision": 1,
                    "scene": {"room": "original"},
                    "fallbackOnly": FALLBACK_ONLY_SENTINEL,
                }, set_failure
                assert set_failure["observed"]["fallbackRaw"] == FALLBACK_RAW, set_failure
                assert FALLBACK_ONLY_SENTINEL in set_failure["observed"]["fallbackRaw"]
                assert FALLBACK_ONLY_SENTINEL not in json.dumps(
                    set_failure["observed"]["quiet"]
                ), set_failure
                assert (
                    set_failure["observed"]["recovery"]["quiet"]["state"]["revision"] == 1
                ), set_failure
                assert set(set_failure["observed"]["recovery"]["quiet"]) == {
                    "kind", "schema", "state"
                }, set_failure
                assert FALLBACK_ONLY_SENTINEL not in json.dumps(
                    set_failure["observed"]["recovery"]
                ), set_failure

                remove_failure = run_case(browser, server.server_port, "remove-failure")
                assert remove_failure["apply"]["injected"], remove_failure
                assert remove_failure["apply"]["error"] is not None, remove_failure
                assert remove_failure["apply"]["outcome"] is None, remove_failure
                assert (
                    "Existing saves were not changed"
                    in remove_failure["apply"]["error"]["message"]
                ), remove_failure
                assert remove_failure["observed"]["quiet"] == {
                    "schema": 1, "revision": 1, "scene": {"room": "original"}
                }, remove_failure
                assert remove_failure["observed"]["fallback"] == {
                    "schema": 1,
                    "revision": 1,
                    "scene": {"room": "original"},
                    "fallbackOnly": FALLBACK_ONLY_SENTINEL,
                }, remove_failure
                assert remove_failure["observed"]["fallbackRaw"] == FALLBACK_RAW, remove_failure
                assert FALLBACK_ONLY_SENTINEL in remove_failure["observed"]["fallbackRaw"]
                assert FALLBACK_ONLY_SENTINEL not in json.dumps(
                    remove_failure["observed"]["quiet"]
                ), remove_failure
                assert (
                    remove_failure["observed"]["recovery"]["quiet"]["state"]["revision"] == 1
                ), remove_failure
                assert set(remove_failure["observed"]["recovery"]["quiet"]) == {
                    "kind", "schema", "state"
                }, remove_failure
                assert FALLBACK_ONLY_SENTINEL not in json.dumps(
                    remove_failure["observed"]["recovery"]
                ), remove_failure

                fallback_only = run_case(browser, server.server_port, "fallback-only")
                assert fallback_only["apply"]["injected"], fallback_only
                assert "Existing saves were not changed" in fallback_only["apply"]["error"]["message"], fallback_only
                assert fallback_only["observed"]["quietPresent"] is False, fallback_only
                assert fallback_only["observed"]["fallbackRaw"] == FALLBACK_RAW, fallback_only
                assert fallback_only["observed"]["recovery"] is not None, fallback_only

                for kind in ("retained", "active"):
                    held = run_case(browser, server.server_port, kind)
                    assert held["apply"]["injected"] is False, held
                    assert "Quiet Wing" in held["apply"]["error"]["message"], held
                    assert "Existing saves were not changed" in held["apply"]["error"]["message"], held
                    assert held["recoveryExistedBeforeObservation"] is False, held
                    assert held["observed"]["quietPresent"] is False, held
                    assert held["observed"]["fallbackRaw"] == FALLBACK_RAW, held

                no_fallback = run_case(browser, server.server_port, "no-fallback")
                assert no_fallback["apply"]["injected"] is False, no_fallback
                assert no_fallback["apply"]["error"] is None, no_fallback
                assert no_fallback["apply"]["outcome"]["committed"] is True, no_fallback
                assert no_fallback["observed"]["quiet"]["revision"] == 2, no_fallback
                assert no_fallback["observed"]["fallback"] is None, no_fallback
                assert no_fallback["observed"]["fallbackRaw"] is None, no_fallback
                assert no_fallback["observed"]["recovery"] is None, no_fallback

                print(
                    json.dumps(
                        {
                            "evidence": "real-two-tab-quiet-fallback-writer",
                            "browser": browser.version,
                            "setItemFailureRejectedAndOriginalRetained": True,
                            "removeItemFailureRejectedAndOriginalRetained": True,
                            "missingFallbackRemainsAbsentAndImportSucceeds": True,
                            "fallbackOnlyRollbackLeavesQuietKeyAbsent": True,
                            "activeOrRetainedStateRefusedBeforeRecovery": True,
                            "quietWriter": (
                                "production createDevicePorts over real IndexedDB "
                                "and localStorage"
                            ),
                            "recovery": (
                                "production IndexedDB retain/release, read by the second tab"
                            ),
                            "otherDomainPorts": "synthetic in-memory counters",
                            "playerImportAccepted": False,
                        },
                        sort_keys=True,
                    )
                )
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


if __name__ == "__main__":
    main()
