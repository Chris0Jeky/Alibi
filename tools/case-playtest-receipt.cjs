'use strict';
// Memory-only playtest receipt (#455). Off until start(); every recorder is a no-op while off.
// Allowlist only: case identity, presentation modes, stage ids and per-stage counts, plus one
// bounded tester observation. No answers, citations, notes, saves, device data or timestamps.
(function (root) {
  const MAX_EVENTS = 500;
  const MAX_OBSERVATION = 500;
  const LIMITATIONS = Object.freeze([
    'Counts only: it cannot tell whether a hint was read, understood or needed.',
    'No timings are recorded, so it says nothing about difficulty from speed.',
    'Incomplete submissions (an empty verdict or no cited source) are counted as interface, not reasoning.',
    'One local session of one tester; it is not a sample and not human acceptance by itself.',
  ]);
  function create({ caseId, revision, sourceSha256, stageIds }) {
    const known = new Set(stageIds);
    let on = false,
      modes,
      stages,
      events,
      truncated,
      observation;
    function clear() {
      on = false;
      modes = [];
      stages = new Map();
      events = 0;
      truncated = false;
      observation = '';
    }
    clear();
    function stage(id) {
      if (!on || !known.has(id)) return null;
      if (events >= MAX_EVENTS) {
        truncated = true;
        return null;
      }
      events++;
      if (!stages.has(id))
        stages.set(id, {
          hints: 0,
          reveals: 0,
          submissions: 0,
          incomplete: 0,
          reasoning: 0,
          afterCompletion: 0,
          completed: false,
        });
      return stages.get(id);
    }
    function mode(storyOn) {
      if (!on || typeof storyOn !== 'boolean') return;
      const key = storyOn ? 'storyOn' : 'storyOff';
      if (!modes.includes(key)) modes.push(key);
    }
    return {
      get enabled() {
        return on;
      },
      start(storyOn, stageId) {
        if (on) return;
        on = true;
        mode(storyOn);
        stage(stageId);
      },
      // Discards everything and turns collection off. Nothing is written or sent.
      cancel: clear,
      mode,
      open(stageId) {
        stage(stageId);
      },
      hint(stageId) {
        const s = stage(stageId);
        if (s) s.hints++;
      },
      reveal(stageId) {
        const s = stage(stageId);
        if (s) s.reveals++;
      },
      // Answers are inspected for shape only and never retained.
      submission(stageId, result, answers) {
        const s = stage(stageId);
        if (!s) return;
        if (s.completed) {
          s.afterCompletion++;
          return;
        }
        s.submissions++;
        if (result && result.ok === true) s.completed = true;
        else if (
          !Array.isArray(answers) ||
          answers.some(
            (a) => !a || !a.verdict || !Array.isArray(a.citations) || a.citations.length === 0,
          )
        )
          s.incomplete++;
        else s.reasoning++;
      },
      observe(text) {
        if (!on) return;
        observation = String(text).slice(0, MAX_OBSERVATION);
      },
      draft() {
        if (!on) return null;
        const list = stageIds
          .filter((id) => stages.has(id))
          .map((id) => {
            const s = stages.get(id);
            return {
              id,
              outcome: s.completed ? 'completed' : 'not-completed',
              assisted: s.hints > 0 || s.reveals > 0,
              hints: s.hints,
              reveals: s.reveals,
              submissions: s.submissions,
              rejectedIncomplete: s.incomplete,
              rejectedReasoning: s.reasoning,
              afterCompletion: s.afterCompletion,
            };
          });
        return {
          format: 'postern-case-playtest-1',
          caseId,
          revision,
          sourceSha256,
          modes: [...modes],
          assisted: list.some((s) => s.assisted),
          stages: list,
          truncated,
          observation: observation.trim(),
          limitations: [...LIMITATIONS],
        };
      },
    };
  }
  const api = { create, MAX_EVENTS, MAX_OBSERVATION };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PosternPlaytestReceipt = Object.freeze(api);
})(globalThis);
