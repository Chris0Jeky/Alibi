/* Voices delivery: payloads, the offline queue and the survey key (Pulseboard contracts
pulseboard.feedback/1 and pulseboard.survey/1; docs/FEEDBACK-AND-SURVEYS.md). Pure: storage, fetch,
clock, connectivity and the UUID source are injected, so every status path is testable in Node.
Nothing runs by itself: a payload is built and queued only after the player presses Send, submits
the survey or taps a rating. */
(function (G) {
  'use strict';
  const QUEUE = 'alibi:voices:queue:v1',
    KEY = 'alibi:voices:respondent:v1',
    NOTES = 'alibi:voices:unsent:v1',
    MAX = 20,
    KEEP = 30 * 864e5,
    // After the 1st, 2nd, 3rd and 4th failed attempt, then every 6 hours.
    BACKOFF = [6e4, 3e5, 18e5, 72e5, 216e5],
    UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    SUBJECT = /^[a-z0-9][a-z0-9-]{0,63}$/,
    // The release pattern of Pulseboard product batches.
    RELEASE = /^[0-9A-Za-z.+-]{1,32}$/,
    split = (s) => s.split(' '),
    KINDS = split('bug idea puzzle praise other'),
    ROUTES = split('home puzzle castle quiet-wing games settings other'),
    DEVICES = split('mobile tablet desktop'),
    FAMILIES = split(
      'bridges scene dossier witness sudoku nonogram binary futoshiki lightup tents aquarium network trail',
    ),
    TIERS = split('gentle steady tricky expert master grandmaster'),
    // The client copy of the collector's closed registry (observatory/src/surveys.mjs, v1):
    // [question, most choices (1 = one), options, required].
    SURVEYS = {
      'alibi-taste-1': {
        comment: 500,
        questions: [
          ['often', 1, split('daily few-a-week weekly now-and-then first-time'), 1],
          [
            'more',
            5,
            [
              ...FAMILIES,
              ...split('archive-heist borough duel block-cabinet gardens casebooks castle'),
            ],
          ],
          ['difficulty', 1, split('too-easy mostly-right too-hard mixed'), 1],
          ['tiers', 3, TIERS],
          [
            'next',
            1,
            split('more-puzzles harder-puzzles new-families more-story club-games polish'),
          ],
          ['feel', 1, split('love-it fine cluttered confusing')],
          ['recommend', 1, split('definitely probably not-sure probably-not')],
        ],
      },
      'puzzle-rating': {
        subject: 1,
        comment: 0,
        questions: [
          ['difficulty', 1, split('too-easy just-right too-hard'), 1],
          ['more', 1, ['yes']],
        ],
      },
    },
    // Control characters (C0 other than newline and tab, DEL and C1) become spaces, then the text
    // is trimmed: exactly the collector's cleanVoiceText, so both sides agree on empty and length.
    // eslint-disable-next-line no-control-regex
    clean = (text) =>
      String(text ?? '')
        .replace(/[\0-\x08\x0b-\x1f\x7f-\x9f]/g, ' ')
        .trim(),
    same = (a, b) =>
      a.queued === b.queued && JSON.stringify(a.payload) === JSON.stringify(b.payload),
    // One key per queued item: a message's id, or a survey's survey and subject.
    tag = (x) => `${x.queued}:${x.payload.id || x.payload.survey + '/' + x.payload.subject}`;
  // Only a survey's own options, in registry order; unanswered questions are omitted.
  // An unknown option, too many choices or a missing required answer builds nothing.
  function answersFor(questions, given) {
    const out = {};
    for (const [id, max, options, required] of questions) {
      const value = given?.[id],
        wanted = value == null || value === '' ? [] : [value].flat(),
        list = options.filter((o) => wanted.includes(o));
      if (list.length < new Set(wanted).size || list.length > max || (required && !list.length))
        return null;
      if (list.length) out[id] = max > 1 ? list : list[0];
    }
    return out;
  }
  G.AlibiVoicesQueue = ({
    storage,
    fetch,
    now = Date.now,
    uuid,
    collector,
    project = 'alibi',
    online = () => true,
    timeout = 15e3,
  }) => {
    // Storage that cannot be read or written keeps the queue in memory for this page only.
    let memory = [],
      // A survey key that could not be stored is kept for the page, so updates still replace.
      remembered = null,
      broken = false,
      busy = null,
      again = false;
    const read = (key) => {
        try {
          return JSON.parse(storage.getItem(key));
        } catch {
          return null;
        }
      },
      write = (key, value) => {
        try {
          if (value == null) storage.removeItem(key);
          else storage.setItem(key, JSON.stringify(value));
          return true;
        } catch {}
      },
      day = () => new Date(now()).toISOString().slice(0, 10),
      id = () => {
        try {
          const value = uuid();
          return UUID.test(value) ? value : null;
        } catch {
          return null;
        }
      };
    // A corrupt queue is empty; malformed and expired items are dropped.
    function load() {
      if (!broken)
        try {
          const raw = storage.getItem(QUEUE);
          try {
            memory = [JSON.parse(raw || '[]')].flat();
          } catch {
            memory = [];
          }
        } catch {
          broken = true;
        }
      const t = now();
      return memory
        .filter(
          (x) =>
            x?.payload &&
            typeof x.payload === 'object' &&
            [x.attempts, x.next, x.queued].every(Number.isFinite) &&
            t - x.queued < KEEP,
        )
        .slice(-MAX);
    }
    function save(list) {
      memory = list;
      if (!write(QUEUE, list.length ? list : null)) broken = true;
    }
    const outcomes = new Map(),
      api = {
        QUEUE,
        KEY,
        MAX,
        SURVEYS,
        FAMILIES,
        TIERS,
        clean,
        pending: load,
        // The collector's final answer for a payload sent this page (202 or 400), else undefined.
        outcome: (payload) => outcomes.get(JSON.stringify(payload)),
        notes: () => [read(NOTES) || []].flat().filter((x) => x?.what),
        dismissNotes: () => write(NOTES, null),
        clear: () => save([]),
        // The survey invitation from local state and official first-completion times:
        // 1 first invitation, 2 "Update your answers?", 0 none. Never on a first visit: five official
        // completions on two local days first. After answering, at most 30 days after the last
        // answers and only after ten more completions or a new release. "Not now" waits 7 days;
        // three of them, or "Don't ask again", stop automatic invitations.
        due(s, times, release, t = now()) {
          const last = s.taken;
          return s.never || s.snoozes >= 3 || s.until > t
            ? 0
            : !last
              ? times.length >= 5 && new Set(times.map((x) => new Date(x).toDateString())).size > 1
                ? 1
                : 0
              : t - last.at >= 30 * 864e5 &&
                  (times.length >= last.n + 10 || release !== last.release)
                ? 2
                : 0;
        },
        respondent(create) {
          let key = read(KEY);
          if (!UUID.test(key)) key = remembered;
          if (!key && create && (key = id()) && !write(KEY, key)) remembered = key;
          return key;
        },
        resetRespondent: () => ((remembered = null), write(KEY, null)),
        // Built when Send is pressed: null when the text is empty or a field is invalid.
        feedback({ kind, route, subject = '', text, release, device }) {
          text = clean(text);
          const payload = {
            v: 1,
            id: id(),
            release,
            kind,
            route: ROUTES.includes(route) ? route : 'other',
            subject: SUBJECT.test(subject) ? subject : '',
            text,
            written: day(),
            context: { device },
          };
          return payload.id &&
            RELEASE.test(release) &&
            KINDS.includes(kind) &&
            DEVICES.includes(device) &&
            text &&
            text.length <= 2000
            ? payload
            : null;
        },
        // A survey or rating: the survey key is created on the first valid submit.
        survey({ survey, subject = '', answers, meta = {}, comment = '', release, device }) {
          const spec = SURVEYS[survey],
            picked = spec && answersFor(spec.questions, answers);
          comment = clean(comment);
          const valid =
              picked &&
              RELEASE.test(release) &&
              DEVICES.includes(device) &&
              comment.length <= spec.comment &&
              (spec.subject
                ? SUBJECT.test(subject) &&
                  FAMILIES.includes(meta.family) &&
                  TIERS.includes(meta.tier) &&
                  Object.keys(meta).length === 2
                : subject === '' && !Object.keys(meta).length),
            respondent = valid && api.respondent(true);
          return respondent
            ? {
                v: 1,
                survey,
                subject,
                respondent,
                release,
                answers: picked,
                meta: spec.subject ? { family: meta.family, tier: meta.tier } : {},
                comment,
                context: { device },
              }
            : null;
        },
        // A survey or rating replaces the older queued answer for the same survey and subject.
        // Returns false when twenty items are already waiting.
        enqueue(payload) {
          const list = load().filter((x) =>
            payload.survey
              ? x.payload.survey !== payload.survey || x.payload.subject !== payload.subject
              : x.payload.id !== payload.id,
          );
          if (list.length >= MAX) return false;
          list.push({ payload, attempts: 0, next: 0, queued: now() });
          save(list);
          return true;
        },
        // Sends due items one at a time. 202 removes; 400 removes and leaves a local note; anything
        // else (network error, timeout, 429, 5xx, 503) keeps the item, backs it off and ends the pass.
        // A browser that knows it is offline makes no attempt; each item is tried once per pass.
        flush() {
          if (busy) return ((again = true), busy);
          busy = (async () => {
            do {
              again = false;
              const tried = new Set();
              for (
                let item;
                online() && (item = load().find((x) => x.next <= now() && !tried.has(tag(x))));
              ) {
                tried.add(tag(item));
                // A request that hangs is abandoned after the timeout, counted as a network error.
                const abort = G.AbortController && new G.AbortController(),
                  timer = abort && G.setTimeout(() => abort.abort(), timeout);
                let status = 0,
                  wait = 0;
                try {
                  const survey = !!item.payload.survey,
                    response = await fetch(
                      `${collector}/v1/${survey ? 'survey' : 'feedback'}/${project}`,
                      {
                        method: survey ? 'PUT' : 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify(item.payload),
                        credentials: 'omit',
                        cache: 'no-store',
                        referrerPolicy: 'no-referrer',
                        signal: abort?.signal,
                      },
                    );
                  status = response.status;
                  wait = Math.min(+response.headers?.get?.('retry-after') || 0, 86400) * 1e3;
                } catch {}
                G.clearTimeout?.(timer);
                const list = load(),
                  at = list.findIndex((x) => same(x, item));
                if (status === 202 || status === 400) {
                  outcomes.set(JSON.stringify(item.payload), status);
                  if (outcomes.size > MAX) outcomes.delete(outcomes.keys().next().value);
                  if (at >= 0) list.splice(at, 1);
                  save(list);
                  if (status > 202)
                    write(NOTES, [
                      ...api.notes().slice(1 - MAX),
                      { what: item.payload.survey || 'feedback', day: day() },
                    ]);
                  continue;
                }
                if (at >= 0) {
                  const attempts = list[at].attempts + 1;
                  list[at] = {
                    ...list[at],
                    attempts,
                    next: now() + Math.max(BACKOFF[Math.min(attempts, 5) - 1], wait),
                  };
                  save(list);
                }
                break;
              }
            } while (again);
          })().finally(() => (busy = null));
          return busy;
        },
      };
    return api;
  };
})(globalThis);
