import { sessionCookie, sessionToken } from '../_auth.js';

export async function onRequest(context) {
  if (context.request.method !== 'POST') {
    return Response.json({ ok: false, error: 'method not allowed' }, { status: 405 });
  }

  try {
    // the cookie on the website, the bearer token in the phone app
    const token = sessionToken(context.request);
    if (token) {
      await context.env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    }
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
  } catch (e) {
    console.error(e);
    return Response.json({ ok: true }, { headers: { 'Set-Cookie': sessionCookie('', 0) } });
  }
}
