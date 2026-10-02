'use strict';
// Both official scripts are precached data. Optional assets already excluded by the build
// must not be subtracted again. Callers enforce their existing numeric ceilings unchanged.
module.exports = function contentBudgetAccounting(info) {
  for (const key of ['coreOfflineBytes', 'officialContentBytes', 'deferredContentBytes']) {
    if (!Number.isSafeInteger(info[key]) || info[key] < 0)
      throw Error(`Invalid byte receipt: ${key}`);
  }
  const officialBytes = info.officialContentBytes + info.deferredContentBytes;
  if (!Number.isSafeInteger(officialBytes) || officialBytes > info.coreOfflineBytes)
    throw Error('Official content exceeds the recorded precache');
  return { officialBytes, shellBytes: info.coreOfflineBytes - officialBytes };
};
