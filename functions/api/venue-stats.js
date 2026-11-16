// GET /api/venue-stats?id=<venue id>
//
// When people go to one venue: check-ins over the last 90 days by day of
// the week and by hour, in Vientiane time. Drawn as the "When people go"
// chart on the venue page (venueBusyHtml() in js/app.js).
//
// Real check-ins only, and only once there are enough of them to mean
// something. Below the threshold this answers { enough: false } and the
// page shows nothing — a chart of three check-ins would be noise dressed as
// a fact. The people threshold is also privacy: with only one or two
// regulars, "busiest on Fridays at 10 pm" would describe a person's habits,
// not a venue's.
const MIN_CHECKINS = 10;
const MIN_PEOPLE = 5;
const VIENTIANE_OFFSET_MS = 7 * 3600 * 1000; // UTC+7, no daylight saving

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'GET') {
    return Response.json({ ok: false, error: 'method not allowed' }, { status: 405 });
  }
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!/^[a-z0-9-]{1,80}$/.test(id)) {
    return Response.json({ ok: false, error: 'bad id' }, { status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();
    const rows = await env.DB.prepare(
      'SELECT user_id, created_at FROM checkins WHERE venue_id = ? AND created_at > ?'
    ).bind(id, since).all();

    const total = rows.results.length;
    const people = new Set(rows.results.map((r) => r.user_id)).size;
    const enough = total >= MIN_CHECKINS && people >= MIN_PEOPLE;
    const out = { ok: true, enough, days: 90 };

    if (enough) {
      const byDay = Array(7).fill(0);   // 0 = Monday … 6 = Sunday
      const byHour = Array(24).fill(0);
      for (const r of rows.results) {
        const local = new Date(new Date(r.created_at).getTime() + VIENTIANE_OFFSET_MS);
        byDay[(local.getUTCDay() + 6) % 7]++;
        byHour[local.getUTCHours()]++;
      }
      Object.assign(out, { total, people, by_day: byDay, by_hour: byHour });
    }

    const res = Response.json(out, {
      // an hour at the edge: the chart describes months, not minutes
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=3600' },
    });
    context.waitUntil(cache.put(cacheKey, res.clone()));
    return res;
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: 'stats unavailable' }, { status: 500 });
  }
}
