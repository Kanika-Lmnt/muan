// Runs in front of every /api/* Function.
//
// Same-origin check for anything that changes state. The session cookie is
// SameSite=Lax, which already keeps it off cross-site POSTs in current
// browsers; this is the second lock on the same door, for older browsers
// and for any future endpoint that forgets. A request whose Origin (or
// Sec-Fetch-Site) says it came from another site is refused before any
// handler runs. Requests with neither header (curl, server-to-server) pass
// through to the handler, which still does its own auth.
//
// The one exception is the phone app (APP_ORIGINS in _auth.js): it is a
// different origin by design, so it gets CORS headers and its state
// changes are let through. That doesn't reopen the door the check above
// closes: the app signs in with a bearer token it holds itself, a browser
// never attaches that token on its own, and the cookie still isn't sent
// cross-site — so a page pretending to be the app has nothing to act with.
import { APP_ORIGINS } from './_auth.js';

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

export async function onRequest(context) {
  const { request } = context;
  const origin = request.headers.get('Origin');
  const fromApp = !!origin && APP_ORIGINS.has(origin);

  // the browser's "may I?" before a cross-origin request with a JSON body
  // or an Authorization header — answered here, never by a handler
  if (fromApp && request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (!fromApp && !SAFE.has(request.method)) {
    const self = new URL(request.url).origin;
    const site = request.headers.get('Sec-Fetch-Site');
    const crossOrigin = (origin && origin !== 'null' && origin !== self) ||
      (site && site !== 'same-origin' && site !== 'none');
    if (crossOrigin) {
      return Response.json({ ok: false, error: 'cross-site request refused' }, { status: 403 });
    }
  }
  const res = await context.next();
  // API answers are data, never pages: don't let a browser sniff one into
  // HTML, and don't let another site frame it
  const out = new Response(res.body, res);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  if (fromApp) {
    for (const [k, v] of Object.entries(corsHeaders(origin))) {
      if (k === 'Vary') out.headers.append('Vary', 'Origin');
      else out.headers.set(k, v);
    }
  }
  return out;
}
