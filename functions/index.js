// Per-venue link previews for /?v=<venue-id>.
//
// WHAT THIS IS FOR: ?v=<id> is already the app's deep link — openVenue() in
// js/app.js rewrites the URL to it, and boot() reads it back (see deepLinkId
// there) — so the link someone copies out of the app and pastes into
// Messenger, WhatsApp, LINE or a group chat is a venue link. Every one of
// those previews was the same generic site card, because index.html is a
// static file with one fixed <head>. This rewrites the og: block for the
// venue being shared, so the preview says which place it is.
//
// WHY A ROUTE FILE AND NOT functions/_middleware.js: a top-level
// _middleware.js in Pages runs for EVERY request — the stylesheet, app.js,
// every data/*.json, every Cloudinary-less asset — because Pages' generated
// _routes.json then includes /*. That is a Function invocation in front of
// every byte of the site and a single point of failure for all of it, to
// serve a feature that only ever concerns one URL. functions/index.js routes
// exactly "/" and nothing else; query strings do not affect Pages routing, so
// /?v=<id> lands here and /css/style.css does not.
//
// HOW IT STAYS OUT OF THE WAY OF A NORMAL LOAD, which matters because this
// now sits in front of the most important request on the site:
//   * no ?v= at all -> context.next() immediately, before anything is read
//     or parsed. The static index.html is streamed back untouched.
//   * unknown id, missing markers, or ANY throw -> the unmodified page. The
//     whole body is wrapped, because a share-preview nicety must not be able
//     to take the app down. This is the same instinct as the bundled-mirror
//     fallback in functions/api/venues.js, and for the same reason (CLAUDE.md
//     records what a 500 on a hot path cost last time).
//   * the response is only ever read to text and string-replaced once. No DOM
//     parsing, no HTMLRewriter stream setup, no second fetch.
//
// WHY THE BUNDLED MIRROR AND NOT D1: data/venues.json is imported here the
// same way functions/api/venues.js imports it, which means it is bundled at
// deploy time and costs nothing at request time — no D1 round trip, no D1
// failure mode, and no column names for a future migration to break (the
// 008/010 trap in CLAUDE.md). It is a mirror, so a venue added to D1 shows a
// generic preview until `node scripts/export-venues.js` is run — which
// CLAUDE.md already requires after any D1 edit. A slightly stale preview on a
// brand-new venue is a much cheaper failure than the HTML document itself
// depending on a database query.
//
// Bots only need the head, and that is all this touches: the body, the boot
// script, every <link> and js/app.js are byte-identical, so a human following
// the same link gets exactly the app they got before.
import venuesData from '../data/venues.json';

// the markers in index.html — see the comment there. Non-greedy, so it stops
// at the first og:end.
const OG_BLOCK = /<!-- og:start -->[\s\S]*?<!-- og:end -->/;

// same cloud name and same transform shape as cloudinaryUrl() in js/app.js;
// 1200 wide because that is what og:image wants (the card renders at
// 1200x630 and scrapers downsample, they do not upsample). Deliberately a
// copy rather than an import: js/app.js is a browser script, not a module,
// and cannot be imported from a Function. If the cloud name changes it has to
// change in both places.
const CLOUDINARY_CLOUD_NAME = 'dzxg1vyi8';
const CLOUDINARY_STORED_RE = /^v\d+\/.+$/;
function cloudinaryUrl(stored, width) {
  if (typeof stored !== 'string') return null;
  if (/^https?:\/\//i.test(stored)) return stored;
  if (!CLOUDINARY_STORED_RE.test(stored)) return null;
  return `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_${width},q_auto,f_auto,dpr_auto/${stored}`;
}

// attribute-value escaping only — everything below goes into content="..."
// and nowhere else. & first, or it double-escapes the entities it just wrote.
const attr = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// rejected submissions are excluded from the public /api/venues feed
// (functions/api/venues.js); a link to one must not render a preview either.
// A 'pending' venue is fine — it is publicly listed, it just has no map pin.
const byId = new Map(
  (venuesData.venues || [])
    .filter((v) => v.pin_status !== 'rejected')
    .map((v) => [v.id, v])
);

function ogBlockFor(v, origin) {
  // the venue's own lead photo, through the same cloudinaryUrl() rules the
  // app uses, at 1200 wide. A venue with no photos (night-street today, and
  // vte-night-market once design/remove-night-market-photo.sql runs) falls
  // back to the site card rather than to a monogram tile: the in-app
  // placeholder is a generated data: URI, which no scraper can fetch, and an
  // og:image that 404s is worse than the generic one.
  const photo = (v.photos && v.photos.length && cloudinaryUrl(v.photos[0], 1200)) || null;
  const image = photo || `${origin}/assets/og-default.png`;
  const name = v.name;
  // Lao first where there is Lao, same order as the venue detail's own title
  const title = v.name_lo ? `${v.name_lo} · ${name} — Paisaidee` : `${name} — Paisaidee`;
  // v.short is the venue's one-line tagline. No invented copy when it is
  // absent — fall back to the site's own sentence rather than writing one.
  const desc = v.short || 'A live map of bars, cafes and events in Vientiane.';
  const url = `${origin}/?v=${encodeURIComponent(v.id)}`;

  // No og:image:width/height here: these are real venue photos at arbitrary
  // aspect ratios, and declaring 1200x630 for one that is 4:3 makes scrapers
  // letterbox or crop against a size we made up. The default block in
  // index.html does declare them, because that card really is 1200x630.
  return `<!-- og:start -->
  <meta property="og:type" content="place">
  <meta property="og:site_name" content="Paisaidee">
  <meta property="og:title" content="${attr(title)}">
  <meta property="og:description" content="${attr(desc)}">
  <meta property="og:url" content="${attr(url)}">
  <meta property="og:image" content="${attr(image)}">
  <meta property="og:image:alt" content="${attr(name)}">
  <meta property="og:locale" content="lo_LA">
  <meta property="og:locale:alternate" content="en_GB">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(title)}">
  <meta name="twitter:description" content="${attr(desc)}">
  <meta name="twitter:image" content="${attr(image)}">
  <!-- og:end -->`;
}

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get('v');
    // the overwhelmingly common case: a plain visit. Nothing is read, nothing
    // is parsed, the asset is streamed straight through.
    if (!id) return context.next();

    const v = byId.get(id);
    if (!v) return context.next();

    const res = await context.next();
    // only rewrite an HTML 200 — if Pages served anything else for "/" it is
    // not ours to edit
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('text/html')) return res;

    const html = await res.text();
    // markers gone (someone edited index.html's head) — hand back what we
    // read rather than guessing where the tags are
    if (!OG_BLOCK.test(html)) return new Response(html, res);

    const rewritten = html.replace(OG_BLOCK, () => ogBlockFor(v, url.origin));
    const out = new Response(rewritten, res);
    // the body is no longer the bytes those headers describe: Content-Length
    // is wrong and the asset server's ETag now identifies different content.
    // Both have to go, or a cache can serve the generic head under this URL
    // (or truncate the response).
    out.headers.delete('content-length');
    out.headers.delete('etag');
    out.headers.set('cache-control', 'public, max-age=0, must-revalidate');
    return out;
  } catch (e) {
    // a link preview is never worth a broken home page
    console.error('[og] falling through to the unmodified page:', e);
    return context.next();
  }
}
