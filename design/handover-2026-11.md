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

## 9. You page and rewards (fourth pass)

### What the research says
- Foursquare's mayorships were fun until competing with strangers made
  people check in at closed and made-up places; the database the company
  lived on went bad, and it split check-ins off into Swarm. Lesson: never
  reward behaviour that can corrupt the venue data, and no stranger
  leaderboards. (Paisaidee's GPS check, open-hours check and caps already
  guard this — keep it that way.)
- Swarm's later coins and stickers read as "blingy" and stopped meaning
  anything after a few months. Lesson: rewards should mean something in
  the real world or to the person, not be a currency for its own sake.
- Duolingo: streaks work best with a low bar, and a missed day must not
  feel like failure (freezes, repair). Paisaidee's MONTHLY streak is
  already the low-bar version — keep it gentle.
- Self-determination theory: people keep doing things that make them feel
  capable, free to choose, and connected. Points and leaderboards lift
  numbers short-term but can crowd out the real reason to use the app.

### What changed on the You page
- **Next up**: the two or three closest things to earn, each with a
  progress bar and how far to go — Phai's next stage (in embers and in
  "about N new places"), the nearest avatar item, and the next countable
  badge. Plus one line saying what pays most: a new place earns 25
  embers, a repeat 5 (read from config, so it can't drift).
- **Your Vientiane · ວຽງຈັນຂອງເຈົ້າ** (TODO(lao)): "8 of 33 places
  found" with a bar and per-type counts, then the places themselves —
  most recent first, with visit count, last visit date, and a "favourite"
  (3+) / "your regular" (5+) tag. This is the record that makes the page
  yours.
- **Saved** on You, with a heart to take a place off (signed out too).
- **Badges** now show all five: earned ones, then the rest dimmed with the
  rule for earning them ("Checked in after midnight").
- /api/me returns venue_last, next_stage, next_stage_at, stage_floor,
  ember_new_venue, ember_repeat and all_badges. No migration.

### Next steps worth building (need a decision or data)
1. **Real rewards from venues** (PHASE2 phase 5): e.g. "5 check-ins at
   Tree Town → a free drink". The most motivating reward is a real one,
   and it gives venues a reason to sign up. Needs a rewards table, an
   owner screen to set one, and a redeem-at-the-counter flow.
2. **Monthly recap card** ("Your October: 4 nights out, 2 new places,
   most visited Tree Town") — shareable to stories; all from check-ins.
3. **Friends** (PHASE2 slice D): seeing friends' recent places is the
   strongest retention lever in the research (shared streaks +22%), but it
   needs the privacy switches in PHASE2 §3 built at the same time.
4. **Gentle streak repair**: if the monthly streak breaks, offer "one
   check-in this week keeps it" rather than resetting silently.

## 10. Open now filter
An "Open now · 12" toggle above every type list and above All places
narrows the list to places open right now (venues with unconfirmed hours
never count as open). The number is how many in that list are open.

## 11. Load size (measured, not changed)
app.js is 399KB raw / 134KB gzipped; style.css 250KB / 80KB. About half of
app.js is comments. Lazy-loading the intro and the wheel would save only
~8KB gzipped, so it isn't worth the risk. The real fix is a build step that
strips comments and minifies at deploy (app.js would drop to roughly
60KB gzipped) — but "no build step" is a deliberate project rule, so that
is Kar's call. The bigger download is maplibre-gl.js (~830KB from unpkg),
which already loads async.

## 12. Streaks and monthly recap (fifth pass)

- **Bug fixed — the monthly streak never broke.** checkin.js added +1 for
  ANY new month, so three months off and one check-in still counted as an
  unbroken run. Now: same month → unchanged, the next month → +1, a gap →
  a fresh streak of 1 (checked for the January rollover too).
- /api/me now says where the streak stands today (`streak_state`: safe /
  at_risk / lapsed / none, and `streak_now`), because users.streak_months is
  only written on a check-in and goes stale after a gap.
- **Kind streak line** under the flame: "One check-in in November keeps
  your 3-month streak going" (at risk, in coral), "This month counts — your
  3-month streak is safe", or "Your streak is resting — one check-in starts
  a new one". Never "you lost it".
- **"Your October" recap** on You, from last month's check-ins: nights out,
  new places (first-ever visits), check-ins, and most visited (only when a
  place was visited 2+ times). **Share my October** makes a 1080×1920 story
  image (cream, Phai, the numbers, the site address) and opens the phone's
  share sheet; where image sharing isn't supported it shares/copies text.

## 13. Phone app groundwork (branch claude/capacitor)

Step 1 of the Capacitor plan. Start with app/README.md, which is also the
learning guide.
- The website calls the API through `apiFetch()` (js/app.js, owner.js,
  avatar.js). On the website it's plain fetch. In the app it prefixes the
  server address (`window.PSD_SERVER`, written by app/build-www.mjs) and
  sends the session as `Authorization: Bearer`.
- Server: `getSessionUser` accepts the bearer token or the cookie
  (functions/api/_auth.js). /api/auth/google returns the token in the
  body only to the app origins (https://localhost, capacitor://localhost).
  Logout deletes either. functions/api/_middleware.js answers CORS for
  those two origins and lets their writes past the cross-site check.
  That's safe because they carry a token a browser never attaches by itself.
- Share links (venue, wheel, recap) use `SITE_ORIGIN`, which is the real
  site in the app.
- In the app the You tab says sign-in is coming (Google blocks web sign-in
  in WebViews). Native sign-in is stage 3.
- app/ (package.json, capacitor.config.js, build-www.mjs) is 404'd on the
  public site like design/ and scripts/. The website still has no build
  step: app/www is a copy made only for the app.
- Tested: the app build served as https://localhost against local
  wrangler loads venues, /api/me with a token, and the signed-out note.
  Preflight returns 204 with CORS headers. A POST from another origin is
  still refused. The website regression run is unchanged.
- No migration. Safe to merge whenever. On the website the only difference
  is the extra CORS answer for the two app origins.

## 14. Phone app stage 2 (branch claude/capacitor)

- Location: if the 4-second coarse fix times out or is unavailable, ask
  once more with GPS (10s) before saying "Can't find you". Found on the
  Android emulator, which has no wifi/cell positioning, but real phones
  with wifi off hit it too. A denial is still final.
- Icon and splash sources in app/assets/ (the flame pin on #141215 for the
  icon, on cream for the splash). `npm run icons` generates the Android
  sizes with @capacitor/assets.
- `nativeBars()`: dark status-bar icons on cream, light on night, via
  Capacitor's built-in SystemBars. Otherwise Android follows the phone's
  dark mode.
- `initNativeBackButton()` (@capacitor/app): back closes overlays, steps
  back through the intro, leaves detail pages, returns Map/You to Home,
  and on Home sends the app to the background.
- Tested with a mocked Capacitor in Playwright: each back step, the
  minimise on Home, and the bar style following the theme toggle. On the
  website NATIVE is null and none of it runs.

## 15. Top lists, "Can't decide?", When people go

- **Top lists** (Home, with a Bars/Cafés switch; and at the top of each type
  tab): up to 5 per type. Ordered by how many DIFFERENT people checked in
  over the last 30 days (`people_30d` on /api/venues, 3+ people to count),
  then Kar's picks from data/picks.json `top` (empty until Kar fills it).
  Each row says which: "8 people this month" or "our pick". No Google or
  other borrowed numbers (017's rule).
- **Wheel**: the Spin tile is gone from the category row (it read as a
  prize game). Home has a "Can't decide? Let Phai pick" card that names how
  many open places it chooses from (hidden with fewer than 2). The type
  tabs keep their Spin button.
- **When people go** on venue pages: check-ins by weekday over 90 days,
  plus the busiest three-hour stretch, from the new GET /api/venue-stats.
  It's only drawn with 10+ check-ins from 5+ different people. Below that
  nothing shows: a thin chart would be noise, and with one or two regulars
  it would describe a person's habits.
- The cafés tab's "Recommended" switch is renamed "Photos". It was always
  "cafés with 2+ photos", which isn't a recommendation.
- TODO(lao): ອັນດັບ (Top lists), ອັນດັບ + type, ເລືອກບໍ່ຖືກບໍ?

## 16. Wheel payoff, new venues, check-up pass (6 Nov)

- **Wheel result**: landing on an open place pulses the slice, buzzes the
  phone and fires confetti, then opens that venue's page with a "Phai
  picked this one" banner (Spin again / Share). Shared wheels skip Spin
  again; a closed winner keeps the quiet note.
- **19 new venues** (10 bars, 9 cafés), pins and hours from each venue's
  Google Maps listing (scripts/add-venues-2026-11.sql, then
  place-venues-2026-11.sql). Six candidates dropped as closed or missing.
  Closing times after midnight use the 24:00+ convention (25:00 = 1 am).
  Berliner Garden has a midday break, which the one-range-per-day hours
  can't hold, so it carries an hours_note instead.
- **Months and nights now use Vientiane time** (functions/api/_time.js).
  The monthly streak, the monthly ember tiers, "nights out" and the recap
  all sliced UTC timestamps, so anything between midnight and 7 am local
  landed in the wrong month or day. A night now runs until 6 am.
- **Bar-hopping**: the "you haven't moved" rule was an hour, which blocked
  checking in next door (Baron and Mahasan are 6 m apart). Now 30 minutes,
  and the message says how long to wait.
- **Next up** no longer promises "about 72 new places" when fewer are left
  to find. It says new places and going back both count.
- **Open late** is a swipe row on phones. With 50+ venues it had become
  a dozen-plus cards above All places.

## 17. Progress page and Top list marks (7 Nov)

- **Progress page** (openProgressSheet(), from "See all your progress" on
  the You flame card): totals, Phai's path through all five stages with
  the current one lit and how far to the next, the monthly streak as twelve
  month dots (with current and best run), every badge and avatar item with
  a progress bar, the last 12 check-ins with what each paid, and how
  embers are earned. Stage pictures use the existing Phai poses until the
  stage art exists. /api/me adds recent, months_active, embers_month and
  phai_thresholds for it. Back (and Android back) returns to You.
- **Top lists, signed in**: places you've been get a "been" mark, and each
  list says "You've been to 2 of 5".

## 18. Challenges, new badges, "How was it?", Lists, map peek (7 Nov)

**Needs migration 019 on production before deploy** (CLAUDE.md rule):
`npx wrangler d1 execute muan-db --remote --file=migrations/019_challenges_badges_reactions.sql`,
then `node scripts/check-schema.js`. It adds two tables (user_challenges,
user_reactions) and eight badge rows. Safe to run twice.

- **Monthly challenge** (functions/api/_challenges.js): one goal a month,
  the same for everyone, picked from a fixed five-step rotation by the
  month, so nothing needs setting up. +50 embers once, paid by the
  check-in that completes it (the user_challenges primary key stops a
  second payout). Shown on You (after the flame card), on Progress, and on
  the check-in celebration when it completes. The +50 counts toward the
  month's ember total. To add a challenge, add it to ROTATION.
- **Eight new badges** (13 in all): Café Hunter (5 cafés), Bar Hopper (two
  bars, one night), Sunset (riverside, 5–7 pm), Early Bird (café before
  9 am), Ten Nights Out, and 3-, 6- and 12-month streaks. Logic is in
  checkin.js; the riverside list now lives in functions/api/_riverside.js
  (Kong View added). Badge art is still the line icons until real art exists.
- **"How was it?"** (functions/api/react.js): after "Nice" on the
  celebration, Phai asks Loved it / It was fine / Not for me, then "which
  did you like more?" against your other places of the same type with the
  same answer (a binary search, so at most 3–4 questions with 10 places).
  Rank is a REAL so a place lands between two others without renumbering.
  Only places you've checked in at. The venue page shows "You: Loved it ·
  your #1 bar · Change", and You has a "Your rankings" card per type.
  These are private: nothing public reads user_reactions yet. If we ever
  show "people who loved this", that's a new decision, not a default.
- **Lists on Home** (All tab, after Top lists): Rooftops and Live music are
  hand-picked in data/picks.json `themes` (each with a _source note);
  "Open till 1 am or later", "By the river" and "Settle in" are worked out
  from hours, the riverside list and vibe tags. Each opens a list page with
  "You've been to X of Y". Kar to review the two hand-picked lists.
- **Places in view on the map** (phone only): a swipe row of up to 12
  places under the map, nearest the map's centre first, following the
  type filter. It refreshes as you pan, and hides while a route is shown.
- TODO(lao): the reaction labels, ເຈົ້າມັກບ່ອນໃດກວ່າ?, challenge titles,
  badge names, list names.

## 19. Wordmark splash and skeleton loading (13 Nov)

- **Splash** (index.html, all inline): ໄປໃສດີ over a wide-spaced
  PAISAIDEE, letters settling in one by one, and a hairline under it with
  a soft flame light running along it while the app loads. Replaces the
  spinning ring. The two fonts are ~2KB subsets embedded in the page (just
  P A I S D E and ໄປໃສດີ), so the wordmark is in the brand fonts from the
  first frame. Change the word, regenerate the subsets with pyftsubset.
  On the phone app, Android still shows its own splash first (the app icon
  on cream, for a split second; Android 12+ only allows an icon there),
  then this one. Both get updated when the new logo is final.
- **Skeleton loading**: the You screen shows grey placeholder cards in its
  real layout while /api/me loads (youSkeletonHtml()), instead of
  "Loading your flame…". Every Cloudinary photo shimmers until it has
  loaded (a document-level load/error listener adds .ld; the CSS is in the
  "skeleton loading" block at the end of style.css). Collage tiles shimmer
  instead of showing a spinning ring. loadingRing() stays for actions in
  progress (finding a route, upload %), where a spinner is still the
  right signal.
