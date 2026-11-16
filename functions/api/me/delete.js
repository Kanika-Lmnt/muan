import { getSessionUser, sessionCookie } from '../_auth.js';

// POST /api/me/delete  { confirm: true }
//
// Deletes the signed-in account and everything tied to it, as the privacy
// policy (legal/privacy.html) promises and as Apple requires of any app
// with sign-up (in-app account deletion, App Store guideline 5.1.1(v)).
//
// What goes: the users row, every session (signs out every device),
// check-ins, badges, challenges, "How was it?" reactions, quest progress,
// comments, friendships, venue-owner links, and every photo in the user's
// own Cloudinary folder (paisaidee/users/<id>/, the only place avatar
// uploads can go: see me/avatar.js).
// What stays: venues the person listed. They're public listings, so the
// venue keeps its page and only the link to this person is removed.
// mood_picks has no user id, so there's nothing of theirs in it.
//
// Every table is deleted from explicitly, children first, rather than
// leaning on ON DELETE CASCADE: venue_owners references users with no
// cascade (migrations/006), which would make the users delete fail, and
// explicit statements don't depend on foreign keys being switched on.
// It's one D1 batch, so it all happens or none of it does.
export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return Response.json({ ok: false, error: 'method not allowed' }, { status: 405 });
  }
  try {
    const user = await getSessionUser(context);
    if (!user) return Response.json({ ok: false, need_auth: true }, { status: 401 });

    const body = await context.request.json().catch(() => null);
    if (!body || body.confirm !== true) {
      return Response.json({ ok: false, error: 'confirm required' }, { status: 400 });
    }

    // photos first: if Cloudinary is down we stop here, and the account is
    // still intact for another try, rather than deleting the account and
    // leaving photos nobody can trace back
    const photos = await deleteUserPhotos(context.env, user.id);
    if (!photos.ok) {
      return Response.json({ ok: false, error: "Couldn't delete your photos just now. Nothing was deleted. Please try again in a minute." }, { status: 502 });
    }

    const db = context.env.DB, id = user.id;
    await db.batch([
      db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM checkins WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM user_badges WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM user_challenges WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM user_reactions WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM quest_progress WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM comments WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM friendships WHERE a = ? OR b = ?').bind(id, id),
      db.prepare('DELETE FROM venue_owners WHERE user_id = ?').bind(id),
      db.prepare('DELETE FROM users WHERE id = ?').bind(id),
    ]);

    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: false, error: "Couldn't delete your account just now. Nothing was deleted. Please try again." }, { status: 500 });
  }
}

// Cloudinary Admin API: delete every image under the user's folder.
// Basic auth with the same key and secret the upload signatures use.
// No keys configured (local dev) means there's nowhere photos could be,
// so that counts as done.
async function deleteUserPhotos(env, userId) {
  const cloud = env.CLOUDINARY_CLOUD_NAME, key = env.CLOUDINARY_API_KEY, secret = env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return { ok: true, skipped: true };
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/resources/image/upload?prefix=${encodeURIComponent(`paisaidee/users/${userId}/`)}`;
  try {
    const r = await fetch(url, { method: 'DELETE', headers: { Authorization: 'Basic ' + btoa(`${key}:${secret}`) } });
    if (!r.ok) { console.error('cloudinary delete', r.status, await r.text().catch(() => '')); return { ok: false }; }
    return { ok: true };
  } catch (e) {
    console.error('cloudinary delete', e);
    return { ok: false };
  }
}
