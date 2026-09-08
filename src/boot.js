/* Keep startup failures recoverable without clearing device-local progress. */
(function () {
  'use strict';
  const timer = setTimeout(() => {
    if (globalThis.AlibiDiagnostics) return;
    const app = document.getElementById('app');
    if (!app || document.getElementById('boot-recovery')) return;
    const panel = document.createElement('section');
    panel.id = 'boot-recovery';
    panel.className = 'panel';
    panel.setAttribute('role', 'alert');
    const title = document.createElement('h2');
    title.textContent = 'Taking longer than expected.';
    const note = document.createElement('p');
    note.textContent =
      'Close other Alibi windows, then retry. Your saved progress has not been cleared. If this keeps happening, refresh the app files while online; this keeps your puzzles and saves.';
    const retry = document.createElement('button');
    retry.className = 'btn';
    retry.textContent = 'Retry opening';
    retry.onclick = () => location.reload();
    const refresh = document.createElement('button');
    refresh.className = 'btn secondary';
    refresh.textContent = 'Refresh app files';
    refresh.onclick = async () => {
      refresh.disabled = true;
      try {
        if (!navigator.onLine) throw Error('Connect to the internet before refreshing app files.');
        const registrations = (await navigator.serviceWorker?.getRegistrations()) || [];
        for (const registration of registrations) {
          if (registration.scope === new URL('./', location.href).href)
            await registration.unregister();
        }
        if ('caches' in globalThis) {
          for (const name of await caches.keys()) {
            if (name.startsWith('alibi-shell-')) await caches.delete(name);
          }
        }
        location.reload();
      } catch (error) {
        note.textContent = error.message;
        refresh.disabled = false;
      }
    };
    panel.append(title, note, retry, refresh);
    app.append(panel);
  }, 12000);
  globalThis.AlibiBootReady = () => {
    clearTimeout(timer);
    document.getElementById('boot-recovery')?.remove();
  };
})();
