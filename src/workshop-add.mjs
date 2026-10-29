// In-app adding of curated collections (#433). The build replaces the empty list below with the
// hashed shelf catalogue and emits this module beside the packs in assets/workshop/: it is never
// precached or a startup script. It only fetches and verifies bytes; installation stays with the
// Workshop importer (#pack-input -> bounded worker -> duplicate refusal -> one save owner).
export const COLLECTIONS = [];
const LIMIT = 3 * 1024 * 1024;
const esc = (text) => String(text).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
const hex = (buffer) =>
  [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
const refused = (why) => Error(why + ' Nothing was installed or changed.');

// Same-directory, size-bounded, SHA-256-checked download of one listed pack.
export async function fetchPack(
  entry,
  base = import.meta.url,
  get = fetch,
  progress = () => {},
  signal,
) {
  const moduleAsset = entry?.kind === 'module';
  if (
    !entry ||
    !/^[a-z][a-z0-9-]{0,59}$/.test(entry.id) ||
    !/^[a-f0-9]{64}$/.test(entry.sha256) ||
    (moduleAsset
      ? entry.id !== 'receipt' || entry.download !== `receipt.${entry.sha256.slice(0, 12)}.js`
      : entry.download !== `${entry.id}.${entry.sha256}.json`) ||
    !Number.isSafeInteger(entry.bytes) ||
    entry.bytes < 1 ||
    entry.bytes > LIMIT
  )
    throw refused('This collection listing is not valid.');
  const checkCancelled = () => {
    if (signal?.aborted) throw refused('Adding this collection was cancelled.');
  };
  checkCancelled();
  let response;
  try {
    response = await get(new URL(entry.download, base), {
      credentials: 'same-origin',
      redirect: 'error',
      ...(signal ? { signal } : {}),
    });
  } catch {
    checkCancelled();
    throw refused('Adding a collection needs a connection; installed puzzles still play offline.');
  }
  if (signal?.aborted) {
    response.body?.cancel().catch(() => {});
    checkCancelled();
  }
  if (!response.ok || !response.body) throw refused('That collection is unavailable right now.');
  const reader = response.body.getReader(),
    bytes = new Uint8Array(entry.bytes);
  const cancel = () => reader.cancel().catch(() => {});
  signal?.addEventListener('abort', cancel, { once: true });
  let size = 0;
  try {
    for (;;) {
      checkCancelled();
      const { done, value } = await reader.read();
      checkCancelled();
      if (done) break;
      if (size + value.length > entry.bytes) {
        cancel();
        throw refused('That download is larger than listed, so it was refused.');
      }
      bytes.set(value, size);
      size += value.length;
      progress(size, entry.bytes);
    }
    const digest = size === entry.bytes && hex(await crypto.subtle.digest('SHA-256', bytes));
    checkCancelled();
    if (digest !== entry.sha256)
      throw refused('That download does not match its listed size and fingerprint.');
    return bytes;
  } catch (error) {
    cancel();
    checkCancelled();
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

// Hand verified bytes to the existing importer exactly as a chosen file would arrive.
export function handOff(bytes, entry, input) {
  const transfer = new DataTransfer();
  transfer.items.add(new File([bytes], entry.id + '.json', { type: 'application/json' }));
  input.files = transfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export function open(doc = document, list = COLLECTIONS) {
  if (doc.querySelector('dialog.collections-add')) return;
  const opener = doc.activeElement,
    input = doc.getElementById('pack-input'),
    lifetime = new AbortController(),
    d = doc.createElement('dialog');
  let active = true,
    downloading = false;
  const stop = () => {
    active = false;
    lifetime.abort();
  };
  d.className = 'collections-add';
  d.setAttribute('aria-labelledby', 'collections-title');
  d.innerHTML = `<form method="dialog"><button class="dialog-close" aria-label="Close">&times;</button></form><h2 id="collections-title" tabindex="-1">Add a curated collection.</h2><p>Adding downloads a data-only pack from this site, checks its listed size and SHA-256 fingerprint, then validates it in the Workshop like any imported pack. It needs a connection; once added, its puzzles play offline. A collection you already have is refused, never overwritten. Difficulty labels are provisional.</p>${list
    .map(
      (c) =>
        `<section class="panel" aria-labelledby="add-${esc(c.id)}"><h3 id="add-${esc(c.id)}">${esc(c.title)}</h3><p>${c.count} puzzles · ${c.families.map((f) => `${f.count} ${esc(f.type)}`).join(' · ')} · ${c.bytes.toLocaleString('en-GB')} bytes</p><p>${esc(c.description)}</p><button class="btn" type="button" data-add="${esc(c.id)}">Add ${esc(c.title)}</button></section>`,
    )
    .join(
      '',
    )}<p class="fine" role="status" aria-live="polite"></p><div class="dialog-actions"><a class="btn secondary" href="${new URL('../../collections/index.html', import.meta.url)}" target="_blank" rel="noopener">Browse downloads (new tab)</a></div>`;
  const status = d.querySelector('[role="status"]');
  d.addEventListener('cancel', stop);
  d.addEventListener('close', () => {
    stop();
    d.remove();
    if (opener?.isConnected) opener.focus();
  });
  const leave = () => {
    stop();
    if (d.open) d.close();
  };
  for (const event of ['hashchange', 'pagehide'])
    doc.defaultView?.addEventListener(event, leave, { signal: lifetime.signal });
  d.addEventListener('click', async (e) => {
    if (e.target.closest('.dialog-close')) {
      stop();
      return;
    }
    const button = e.target.closest('[data-add]');
    const entry = button && list.find((c) => c.id === button.dataset.add);
    if (!entry || !active || !d.open || downloading) return;
    downloading = true;
    const buttons = d.querySelectorAll('[data-add]');
    buttons.forEach((b) => (b.disabled = true));
    status.textContent = `Downloading ${entry.title}… Close to cancel.`;
    try {
      const bytes = await fetchPack(
        entry,
        undefined,
        undefined,
        (got, total) => {
          if (active && d.open)
            status.textContent = `Downloading ${entry.title}: ${Math.floor((got / total) * 100)}%. Close to cancel.`;
        },
        lifetime.signal,
      );
      if (!active || !d.open) return;
      if (!input?.isConnected || input !== doc.getElementById('pack-input')) {
        leave();
        return;
      }
      stop();
      d.close();
      handOff(bytes, entry, input);
    } catch (error) {
      if (!active || !d.open) return;
      status.textContent = error.message;
      downloading = false;
      buttons.forEach((b) => (b.disabled = false));
    }
  });
  doc.body.append(d);
  d.showModal();
  d.querySelector('#collections-title').focus();
}
