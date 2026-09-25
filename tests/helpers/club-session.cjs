'use strict';
// Real Club lifecycle/rules in a minimal DOM; Worker and storage are observable ports.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
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
  nodes.set('dialog', { close() {} });
  class FixedDate extends Date {
    static now() {
      return 1790352000000;
    }
  }
  const math = Object.create(Math);
  math.random = () => 0;
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
  };
  context.globalThis = context;
  vm.createContext(context);
  for (const name of ['core', 'backup-validation', 'club-engines', 'club'])
    vm.runInContext(fs.readFileSync(path.join(root, 'src', name + '.js'), 'utf8'), context);
  const club = context.AlibiClub;
  await club.init({
    render() {},
    settings: () => ({}),
    toast: (text) => messages.push(text),
    dialog: (...args) => dialogs.push(args),
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
    state: () => copy(club.diagnostics().state),
    action: async (name, values = {}) => {
      await club.action({ dataset: { action: 'club-' + name, ...values } });
      await club.flush();
    },
  };
}
module.exports = { session, fresh };
