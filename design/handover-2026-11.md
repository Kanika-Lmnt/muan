# Handover pass — 1 Nov 2026

Work done while Kar handed the project over. Everything is uncommitted in
the working tree for review. No migrations, no D1 changes, nothing to run
with `--remote` — this can deploy as soon as it is merged.

## 1. Onboarding (first-run flow)

`showMoodIntro()` in js/app.js, CSS under "first-run flow" in style.css.

- Four welcome pages, each teaching one thing: what this is · real hours
  (with a live "N places are open right now" count from the loaded venues)
  · the location ask · check-ins, embers and Phai. Then the mood question
  when any venue has vibe tags (it used to be the only reason the intro
  showed at all — with no tags, nobody got onboarding).
- One big coral button that follows the page (Next / Use my location /
  Let's go), "Not now" beside it on the location page, Skip top-right,
  page dots that stretch into a coral pill. Arrow keys work on desktop.
- Phai sits on every illustration in a different pose; the check-in page
  is Phai on a lit stage with drifting embers and a "+25 embers · first
  visit" chip (25 = config ember_new_venue).
- Illustrations are taller (46% of the screen, cover-cropped from the
  centre) and fade into the page instead of ending on a hard edge.
- **Location is no longer asked cold.** On a first run, boot() skips its
  automatic location request; the location page explains why and asks on
  a tap. Granted → "Location is on", the page moves on by itself, and
  Home is sorted by distance when the intro closes. Blocked → says so and carries on.
  If permission was already granted it's picked up silently.
- **Shared links skip the intro.** A first visit arriving on `?v=` or
  `?wheel=` (Ask a friend, group wheels) gets the venue/wheel, not a tour
  in front of it. The tour waits for their next plain visit.

## 2. Category icons + Spin tile

- New icon set (CAT_ICONS in app.js): line drawings with one coral accent
  each — cocktail, coffee cup, noodle bowl, ticket, wheel. Rounded-square
  tiles instead of circles.
- New fifth tile, **ສຸ່ມເລືອກ · Spin**: opens the wheel over every open
  bar, café and restaurant (`wheelCandidates('all')`). It's also the first
  way into the wheel on desktop.

## 3. On fire carousel

Snaps card by card now (scroll-snap with scroll-padding, so card 1 keeps
its inset — the bug that got snapping removed last time), and a hard
flick at the end no longer triggers the browser's back-swipe.

## 4. Security

- **Unreviewed submissions were public.** Any Google account could submit
  a venue and it showed on everyone's Home immediately (pending venues
  were in /api/venues). Now /api/venues and data/venues.json carry placed
  venues only; the submitter still sees their own pending venue (merged
  in from /api/my-venues), as CLAUDE.md asks.
- **Internal files were downloadable.** The repo is the deploy, so
  /CLAUDE.md, /design/…, /migrations/…, /scripts/…, /functions/… were all
  served. functions/_middleware.js 404s them; _routes.json keeps every
  other static file off Functions. A new internal folder must be added to
  both lists.
- **Cross-site requests** to any state-changing /api endpoint are refused
  (functions/api/_middleware.js, Origin / Sec-Fetch-Site).
- **Rate limits** (best-effort, per IP, functions/api/_ratelimit.js):
  mood-pick 30/min (anonymous D1 writes), route 20/min (spends the
  OpenRouteService quota), Google sign-in 15/min, upload signatures 40/min.
  For a hard limit, add a Cloudflare rate-limiting rule in the dashboard.
- `_headers`: nosniff, X-Frame-Options, Permissions-Policy (geolocation
  self only). No CSP yet — needs testing on a phone first.
- Checked and fine: session cookie flags, Google token audience check,
  owner/admin authorisation on every write, avatar/photo public-id checks,
  HTML escaping of owner-written fields, og-tag escaping.
- Still open (needs a decision, not a bug): an approved owner's later
  edits go live without review. That's the trust model chosen in August.

## 5. Cleanup

- Removed the "Comments — they're coming" box from every venue page (a
  promise for a parked feature reads as an unfinished app).
- Moved assets/advert-source and assets/phai-mascot to marketing/ — they
  were being deployed as public site files.

## Kar to check (Lao)

TODO(lao) strings added: ເປີດຢູ່ບໍ່? · ໃກ້ຂ້ອຍ · ເຊັກອິນ (intro headings),
ສຸ່ມເລືອກ (Spin tile).

## Kar to test on a real phone

1. Fresh visit (private tab): the intro, the location ask (allow and
   block), then Home sorted by distance.
2. Open an Ask-a-friend link in a private tab: straight to the venue.
3. Spin tile on Home; On fire swipe.
4. Sign in, submit a test venue: you see it, a private tab doesn't.

## 6. Dark theme: palette and depth (second pass)

Kar's notes: dark mode felt off, had stripes, and the UI and search
"protrude". What dark-UI guidance says (Material's dark theme, and the
common practice it set): don't use shadows for depth on near-black — they
barely read — show elevation with lighter surfaces instead; keep the chrome
neutral so photos and the one accent carry the colour; avoid busy texture.

- Night neutrals moved off the blue-violet cast: #131019/#1C1726/#241E31/
  #2E2740 → #141215/#1B181C/#242126/#2F2B31 (faint plum warmth kept).
  --mute #948F9D → #A39D9F, --dim #5A5468 → #6E6870. Contrast: body text
  15.4:1 on the sheet, --mute 6.6:1 on the sheet and 6.0:1 on a card.
  **CLAUDE.md's "Design tokens" line still lists the old ink values — update
  it when you merge.**
- The diagonal weave texture is off in both themes (--weave: none; the
  token stays for a real Lao textile motif later).
- Flat surfaces in dark: no gradient fill, no bright top edge, no drop
  shadow on cards, tiles, the search bar or the bottom nav. A card is
  separated from the page by one tone step plus a 1px hairline.
- The search bar no longer carries its own extra drop shadow (both themes).
- Splash, theme-color and the PWA manifest use the new base colour.
- Photo scrims use the new ink value.

## 7. Third pass

- **Saved places**: a heart on every venue page (top right of the photo);
  saved places appear as the first row on Home ("Saved · ບັນທຶກໄວ້",
  TODO(lao)). Stored on the device only — no account sync yet.
- **"info updated 3 Oct"** under the hours on every venue page, from the
  venue row's updated_at (when the listing last changed — deliberately not
  worded as "checked"). /api/venues and scripts/export-venues.js now carry
  it as `updated`; it appears once the live API answers, or after the next
  export for the bundled mirror. Note the Cache API can serve the old
  /api/venues payload for up to an hour after deploy.
- Fixed: the share button was a white square in dark mode (no surface of its
  own — the browser's default button face). Same root cause would have hit
  other buttons once the gradient fill was removed, so --card-fill is a flat
  image rather than `none`.

## 8. Cream is the default theme

Kar prefers the cream (light) theme, so it is now what everyone gets until
they choose otherwise — it no longer flips to dark at 5 pm or follows the
phone's dark-mode setting. The theme button cycles light → dark → auto,
where auto is the old behaviour (dark 5 pm–6 am). A saved choice is kept.
The browser bar colour (theme-color) and the PWA manifest follow cream.
