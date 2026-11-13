// Makes app/www/: the app's own copy of the website, with one line added
// that tells it where the server is. Capacitor packs www/ into the app.
//
//   npm run build                  → server https://muan.pages.dev
//   npm run build -- --server URL  → any server (e.g. https://paisaidee.app)
//   npm run build:local            → wrangler on this laptop, as the
//                                    Android emulator sees it (10.0.2.2)
//
// The website itself still has no build step: Cloudflare deploys the repo
// as it is. This copy exists only for the app.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_SERVER = 'https://muan.pages.dev';
const here = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(here, '..');   // the repo root = the website
const out = path.join(here, 'www');

const i = process.argv.indexOf('--server');
const server = (i > 0 ? process.argv[i + 1] : process.env.PSD_SERVER || DEFAULT_SERVER).replace(/\/+$/, '');
if (!/^https?:\/\/[^/]+$/.test(server)) {
  console.error(`Not a server address: "${server}" — expected something like https://paisaidee.app`);
  process.exit(1);
}

// what the website is made of — everything else in the repo (functions,
// migrations, design notes, this folder) stays out of the app
const PARTS = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets', 'data', 'legal'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const p of PARTS) {
  fs.cpSync(path.join(site, p), path.join(out, p), { recursive: true });
}

// the one change: window.PSD_SERVER, right after <meta charset>, before
// the boot script that starts fetching /api/venues
const indexPath = path.join(out, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');
const anchor = '<meta charset="UTF-8">';
if (!html.includes(anchor)) throw new Error(`index.html has no ${anchor} to put the server address after`);
const tag = `<script>window.PSD_SERVER = ${JSON.stringify(server)};</script>`;
fs.writeFileSync(indexPath, html.replace(anchor, `${anchor}\n  ${tag}`));

// read by capacitor.config.js
fs.writeFileSync(path.join(out, 'app-build.json'), JSON.stringify({ server, built: new Date().toISOString() }, null, 2));

console.log(`www/ built — the app will talk to ${server}`);
