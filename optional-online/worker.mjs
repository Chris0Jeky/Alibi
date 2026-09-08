import { Room, Quota, HttpError, json, body, digest, seatIntent } from './room.mjs';
export { Room, Quota };
const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
async function codeFor(env, requestId) {
  return (await digest('room-code-v1:' + env.RATE_SALT + ':' + requestId))
    .match(/../g)
    .slice(0, 8)
    .map((pair) => alphabet[Number.parseInt(pair, 16) % alphabet.length])
    .join('');
}
function requestFor(path, method, data, auth) {
  return new Request('https://room.internal' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/'))
      return env.ASSETS
        ? env.ASSETS.fetch(request)
        : json({ error: 'Static assets are not bound.' }, 404);
    const origin = request.headers.get('origin'),
      allowed = [
        url.origin,
        ...String(env.ALLOWED_ORIGINS || '')
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      ];
    const reply = (response) => {
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('Vary', 'Origin');
      if (origin && allowed.includes(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
        headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        headers.set('Access-Control-Max-Age', '600');
      }
      return new Response(response.body, { status: response.status, headers });
    };
    try {
      if (origin && !allowed.includes(origin))
        throw new HttpError(403, 'This web origin is not allowed.');
      if (request.method === 'OPTIONS') return reply(new Response(null, { status: 204 }));
      if (!['GET', 'POST'].includes(request.method))
        throw new HttpError(405, 'Method not allowed.');
      if (!env.ROOMS || !env.QUOTAS || !env.RATE_SALT || env.RATE_SALT.length < 24)
        throw new HttpError(503, 'The room service has not been configured.');
      if (url.pathname === '/api/health' && request.method === 'GET')
        return reply(json({ ok: true, protocol: 1, online: 'private-rooms', ranked: false }));
      const create = url.pathname === '/api/rooms' && request.method === 'POST',
        match = url.pathname.match(/^\/api\/rooms\/([A-Z2-9]{8})\/(join|state|move)$/);
      if (!create && !match) throw new HttpError(404, 'Unknown API route.');
      if (match && (match[2] === 'state') !== (request.method === 'GET'))
        throw new HttpError(405, 'Method not allowed.');
      const payload = request.method === 'POST' ? await body(request) : undefined;
      if (create || match?.[2] === 'join') seatIntent(payload);
      if (create || match?.[2] === 'join') {
        const ip =
          request.headers.get('CF-Connecting-IP') || (env.DEV_LOCAL === 'true' ? '127.0.0.1' : '');
        if (!ip) throw new HttpError(503, 'Request address unavailable.');
        const key = await digest(
            env.RATE_SALT + ':' + new Date().toISOString().slice(0, 10) + ':' + ip,
          ),
          quota = env.QUOTAS.get(env.QUOTAS.idFromName(key)),
          requestHash = await digest(
            'quota-v1:' +
              env.RATE_SALT +
              ':' +
              (create ? 'create' : 'join') +
              ':' +
              payload.requestId,
          );
        const check = await quota.fetch(
          requestFor('/check', 'POST', { kind: create ? 'create' : 'join', requestHash }),
        );
        if (!check.ok)
          throw new HttpError(
            check.status === 429 ? 429 : 503,
            check.status === 429
              ? 'Too many new tables or join attempts. Try again later.'
              : 'Quota service unavailable.',
          );
      }
      if (create) {
        const name = await codeFor(env, payload.requestId),
          stub = env.ROOMS.get(env.ROOMS.idFromName(name));
        return reply(await stub.fetch(requestFor('/_create', 'POST', { code: name, ...payload })));
      }
      const [, name, op] = match,
        stub = env.ROOMS.get(env.ROOMS.idFromName(name));
      return reply(
        await stub.fetch(
          requestFor('/' + op, request.method, payload, request.headers.get('authorization')),
        ),
      );
    } catch (e) {
      return reply(
        json(
          { error: e instanceof HttpError ? e.message : 'The service is temporarily unavailable.' },
          e.status || 503,
        ),
      );
    }
  },
};
