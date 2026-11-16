// The monthly challenge: one at a time, the same for everyone, picked from a
// fixed rotation by the month, so there is nothing to set up and nothing to
// store until someone completes it (migrations/019). The bar is low on
// purpose — one or two evenings — like the monthly streak: a nudge to try
// somewhere new, not a chore.
//
// Each challenge counts from this month's check-ins (Vientiane time), each
// with its venue's type and whether it was that person's first-ever visit.
import { vtNight } from './_time.js';
import { RIVERSIDE_VENUES } from './_riverside.js';

export const CHALLENGE_EMBERS = 50;

const ROTATION = [
  { id: 'new-cafes-2', title: "Try 2 cafés you've never been to", title_lo: 'ລອງຄາເຟໃໝ່ 2 ແຫ່ງ', need: 2,
    count: rows => new Set(rows.filter(r => r.first && r.type === 'cafe').map(r => r.venue_id)).size },
  { id: 'nights-4', title: 'Go out on 4 different nights', title_lo: 'ອອກໄປທ່ຽວ 4 ຄືນ', need: 4,
    count: rows => new Set(rows.map(r => vtNight(r.created_at))).size },
  { id: 'new-bars-2', title: "Try 2 bars you've never been to", title_lo: 'ລອງບາຣ໌ໃໝ່ 2 ແຫ່ງ', need: 2,
    count: rows => new Set(rows.filter(r => r.first && r.type === 'bar').map(r => r.venue_id)).size },
  { id: 'riverside-2', title: 'Check in at 2 places by the river', title_lo: 'ແຄມຂອງ 2 ແຫ່ງ', need: 2,
    count: rows => new Set(rows.filter(r => RIVERSIDE_VENUES.includes(r.venue_id)).map(r => r.venue_id)).size },
  { id: 'new-any-3', title: "3 places you've never been to", title_lo: 'ບ່ອນໃໝ່ 3 ແຫ່ງ', need: 3,
    count: rows => new Set(rows.filter(r => r.first).map(r => r.venue_id)).size },
];

export function challengeFor(ym) {
  const [y, m] = ym.split('-').map(Number);
  return ROTATION[(y * 12 + (m - 1)) % ROTATION.length];
}

// this month's check-ins for one person, each with its venue type and
// whether it was their first-ever check-in at that place
export async function monthRows(db, userId, monthStart, monthEnd) {
  const rows = await db.prepare(
    `SELECT c.venue_id, c.created_at, v.type,
            (c.created_at = (SELECT MIN(c2.created_at) FROM checkins c2
                             WHERE c2.user_id = c.user_id AND c2.venue_id = c.venue_id)) AS first
     FROM checkins c LEFT JOIN venues v ON v.id = c.venue_id
     WHERE c.user_id = ? AND c.created_at >= ? AND c.created_at < ?`
  ).bind(userId, monthStart, monthEnd).all();
  return rows.results.map(r => ({ ...r, first: !!r.first }));
}

export function challengeProgress(ch, rows) {
  const have = Math.min(ch.count(rows), ch.need);
  return { id: ch.id, title: ch.title, title_lo: ch.title_lo, need: ch.need, have, embers: CHALLENGE_EMBERS };
}
