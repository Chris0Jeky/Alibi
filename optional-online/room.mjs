/** Authoritative private-room rules. No global ranking, accounts, chat or client-supplied scores. */
import '../src/club-engines.js';
const Rules = globalThis.AlibiClubEngines.reversi;
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
export async function body(request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    throw new HttpError(415, 'Send application/json.');
  if (Number(request.headers.get('content-length') || 0) > 4096)
    throw new HttpError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  let total = 0,
    parts = [];
  if (reader)
    try {
      while (true) {
        const r = await reader.read();
        if (r.done) break;
        total += r.value.length;
        if (total > 4096) {
          await reader.cancel();
          throw new HttpError(413, 'Request is too large.');
        }
        parts.push(r.value);
      }
    } finally {
      reader.releaseLock();
    }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.length;
  }
  let value;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new HttpError(400, 'Invalid JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new HttpError(400, 'Expected an object.');
  return value;
}
export async function digest(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
}
function exactKeys(value, keys) {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join(',') === keys.slice().sort().join(',')
  );
}
export function seatIntent(value, keys = ['requestId', 'seatToken']) {
  if (
    !exactKeys(value, keys) ||
    typeof value.requestId !== 'string' ||
    !/^[A-Za-z0-9_-]{16,64}$/.test(value.requestId) ||
    typeof value.seatToken !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(value.seatToken)
  )
    throw new HttpError(400, 'Invalid room request identity.');
  return value;
}
function publicRoom(r) {
  return {
    code: r.code,
    state: r.state,
    version: r.version,
    joined: !!r.inkHash,
    expiresAt: r.expiresAt,
  };
}
export class Room {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
  async fetch(request) {
    try {
      const url = new URL(request.url),
        path = url.pathname,
        now = Date.now(),
        input = request.method === 'POST' ? await body(request) : null;
      const raw = request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1],
        authHash = raw ? await digest(raw) : null;
      const creating = path === '/_create' && request.method === 'POST',
        joining = path === '/join' && request.method === 'POST';
      if (creating) seatIntent(input, ['code', 'requestId', 'seatToken']);
      if (joining) seatIntent(input);
      const requestHash = creating || joining ? await digest(input.requestId) : null,
        seatHash = creating || joining ? await digest(input.seatToken) : null;
      const result = await this.ctx.storage.transaction(async (tx) => {
        let r = await tx.get('room');
        if (creating) {
          if (!/^[A-Z2-9]{8}$/.test(input.code || ''))
            throw new HttpError(400, 'Invalid room code.');
          if (r) {
            if (now >= r.expiresAt)
              throw new HttpError(410, 'This room has expired. Start a new table.');
            if (r.createHash === requestHash && r.goldHash === seatHash)
              return { ...publicRoom(r), seat: 1 };
            throw new HttpError(409, 'Room code collision. Start a new table.');
          }
          r = {
            schema: 1,
            code: input.code,
            createHash: requestHash,
            goldHash: seatHash,
            inkHash: null,
            joinHash: null,
            state: Rules.initial(),
            version: 0,
            expiresAt: now + 24 * 60 * 60 * 1000,
            moves: [],
            rate: {},
          };
          await tx.put('room', r);
          await tx.setAlarm(r.expiresAt);
          return { ...publicRoom(r), seat: 1 };
        }
        if (!r) throw new HttpError(404, 'No room with that code.');
        if (now >= r.expiresAt)
          throw new HttpError(410, 'This room has expired. Start a new table.');
        if (r.schema !== 1) throw new HttpError(409, 'This room uses a different rules version.');
        if (joining) {
          if (r.inkHash) {
            if (r.joinHash === requestHash && r.inkHash === seatHash)
              return { ...publicRoom(r), seat: -1 };
            throw new HttpError(409, 'Both seats are taken.');
          }
          r.inkHash = seatHash;
          r.joinHash = requestHash;
          r.version++;
          await tx.put('room', r);
          return { ...publicRoom(r), seat: -1 };
        }
        const seat = authHash === r.goldHash ? 1 : authHash && authHash === r.inkHash ? -1 : 0;
        if (!seat) throw new HttpError(401, 'A valid seat credential is required.');
        // A per-seat, persisted budget includes reads. It is not a distributed abuse defence.
        const bucket = Math.floor(now / 60000),
          rate = r.rate[seat] || { bucket, n: 0 };
        if (rate.bucket !== bucket) {
          rate.bucket = bucket;
          rate.n = 0;
        }
        if (rate.n >= 100) throw new HttpError(429, 'Too many requests. Wait a minute.');
        rate.n++;
        r.rate[seat] = rate;
        if (path === '/state' && request.method === 'GET') {
          await tx.put('room', r);
          return publicRoom(r);
        }
        if (path === '/move' && request.method === 'POST') {
          if (
            !exactKeys(input, ['cell', 'expectedVersion', 'moveId']) ||
            !Number.isInteger(input.cell) ||
            input.cell < 0 ||
            input.cell > 35 ||
            !Number.isSafeInteger(input.expectedVersion) ||
            input.expectedVersion < 0 ||
            typeof input.moveId !== 'string' ||
            !/^[A-Za-z0-9_-]{16,64}$/.test(input.moveId)
          )
            throw new HttpError(400, 'Invalid move request.');
          const old = r.moves.find((m) => m.id === input.moveId);
          if (old) {
            if (
              old.seat !== seat ||
              old.cell !== input.cell ||
              old.expectedVersion !== input.expectedVersion
            )
              throw new HttpError(409, 'Move identifier was reused with different content.');
            await tx.put('room', r);
            return publicRoom(r);
          }
          if (!r.inkHash) throw new HttpError(409, 'Wait for the second player.');
          if (r.state.done) throw new HttpError(409, 'The match is finished.');
          if (input.expectedVersion !== r.version)
            throw new HttpError(409, 'The board changed. Refresh before moving.');
          if (seat !== r.state.turn) throw new HttpError(403, 'It is not your turn.');
          if (!Rules.legal(r.state).includes(input.cell))
            throw new HttpError(422, 'This is not a legal move.');
          r.state = Rules.move(r.state, input.cell);
          r.moves.push({
            id: input.moveId,
            seat,
            cell: input.cell,
            expectedVersion: input.expectedVersion,
          });
          r.version++;
          await tx.put('room', r);
          return publicRoom(r);
        }
        throw new HttpError(404, 'Unknown room operation.');
      });
      return json(result);
    } catch (e) {
      return json(
        {
          error:
            e instanceof HttpError
              ? e.message
              : 'Room storage is unavailable. Retry without changing the move identifier.',
        },
        e.status || 503,
      );
    }
  }
  async alarm() {
    const r = await this.ctx.storage.get('room');
    if (!r || r.expiresAt <= Date.now()) await this.ctx.storage.deleteAll();
    else await this.ctx.storage.setAlarm(r.expiresAt);
  }
}
/** Durable creation/join quota, keyed by a salted daily hash of the request IP. */
export class Quota {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }
  async fetch(request) {
    try {
      const value = await body(request),
        { kind, requestHash } = value;
      if (
        !exactKeys(value, ['kind', 'requestHash']) ||
        !['create', 'join'].includes(kind) ||
        typeof requestHash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(requestHash)
      )
        throw new HttpError(400, 'Invalid quota.');
      const now = Date.now(),
        allowed = await this.ctx.storage.transaction(async (tx) => {
          let q = await tx.get(kind);
          if (!q || now >= q.until) q = { count: 0, ids: [], until: now + 3600000 };
          if (
            !Number.isSafeInteger(q.count) ||
            !Array.isArray(q.ids) ||
            q.ids.length > (kind === 'create' ? 8 : 24)
          )
            throw new HttpError(503, 'Invalid quota state.');
          if (q.ids.includes(requestHash)) return true;
          if (q.count >= (kind === 'create' ? 8 : 24)) return false;
          q.count++;
          q.ids.push(requestHash);
          await tx.put(kind, q);
          await tx.setAlarm(now + 3700000);
          return true;
        });
      return json({ allowed }, allowed ? 200 : 429);
    } catch (e) {
      return json({ error: 'Quota service unavailable.' }, 503);
    }
  }
  async alarm() {
    await this.ctx.storage.deleteAll();
  }
}
