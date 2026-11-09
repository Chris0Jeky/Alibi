// Share only the saved impressions the player can review. Board and recovery data never enter
// this adapter. Voices owns admission, consent, validation, queueing and delivery.
export function feedbackText(puzzle, run) {
  return `Eclipse Lab\nExperiment: ${puzzle.mode}\nPuzzle: ${puzzle.id}\nRevision: ${puzzle.revision}\nEnjoyment: ${run.rating ?? 'not rated'}/5\nDifficulty: ${run.difficulty ?? 'not selected'}\n\nFeedback:\n${run.feedback}`;
}

export const canSendFeedback = (host = globalThis) => host.AlibiVoices?.eligible === true;

export async function reviewFeedback(puzzle, run, opener, current, host = globalThis) {
  if (!canSendFeedback(host)) throw Error('Direct feedback is available on the main Alibi site.');
  const text = feedbackText(puzzle, run);
  if (text.length > 2000)
    throw Error(
      `Your note and experiment details total ${text.length} characters. Shorten your note by ${text.length - 2000} characters and save it before sending. Nothing was sent.`,
    );
  if (!host.AlibiVoicesSheet) {
    try {
      await host.AlibiActivities.loadSource({ script: host.ALIBI_VOICES.chunk });
    } catch {
      throw Error('Feedback could not open. Try again when connected.');
    }
  }
  // A download can finish after the player leaves this level. Never open a stale modal.
  if (!current() || !opener.isConnected) return false;
  if (!host.AlibiVoicesSheet?.open) throw Error('Feedback could not open. Try again.');
  host.AlibiVoicesSheet.open('puzzle', '', text, opener);
  return true;
}
