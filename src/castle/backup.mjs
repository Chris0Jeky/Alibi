import { validate, clone } from './engine.mjs';
import { mergeTheories } from './investigation.mjs';

export const IMPORT_LIMIT = 512 * 1024;
export function validateBackup(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    data.format !== 'alibi-castle' ||
    data.version !== 1 ||
    Object.keys(data).some(
      (key) => !['format', 'version', 'scope', 'state', 'mode', 'preservedRecord'].includes(key),
    ) ||
    typeof data.scope !== 'string' ||
    data.scope.length > 160 ||
    !['local', 'session', 'protected'].includes(data.mode) ||
    JSON.stringify(data).length > IMPORT_LIMIT
  )
    throw Error('Unsupported castle backup. Keep the original file; nothing was changed.');
  return { ...data, state: validate(data.state) };
}

export function backup(state, mode = 'local', preservedRecord = null) {
  return {
    format: 'alibi-castle',
    version: 1,
    scope: 'Wrenmere Chapter I only',
    state: clone(state),
    mode,
    ...(preservedRecord !== null ? { preservedRecord: clone(preservedRecord) } : {}),
  };
}

// Merge discoveries without replacing a device's answers, unfinished boards or preferences.
// Notes are never silently truncated to fit the bounded notebook.
export function mergeStates(local, incoming) {
  const current = validate(local),
    added = validate(incoming);
  const next = clone(current);
  for (const [id, value] of Object.entries(added.completed))
    if (!Object.hasOwn(next.completed, id)) next.completed[id] = clone(value);
  for (const [id, value] of Object.entries(added.drafts))
    if (!Object.hasOwn(next.completed, id) && !Object.hasOwn(next.drafts, id))
      next.drafts[id] = clone(value);
  for (const id of Object.keys(next.completed)) delete next.drafts[id];
  next.visited = [...new Set([...current.visited, ...added.visited])];
  next.revealed = [...new Set([...current.revealed, ...added.revealed])];
  next.theories = mergeTheories(current.theories, added.theories);
  next.labels = { ...added.labels, ...current.labels };
  if (added.notes && added.notes !== current.notes) {
    const section = `--- Imported notebook ---\n${added.notes}`;
    if (!current.notes.endsWith(section))
      next.notes = current.notes ? `${current.notes}\n\n${section}` : added.notes;
  }
  if (next.notes.length > 12000)
    throw Error(
      'The merged notes would exceed 12,000 characters. Keep both exports and shorten a notebook before merging.',
    );
  return validate(next);
}
