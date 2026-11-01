// Runs in front of every /api/* Function.
//
// Same-origin check for anything that changes state. The session cookie is
// SameSite=Lax, which already keeps it off cross-site POSTs in current
// browsers; this is the second lock on the same door, for older browsers
// and for any future endpoint that forgets. A request whose Origin (or
// Sec-Fetch-Site) says it came from another site is refused before any
// handler runs. Requests with neither header (curl, server-to-server) pass
// through to the handler, which still does its own auth.
const SAFE = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function onRequest(context) {
  const { request } = context;
  if (!SAFE.has(request.method)) {
    const self = new URL(request.url).origin;
    const origin = request.headers.get('Origin');
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
  return out;
}
