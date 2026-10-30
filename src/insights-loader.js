(function (root) {
  'use strict';
  const C = root.AlibiCore;
  let pending;
  C.loadInsights = () => {
    if (C.insights) return Promise.resolve(C.insights);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const fail = () => {
        script.remove();
        pending = null;
        reject(new Error('Reasoning hints could not load. Try again.'));
      };
      script.src = root.ALIBI_CONFIG.insights;
      script.onload = () => (C.insights ? resolve(C.insights) : fail());
      script.onerror = fail;
      document.head.append(script);
    });
    return pending;
  };
})(globalThis);
