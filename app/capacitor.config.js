// Capacitor's settings for this app, read by the Capacitor CLI whenever
// you run `npx cap ...`. A .js file (not .json) so it can look at which
// server the last `npm run build` aimed the app at.
const fs = require('fs');
const path = require('path');

let server = '';
try {
  server = JSON.parse(fs.readFileSync(path.join(__dirname, 'www', 'app-build.json'), 'utf8')).server;
} catch (e) { /* no build yet — `npm run build` makes www/ */ }

// true only for `npm run build:local` (wrangler on this laptop, plain http)
const local = server.startsWith('http://');

module.exports = {
  // The app's permanent ID in the Play Store and App Store: the domain
  // backwards. Can't be changed once the app is published.
  appId: 'app.paisaidee',
  appName: 'Paisaidee',
  // the folder of web files packed into the app (made by build-www.mjs)
  webDir: 'www',
  // The app's page is https://localhost; a local server is plain http.
  // Android blocks that mix unless told otherwise — so only for local
  // builds, allow it. Release builds never get these two switches.
  ...(local ? { server: { cleartext: true }, android: { allowMixedContent: true } } : {}),
};
