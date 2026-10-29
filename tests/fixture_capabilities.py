"""Explicit browser capability setup for isolated, no-origin app fixtures."""
import re


def model_indexeddb_absent(html):
    """Mark IndexedDB as genuinely unavailable before any application script runs."""
    match = re.search(r"<head\b[^>]*>", html, re.IGNORECASE)
    if match is None:
        raise ValueError("The full-app fixture must include a head element")
    setup = (
        '<script data-alibi-fixture="indexeddb-unavailable">'
        "Object.defineProperty(globalThis, 'indexedDB', {"
        " configurable: true, value: undefined });"
        "</script>"
    )
    return html[: match.end()] + setup + html[match.end() :]
