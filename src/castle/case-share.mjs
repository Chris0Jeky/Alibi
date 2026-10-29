import Session from '../../tools/case-session.cjs';

// Own only a transient preview and clipboard request; never a case save.
export function createShare() {
  let text = null,
    busy = false,
    active = true;
  return {
    get text() {
      return text;
    },
    get busy() {
      return busy;
    },
    open(definition, completed) {
      if (!active || busy) return false;
      text = Session.share(definition, completed).text;
      return true;
    },
    cancel() {
      if (!active || busy) return false;
      text = null;
      return true;
    },
    async copy(write) {
      if (!active || busy || text === null) return 'ignored';
      busy = true;
      try {
        await write(text);
        if (!active) return 'stale';
        text = null;
        return 'copied';
      } catch {
        return active ? 'blocked' : 'stale';
      } finally {
        busy = false;
      }
    },
    dispose() {
      active = false;
      text = null;
    },
  };
}
