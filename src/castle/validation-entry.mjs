import { validateBackup, validateRecord, prepareRestore } from './backup.mjs';
import { validateEscape } from './escape-save-validation.mjs';

const checked = (raw, envelope) => {
  validateEscape(raw.state, ESCAPE_SAVE_RULES);
  return envelope;
};
globalThis.AlibiCastleValidation = {
  validateBackup: (data) => checked(data, validateBackup(data)),
  validateRecord: (record) => checked(record, validateRecord(record)),
  prepareRestore(data, current, replace) {
    const incoming = checked(data, validateBackup(data));
    validateEscape(current, ESCAPE_SAVE_RULES);
    return prepareRestore(incoming, current, replace);
  },
};
