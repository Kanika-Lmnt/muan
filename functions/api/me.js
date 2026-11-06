import { getSessionUser } from './_auth.js';
import { computeHeat } from './_heat.js';
import { isAdmin } from './_admin.js';
import { vtMonth, prevMonthOf, vtMonthRange, vtNight } from './_time.js';

export async function onRequest(context) {
  if (context.request.method !== 'GET')
    return Response.json({ ok:false, error:'method not allowed' }, { status:405 });
  try {
    const db = context.env.DB;
    const user = await getSessionUser(context);
    if (!user) return Response.json({ ok:true, signed_out:true });

    // months and nights in Vientiane time, not UTC (see _time.js)
    const month = vtMonth(); // YYYY-MM
    const [monthStart, monthEnd] = vtMonthRange(month);
    const monthRows = await db.prepare(
      'SELECT created_at FROM checkins WHERE user_id=? AND created_at >= ? AND created_at < ?'
    ).bind(user.id, monthStart, monthEnd).all();
    const nightsThisMonth = [...new Set(monthRows.results.map(r => vtNight(r.created_at)))];
    const venues = await db.prepare(
      'SELECT COUNT(DISTINCT venue_id) AS c FROM checkins WHERE user_id=?'
    ).bind(user.id).first();
    const venueCountRows = await db.prepare(
      'SELECT venue_id, COUNT(*) AS c, MAX(created_at) AS last FROM checkins WHERE user_id=? GROUP BY venue_id'
    ).bind(user.id).all();
    const total = await db.prepare(
      'SELECT COUNT(*) AS c FROM checkins WHERE user_id=?'
    ).bind(user.id).first();

    const badgeRows = await db.prepare(
      `SELECT b.code AS id, b.name, b.name_lo, b.icon, b.rule AS description, ub.earned_at
       FROM user_badges ub JOIN badges b ON b.code = ub.badge_code
       WHERE ub.user_id = ? ORDER BY ub.earned_at`
    ).bind(user.id).all();

    // every badge, earned or not, so the You screen can show what is still
    // to earn and how (the rule text) — a goal you can see is one you can
    // work towards
    const allBadges = await db.prepare(
      'SELECT code AS id, name, name_lo, icon, rule AS description FROM badges ORDER BY rowid'
    ).all();

    const cfgRows = await db.prepare(
      "SELECT key, value FROM config WHERE key IN ('phai_thresholds','ember_new_venue','ember_repeat')"
    ).all();
    const cfgMap = Object.fromEntries(cfgRows.results.map(r => [r.key, r.value]));
    const thresholds = JSON.parse(cfgMap.phai_thresholds || '[0,100,400,1200,3000]');
    const stages = ['ember','flicker','flame','blaze','naga'];
    let stage = 'ember';
    let nextStage = null, nextStageAt = null;
    thresholds.forEach((t,i) => { if (user.embers_total >= t) stage = stages[i]; });
    const si = stages.indexOf(stage);
    if (si + 1 < stages.length && thresholds[si + 1] !== undefined) {
      nextStage = stages[si + 1]; nextStageAt = thresholds[si + 1];
    }

    const { heat, heat_level } = await computeHeat(db, user.id);

    // the streak as it stands TODAY. users.streak_months is only written on a
    // check-in, so after a gap it still holds the old run; a streak whose
    // last month is neither this month nor last month has lapsed.
    const prevMonth = prevMonthOf(month);
    const lastMonth = user.last_checkin_month || null;
    const streakState = lastMonth === month ? 'safe'
      : lastMonth === prevMonth ? 'at_risk'
      : (user.streak_months || 0) > 0 ? 'lapsed' : 'none';
    const streakNow = streakState === 'safe' || streakState === 'at_risk' ? (user.streak_months || 0) : 0;

    // recap of LAST month, from its check-ins: nights out (distinct days),
    // check-ins, places visited for the first time ever, most-visited place
    const [prevStart, prevEnd] = vtMonthRange(prevMonth);
    const prevRows = await db.prepare(
      'SELECT venue_id, created_at FROM checkins WHERE user_id=? AND created_at >= ? AND created_at < ? ORDER BY created_at'
    ).bind(user.id, prevStart, prevEnd).all();
    let recap = null;
    if (prevRows.results.length) {
      const firsts = await db.prepare(
        'SELECT venue_id, MIN(created_at) AS first FROM checkins WHERE user_id=? GROUP BY venue_id'
      ).bind(user.id).all();
      const firstMonth = Object.fromEntries(firsts.results.map(r => [r.venue_id, vtMonth(new Date(r.first))]));
      const per = {};
      prevRows.results.forEach(r => { per[r.venue_id] = (per[r.venue_id] || 0) + 1; });
      const top = Object.entries(per).sort((a, b) => b[1] - a[1])[0];
      recap = {
        month: prevMonth,
        nights: new Set(prevRows.results.map(r => vtNight(r.created_at))).size,
        checkins: prevRows.results.length,
        places: Object.keys(per).length,
        new_places: Object.keys(per).filter(id => firstMonth[id] === prevMonth).length,
        top_venue: top[0],
        top_count: top[1],
      };
    }

    // first-ever sign-in only; a returning account with real check-ins
    // (e.g. a new device) already knows what the flame is
    const showIntro = !user.intro_seen && (total?.c || 0) === 0;

    return Response.json({
      ok: true,
      show_intro: showIntro,
      // one-time first-open mood chooser (see showMoodIntro() in js/app.js)
      // — read only when this user is signed in; an anonymous visitor is
      // gated by localStorage instead (see migrations/014_mood_intro_seen.sql)
      mood_intro_seen: !!user.mood_intro_seen,
      // display-only — every admin write re-checks this same isAdmin() call
      // against the session's own user id server-side (see functions/api/
      // venues/[id]/approve.js, reject.js); a client can't grant itself
      // admin by faking this field, only by having a session that qualifies
      is_admin: isAdmin(context, user),
      handle: user.handle,
      avatar_url: user.avatar_url || null,
      embers_total: user.embers_total || 0,
      streak_months: user.streak_months || 0,
      phai_stage: stage,
      heat,
      heat_level,
      // the nights out this month (a night past midnight counts once)
      checkin_days: nightsThisMonth,
      venue_counts: Object.fromEntries(venueCountRows.results.map(r => [r.venue_id, r.c])),
      // last check-in per venue (ISO) — "your places" on the You screen
      venue_last: Object.fromEntries(venueCountRows.results.map(r => [r.venue_id, r.last])),
      stage_floor: thresholds[si] ?? 0,
      next_stage: nextStage,
      next_stage_at: nextStageAt,
      // the real per-check-in values from config, so the screen's "new
      // places earn more" line can never drift from what checkin.js pays
      ember_new_venue: Number(cfgMap.ember_new_venue ?? 25),
      ember_repeat: Number(cfgMap.ember_repeat ?? 5),
      all_badges: allBadges.results,
      streak_state: streakState,
      streak_now: streakNow,
      recap,
      venues_explored: venues?.c || 0,
      total_checkins: total?.c || 0,
      badges: badgeRows.results,
      month
    });
  } catch (e) {
    console.error(e);
    return Response.json({ ok:false, error:'stats failed' }, { status:500 });
  }
}
