"""Deterministic browser assertions for unavailable saved puzzle revisions."""
from time import monotonic

UNAVAILABLE_HEADING = 'The puzzle collection.'
UNAVAILABLE_NOTICE = 'That puzzle revision is not in this collection.'


def unavailable_route_complete(snapshot):
    """Return true only after the unavailable route has visibly settled."""
    return (
        snapshot.get('currentKey') is None
        and snapshot.get('heading') == UNAVAILABLE_HEADING
        and snapshot.get('notice') == UNAVAILABLE_NOTICE
    )


def revision_route_snapshot(page):
    return page.evaluate(
        """() => {
          const current = window.AlibiDiagnostics?.getCurrent?.() || null;
          return {
            currentKey: current ? current.puzzle.id + '@' + current.puzzle.revision : null,
            heading: document.querySelector('#main h1')?.textContent?.trim() || '',
            notice: document.querySelector('#toasts .toast')?.textContent?.trim() || '',
          };
        }"""
    )


def wait_for_unavailable_revision(page, timeout=5000):
    """Poll observable UI state; a pre-navigation null diagnostic is not success."""
    deadline = monotonic() + timeout / 1000
    snapshot = revision_route_snapshot(page)
    while not unavailable_route_complete(snapshot):
        if monotonic() >= deadline:
            raise AssertionError(f'Unavailable revision route did not settle: {snapshot!r}')
        page.wait_for_timeout(25)
        snapshot = revision_route_snapshot(page)
    return snapshot
