import PlaytestReceipt from '../../tools/case-playtest-receipt.cjs';
import { escape } from './html.mjs';

const button = (text, action) =>
  `<button id="case-${action}-" type="button" data-case-action="${action}">${escape(text)}</button>`;

// Loaded on explicit consent; Castle owns this controller only for the mounted case visit.
export function createCaseReceipt({ definition, sourceSha256 }) {
  const receipt = PlaytestReceipt.create({
    caseId: definition.id,
    revision: definition.revision,
    sourceSha256,
    stageIds: definition.steps.map((step) => step.id),
  });
  let active = true,
    reviewing = false,
    copying = false,
    attached = false,
    generation = 0;

  const json = () => (receipt.enabled ? JSON.stringify(receipt.draft(), null, 2) : null);

  return {
    get enabled() {
      return active && receipt.enabled;
    },
    get reviewing() {
      return active && reviewing;
    },
    get copying() {
      return copying;
    },
    get draft() {
      return active && receipt.enabled ? receipt.draft() : null;
    },
    get preview() {
      return active && reviewing ? json() : null;
    },
    start({ storyOn, stageId, completed = false, priorAssistance = false }) {
      if (!active || receipt.enabled || copying) return false;
      generation++;
      receipt.start(storyOn, stageId, completed, priorAssistance === true);
      return receipt.enabled;
    },
    open(stageId, completed = false, priorAssistance = false) {
      if (active) receipt.open(stageId, completed, priorAssistance === true);
    },
    mode(storyOn) {
      if (active) receipt.mode(storyOn);
    },
    hint(stageId) {
      if (active && receipt.enabled) receipt.hint(stageId);
    },
    reveal(stageId) {
      if (active && receipt.enabled) receipt.reveal(stageId);
    },
    submission(stageId, ok, answerShape) {
      if (!active || !receipt.enabled) return;
      // Only boolean/count shape reaches the collector; verdicts and source IDs are discarded.
      receipt.submission(
        stageId,
        { ok: ok === true },
        Array.isArray(answerShape)
          ? answerShape.map((answer) => ({
              verdict: answer?.hasVerdict === true,
              citations: Array.isArray(answer?.citations)
                ? Array(answer.citations.length).fill(true)
                : answer?.citations,
            }))
          : answerShape,
      );
    },
    review() {
      if (!active || !receipt.enabled || copying) return false;
      reviewing = true;
      return true;
    },
    closeReview() {
      if (!active || copying) return false;
      reviewing = false;
      generation++;
      return true;
    },
    observe(text) {
      if (active && reviewing && receipt.enabled) receipt.observe(text);
    },
    cancel() {
      if (!active) return false;
      receipt.cancel();
      reviewing = false;
      generation++;
      return true;
    },
    async copy(write) {
      if (!active || !receipt.enabled || !reviewing || copying) return 'ignored';
      const token = generation;
      const text = json();
      copying = true;
      try {
        await write(text);
        if (!active || token !== generation) return 'stale';
        reviewing = false;
        return 'copied';
      } catch {
        return !active || token !== generation ? 'stale' : 'blocked';
      } finally {
        copying = false;
      }
    },
    markup() {
      const style =
        '<style>.case-receipt textarea{box-sizing:border-box;width:100%;max-width:100%;min-height:6rem}.case-receipt pre{box-sizing:border-box;max-width:100%;overflow:auto;overflow-wrap:anywhere;white-space:pre-wrap}</style>';
      if (!active || !receipt.enabled)
        return `${style}<section class="card case-receipt" aria-labelledby="case-receipt-title"><h2 id="case-receipt-title">Local playtest receipt</h2><p>Optional and off until you start it. While on, it counts only stages visited, story mode, hint and worked-answer requests, and checks in this page. Help used before you start is marked only as prior assistance. It never includes answers, citations, notebook text, saved drafts, device details or timings. It stays in memory; nothing is sent. Review and edit it before you choose to copy it.</p><div class="actions">${button('Start local playtest receipt', 'receipt-start')}</div></section>`;
      if (!reviewing)
        return `${style}<section class="card case-receipt" aria-labelledby="case-receipt-title"><h2 id="case-receipt-title">Local playtest receipt</h2><p>Recording bounded counts in this page only. It is not written to your Castle notebook.</p><div class="actions">${button('Review receipt', 'receipt-review')}${button('Cancel receipt', 'receipt-cancel')}</div></section>`;
      const draft = receipt.draft();
      const limits = draft.limitations.map((line) => `<li>${escape(line)}</li>`).join('');
      return `${style}<section class="card case-receipt" aria-labelledby="case-receipt-title"><h2 id="case-receipt-title">Review local playtest receipt</h2><p>Read the exact receipt below. Edit the optional observation before copying. Copy is the only output; nothing is sent. A clipboard request already made may finish even if you leave this case.</p><ul>${limits}</ul><label for="case-receipt-observation">Your observation (optional, up to 500 characters)</label><textarea id="case-receipt-observation" maxlength="500" rows="3">${escape(draft.observation)}</textarea><pre id="case-receipt-preview" tabindex="-1">${escape(this.preview)}</pre><div class="actions">${button('Copy receipt', 'receipt-copy')}${button('Close review', 'receipt-close')}${button('Cancel receipt', 'receipt-cancel')}</div></section>`;
    },
    async action(action, write) {
      if (action === 'receipt-review') {
        this.review();
        return { result: 'review' };
      }
      if (action === 'receipt-close') {
        this.closeReview();
        return { result: 'closed' };
      }
      if (action === 'receipt-cancel') {
        this.cancel();
        return { result: 'cancelled' };
      }
      if (action === 'receipt-copy') return { result: await this.copy(write) };
      return { result: 'ignored' };
    },
    focus(action) {
      return action === 'receipt-copy'
        ? reviewing
          ? 'case-receipt-preview'
          : 'case-receipt-review-'
        : action === 'receipt-start' || action === 'receipt-close'
          ? 'case-receipt-review-'
          : action === 'receipt-review'
            ? 'case-receipt-observation'
            : action === 'receipt-cancel'
              ? 'case-receipt-start-'
              : undefined;
    },
    attach({ root, signal, run, setMessage, canAct }) {
      if (!active || attached) return;
      attached = true;
      root.addEventListener(
        'input',
        (event) => {
          if (event.target.id !== 'case-receipt-observation' || !this.reviewing) return;
          this.observe(event.target.value);
          const preview = root.querySelector('#case-receipt-preview');
          if (preview) preview.textContent = this.preview;
        },
        { signal },
      );
      root.addEventListener(
        'click',
        (event) => {
          const el = event.target.closest?.('[data-case-action^="receipt-"]');
          if (!el || !root.contains(el) || el.dataset.caseAction === 'receipt-start') return;
          event.stopImmediatePropagation();
          if (!canAct()) return;
          const action = el.dataset.caseAction;
          run(
            async () => {
              const { result } = await this.action(action, (text) =>
                navigator.clipboard.writeText(text),
              );
              setMessage(
                {
                  review: '',
                  closed: 'Receipt preview closed. Collection remains on in this page memory.',
                  cancelled:
                    'Receipt discarded from this page. Clipboard copies are not removed; a pending copy may still finish. Nothing was sent.',
                  copied: 'Receipt copied. Nothing was sent.',
                  blocked:
                    'The browser blocked copying. Select the receipt text to copy it yourself.',
                }[result] || '',
              );
            },
            () => this.focus(action),
          );
        },
        { signal, capture: true },
      );
    },
    dispose() {
      if (!active) return;
      active = false;
      receipt.cancel();
      reviewing = false;
      generation++;
    },
  };
}
