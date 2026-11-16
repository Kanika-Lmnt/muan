// POST /api/react { venue_id, reaction, rank }
//
// "How was it?" — one answer per person per place (migrations/019). The
// client asks the reaction, then "better or worse than X?" against the
// person's other places of the same type to find where this one sits, and
// sends the resulting rank (higher = better; a REAL so it can land between
// two neighbours). Only for places the person has actually checked in at:
// a ranking of places you've been, not a review of places you've heard of.
import { getSessionUser } from './_auth.js';

const REACTIONS = new Set(['loved', 'fine', 'not-for-me']);

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return Response.json({ ok: false, error: 'method not allowed' }, { status: 405 });
  }
  try {
    const user = await getSessionUser(context);
    if (!user) return Response.json({ ok: false, need_auth: true }, { status: 401 });
    const body = await context.request.json().catch(() => null);
    const venueId = body?.venue_id, reaction = body?.reaction;
    const rank = body?.rank === undefined || body?.rank === null ? null : Number(body.rank);
    if (typeof venueId !== 'string' || !REACTIONS.has(reaction) || (rank !== null && !Number.isFinite(rank))) {
      return Response.json({ ok: false, error: 'venue_id, a reaction and an optional numeric rank' }, { status: 400 });
    }
    const been = await context.env.DB.prepare('SELECT 1 FROM checkins WHERE user_id = ? AND venue_id = ? LIMIT 1')
      .bind(user.id, venueId).first();
    if (!been) return Response.json({ ok: false, error: 'check in there first' }, { status: 403 });
    await context.env.DB.prepare(
      `INSERT INTO user_reactions (user_id, venue_id, reaction, rank, updated_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT (user_id, venue_id) DO UPDATE SET reaction = excluded.reaction, rank = excluded.rank, updated_at = excluded.updated_at`
    ).bind(user.id, venueId, reaction, rank, new Date().toISOString()).run();
    return Response.json({ ok: true });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: 'could not save' }, { status: 500 });
  }
}
