// Best-effort per-IP rate limiting for the endpoints anyone can call
// without signing in (or that spend something on every call: D1 writes,
// the OpenRouteService quota). Counts live in the Cache API, so they are
// per Cloudflare data centre and not atomic — two requests racing can both
// get through. That is fine for what this is for: stopping a script from
// hammering an endpoint, not metering honest use. A hard guarantee would
// need a Cloudflare rate-limiting rule (dashboard) or a Durable Object.
//
// Returns a 429 Response when over the limit, else null.
export async function rateLimit(context, bucket, limit, windowSec) {
  try {
    const ip = context.request.headers.get('CF-Connecting-IP') || 'local';
    const slot = Math.floor(Date.now() / 1000 / windowSec);
    const key = new Request(new URL(`/__rl/${bucket}/${encodeURIComponent(ip)}/${slot}`, context.request.url).toString());
    const cache = caches.default;
    const hit = await cache.match(key);
    const n = hit ? Number(await hit.text()) || 0 : 0;
    if (n >= limit) {
      return Response.json({ ok: false, error: 'too many requests — try again in a minute' },
        { status: 429, headers: { 'Retry-After': String(windowSec) } });
    }
    context.waitUntil(cache.put(key, new Response(String(n + 1), {
      headers: { 'Cache-Control': `public, max-age=${windowSec}` },
    })));
  } catch (e) {
    // a broken limiter must never take the endpoint down with it
    console.error('[ratelimit]', e);
  }
  return null;
}
