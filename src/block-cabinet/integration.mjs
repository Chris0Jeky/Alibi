import { mountSurface } from './surface.mjs';
import { cascadeAdapter } from './studio.mjs';

/** Progressive adapter: production Classic still commits through AlibiClub.action and its save queue. */
export function startIntegration() {
  if (globalThis.AlibiBlockMotion?.running) return;
  let host = null,
    panel = null,
    surface = null,
    busy = 0,
    simple = false,
    lab = null,
    labEpoch = 0;
  const club = () => globalThis.AlibiClub;
  const engine = () => globalThis.AlibiClubEngines.blockCabinet;
  const run = () => club().diagnostics().state.runs.blockcabinet;
  const state = () => engine().replay(run().seed, run().log);
  const action = async (name, data = {}) => {
    busy++;
    try {
      await club().action({ dataset: { action: 'club-' + name, ...data } });
      await club().save();
    } finally {
      busy--;
      attach();
    }
  };
  function closeLab() {
    labEpoch++;
    if (!lab) return;
    lab.surface?.dispose();
    lab.adapter?.dispose();
    lab.dialog.remove();
    lab = null;
    host?.querySelector('[data-command="switch"]')?.focus();
  }
  async function openLab() {
    const token = ++labEpoch,
      adapter = await cascadeAdapter();
    if (token !== labEpoch || !host?.isConnected) {
      adapter.dispose();
      return;
    }
    closeLab();
    const dialog = document.createElement('dialog');
    dialog.className = 'bc-modal';
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'bc-modal-close';
    close.setAttribute('aria-label', 'Close Cascade lab');
    close.textContent = '×';
    const body = document.createElement('div');
    dialog.append(close, body);
    document.body.append(dialog);
    lab = { dialog, adapter, surface: mountSurface(body, adapter, { onSwitch: closeLab }) };
    close.addEventListener('click', closeLab);
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeLab();
    });
    dialog.showModal();
    close.focus();
  }
  function restoreSimple() {
    simple = true;
    document.body.classList.remove('block-motion-active');
    surface?.dispose();
    surface = null;
    host?.remove();
    host = null;
    panel?.closest('.club-playlayout')?.classList.remove('bc-enhanced-layout');
    panel?.querySelectorAll('.bc-legacy').forEach((el) => el.classList.remove('bc-legacy'));
    installEnable();
  }
  function installEnable() {
    if (!panel || panel.querySelector('.bc-enable')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn bc-enable';
    button.textContent = 'Use tactile controls';
    button.addEventListener('click', () => {
      simple = false;
      button.remove();
      attach();
    });
    panel.prepend(button);
  }
  const adapter = {
    read: state,
    shape: (id) => engine().shape(id),
    legal: (s, slot, cell) => engine().legal(s, slot, cell),
    canUndo: () => run().log.length > 0,
    canRedo: () => run().redo.length > 0,
    saveLabel: () => {
      const d = club().diagnostics();
      return d.saveError
        ? 'SAVE WARNING: ' + d.saveError
        : d.storageMode === 'session'
          ? 'Classic is session-only. Use Simple controls to export the Club save.'
          : 'Classic uses your existing Club save, replay and undo. Use Simple controls for seed and backup options.';
    },
    async place(slot, cell) {
      if (run().log.length >= 500)
        throw Error(
          'This Classic replay reached its existing 500-move limit. Export it and start a new seed.',
        );
      busy++;
      try {
        const selected =
          document.getElementById('block-cabinet-piece-' + slot)?.getAttribute('aria-pressed') ===
          'true';
        if (!selected) await action('block-piece', { value: String(slot) });
        await action('block-cell', { cell: String(cell) });
      } finally {
        busy--;
        attach();
      }
    },
    undo: () => action('undo', { id: 'blockcabinet' }),
    redo: () => action('redo', { id: 'blockcabinet' }),
    simple: restoreSimple,
  };
  function attach() {
    if (busy) return;
    const target = document.querySelector('.block-panel');
    document.body.classList.toggle('block-motion-active', !!target && !simple);
    if (!target) {
      surface?.dispose();
      surface = null;
      host?.remove();
      host = null;
      panel = null;
      closeLab();
      return;
    }
    panel = target;
    if (simple) {
      installEnable();
      return;
    }
    if (!host) {
      host = document.createElement('div');
      host.className = 'bc-host';
    }
    // Reattach the retained surface after the Club's whole-page render. Pointer moves never render the host app.
    for (const child of [...target.children]) if (child !== host) child.classList.add('bc-legacy');
    target.closest('.club-playlayout').classList.add('bc-enhanced-layout');
    if (host.parentElement !== target) target.append(host);
    try {
      if (!surface)
        surface = mountSurface(host, adapter, {
          onSwitch: openLab,
          reducedMotion:
            !!club().diagnostics().state.settings.zen ||
            document.documentElement.dataset.reduced === 'true',
        });
      else surface.refresh();
      const kicker = host.querySelector('.bc-header .bc-kicker');
      if (kicker && kicker.tagName !== 'A') {
        const back = document.createElement('a');
        back.className = 'bc-kicker bc-return';
        back.href = '#/salon';
        back.textContent = '← Games room';
        kicker.replaceWith(back);
      }
    } catch {
      restoreSimple();
    }
  }
  const observer = new MutationObserver(() => {
    const target = document.querySelector('.block-panel');
    if (!busy && (target !== panel || (target && !host?.isConnected && !simple))) attach();
  });
  observer.observe(document.body, { subtree: true, childList: true });
  attach();
  globalThis.AlibiBlockMotion = {
    ...globalThis.AlibiBlockMotion,
    running: true,
    diagnostics: () => ({ active: !!surface, simple, lab: !!lab, ...surface?.diagnostics() }),
    dispose() {
      document.body.classList.remove('block-motion-active');
      observer.disconnect();
      closeLab();
      surface?.dispose();
      host?.remove();
      panel?.closest('.club-playlayout')?.classList.remove('bc-enhanced-layout');
      panel?.querySelectorAll('.bc-legacy').forEach((el) => el.classList.remove('bc-legacy'));
      globalThis.AlibiBlockMotion.running = false;
    },
  };
}
globalThis.AlibiBlockMotion = { start: startIntegration };
