// Where the phone app's pages come from. Capacitor serves the app's own
// copy of the site from inside the app: Android as https://localhost,
// iPhone as capacitor://localhost. Requests from these origins are the
// app talking to its server (CORS is allowed for them in _middleware.js)
// and they carry the session as a bearer token instead of the cookie,
// which a browser never sends to a different site. See app/README.md.
export const APP_ORIGINS = new Set(['https://localhost', 'capacitor://localhost']);

export function isAppRequest(request) {
  return APP_ORIGINS.has(request.headers.get('Origin') || '');
}

// The session token: "Authorization: Bearer <token>" from the phone app,
// the psd_session cookie from the website. Same sessions table either way.
export function sessionToken(request) {
  const auth = request.headers.get('Authorization') || '';
  const b = auth.match(/^Bearer\s+([A-Za-z0-9-]+)$/);
  if (b) return b[1];
  const cookie = request.headers.get('Cookie') || '';
  const m = cookie.match(/(?:^|;\s*)psd_session=([A-Za-z0-9-]+)/);
  return m ? m[1] : null;
}

export async function getSessionUser(context) {
  const token = sessionToken(context.request);
  if (!token) return null;
  const row = await context.env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ? AND s.expires_at > ?`
  ).bind(token, new Date().toISOString()).first();
  return row || null;
}

export function sessionCookie(token, maxAgeSeconds) {
  return `psd_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}`;
}
