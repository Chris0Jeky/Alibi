'use strict';
// Real Club lifecycle/rules in a minimal DOM; Worker and storage are observable ports.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { fakeLocks } = require('./fallback-locks.cjs');
const root = path.resolve(__dirname, '../..');
const copy = (x) => JSON.parse(JSON.stringify(x));
const fresh = () => ({
  schema: 1,
  settings: { assist: 'off', zen: false, pinned: null },
  visit: 0,
  lastHero: -1,
  runs: {},
  records: [],
  stamps: [],
});
async function session(data = fresh(), raw = null, options = {}) {
  const storage = new Map([['alibi-afterhours-v1', raw || JSON.stringify({ rev: 1, data })]]);
  const messages = [],
    workers = [],
    blobs = [],
    dialogs = [],
    nodes = new Map();
  let randomCalls = 0;
  const dialogListeners = new Map();
  const dialogNode = {
    open: false,
    close() {
      this.open = false;
    },
    addEventListener(type, listener) {
      const listeners = dialogListeners.get(type) || [];
      listeners.push(listener);
      dialogListeners.set(type, listeners);
    },
    dispatchEvent(event) {
      for (const listener of dialogListeners.get(event.type) || []) listener(event);
      // Match a native <dialog>: Escape closes unless a cancel handler prevents it.
      if (event.type === 'cancel' && !event.defaultPrevented) this.close();
      return !event.defaultPrevented;
    },
  };
  nodes.set('dialog', dialogNode);
  class FixedDate extends Date {
    static now() {
      return 1790352000000;
    }
  }
  const math = Object.create(Math);
  math.random = () => {
    randomCalls++;
    return 0;
  };
  class Worker {
    constructor() {
      this.terminated = false;
      workers.push(this);
    }
    postMessage(value) {
      this.request = copy(value);
    }
    terminate() {
      this.terminated = true;
    }
  }
  class TestURL extends URL {
    static createObjectURL(blob) {
      blobs.push(blob);
      return 'blob:club-test';
    }
    static revokeObjectURL() {}
  }
  const context = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date: FixedDate,
    Math: math,
    JSON,
    Number,
    Promise,
    Blob,
    Worker,
    URL: TestURL,
    URLSearchParams,
    location: { hash: '', href: 'https://example.test/' },
    navigator: { locks: fakeLocks() },
    localStorage: {
      getItem: (key) => {
        if (options.unavailable) throw Error('Storage unavailable');
        return storage.get(key) || null;
      },
      setItem: (k, v) => storage.set(k, String(v)),
      removeItem: (key) => storage.delete(key),
    },
    sessionStorage: { getItem: () => null, removeItem() {} },
    document: {
      addEventListener() {},
      createElement: () => ({}),
      body: { append() {}, classList: { toggle() {} } },
      getElementById: (id) => nodes.get(id) || null,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
    ...options.context,
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const name of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src', name + '.js'), 'utf8'), context);
  options.beforeInit?.(context);
  const club = context.AlibiClub;
  await club.init({
    render() {},
    navigate() {},
    all: () => [],
    records: () => [],
    settings: () => ({}),
    toast: (text) => messages.push(text),
    dialog: (...args) => {
      dialogs.push(args);
      dialogNode.open = true;
    },
  });
  return {
    club,
    context,
    storage,
    workers,
    blobs,
    nodes,
    messages,
    dialogs,
    randomCalls: () => randomCalls,
    state: () => copy(club.diagnostics().state),
    action: async (name, values = {}) => {
      await club.action({ dataset: { action: 'club-' + name, ...values } });
      await club.flush();
    },
    dialogAction: async (name) => {
      const actions = dialogs.at(-1)?.[2] || [];
      if (!actions.some((button) => button.action === name))
        throw Error(`Dialog action ${name} is not available.`);
      if (name === 'close-dialog') dialogNode.close();
      else if (name.startsWith('club-')) {
        await club.action({ dataset: { action: name } });
        await club.flush();
      } else throw Error(`Unsupported Club dialog action ${name}.`);
    },
    pressEscape: () => {
      if (!dialogNode.open) throw Error('Escape requires an open dialog.');
      const event = {
        type: 'cancel',
        defaultPrevented: false,
        preventDefault() {
          this.defaultPrevented = true;
        },
      };
      dialogNode.dispatchEvent(event);
      return event;
    },
  };
}
module.exports = { session, fresh };
