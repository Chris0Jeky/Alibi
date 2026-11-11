const limit = 6 * 1024 * 1024;

// The optional lab bundle is already cached and embedded where needed.
// It can also run as the source of a one-shot validator without mounting a player.
export function backupValidator(config, parseBackup, prepareRestore) {
  if (typeof WorkerGlobalScope !== 'undefined' && globalThis instanceof WorkerGlobalScope) {
    globalThis.onmessage = ({ data }) => {
      try {
        if (data.type === 'prepare-restore') {
          const value = prepareRestore(data.next, data.active, data.legacy);
          globalThis.postMessage({ ok: true, value });
          return;
        }
        if (data.type !== 'review-backup') throw Error('Unsupported lab validation request.');
        const { text, revision } = data;
        if (
          typeof text !== 'string' ||
          text.length > limit ||
          new TextEncoder().encode(text).length > limit
        )
          throw Error('Choose a lab backup smaller than 6 MB.');
        if (!Number.isSafeInteger(revision)) throw Error('Invalid lab restore revision.');
        globalThis.postMessage({ ok: true, value: parseBackup(text, revision) });
      } catch (error) {
        globalThis.postMessage({ ok: false, error: error.message });
      }
    };
  }
  function request(message) {
    const pack = config();
    return globalThis.AlibiValidateImport(message, pack?.source ?? null, pack?.script);
  }
  return {
    validateBackup: (text, revision) => request({ type: 'review-backup', text, revision }),
    prepareRestore: (next, active, legacy) =>
      request({ type: 'prepare-restore', next, active, legacy }),
  };
}
