# Muan — Phase 2 spec: check-ins, Embers & Phai

STATUS: Gate 1 passed (friends validation).
- Slice A (auth, check-ins, streak) — complete and live.
- Gamification beyond Slice A — phai stages, heat, badges, avatar items,
  and the first-sign-in intro — built ahead of Gate 2 because friends
  specifically asked for it during validation.
- Still genuinely gated on Gate 2 usage data: comments (need check-in
  volume to be worth reading), friends/presence, quests, live trending
  rankings.

This document is the source of truth for phase 2. Claude Code sessions should
read this before touching any phase 2 work. Design decisions here were made
deliberately; do not silently change them.

---

## 1. Architecture

- **Frontend:** existing static app on Cloudflare Pages (no framework).
- **API:** Cloudflare Workers (one Worker, routes under `/api/*`).
  Pages Functions or a separate Worker bound to the same domain — decide at build
  time based on what the Cloudflare dashboard offers then; prefer whatever keeps
  one repo and one deploy.
- **Database:** Cloudflare D1 (SQLite).
- **Auth:** Google Sign-In (OAuth) only at launch. No homemade passwords, ever.
  Store the Google `sub` claim as the stable user key. Session = signed cookie
  (HttpOnly, Secure, SameSite=Lax), 30-day expiry.
- **Principle:** client-side checks are UX; the Worker re-validates everything.

## 2. Core rules (product decisions, already made)

- **Streak unit = calendar month.** ≥1 valid check-in in a month keeps the
  streak. Displayed as "N months" / "N years". Never resets Phai's level.
- **Embers (XP):** earned per check-in, weighted for exploration:
  25 for a first-ever check-in at a venue, 5 for a repeat visit.
  +5 the venue has a verified event that night. +5 a friend is checked in
  at the same venue within ±2h. Values live in the config table.
  Rationale: the flame rank must mean "how much of the city you've
  explored", not "how often you sit in one bar".
- **Identity unit (avatar + flame rank + receipt):**
  - Avatar: mini cute character. Launch = 12–16 presets with Lao
    personality (hairstyles, sinh, tees, glasses, helmet-under-arm).
    Full avatar editor is out of scope for phase 2.
  - Flame rank: the Phai flame REUSED AS A RANK BADGE next to the name,
    not a pet. Stages from lifetime Embers (thresholds in config):
    ember → flicker → flame → blaze → naga fire. No dormant/sleepy state —
    ranks never decay or emote. Naga stage = cyan #55E0C8 + gold horns.
  - Receipt: every comment displays "checked in here N×" for that venue
    (or "first visit"). Computed from the checkins table; counts only,
    never timestamps. This is the review-trust mechanism.
  - Gear: earned accessory layers worn by the avatar. Category tier in
    phase 2: mini cup (5 distinct cafés), mug (5 distinct bars),
    ticket stub (5 events attended), moon (5 riverside venues).
    Venue-exclusive gear (e.g. "10× at one venue → that venue's item")
    is PHASE 3 — it is a venue-partnership feature, do not build early.
- **Check-in validity:** GPS within 150m of venue (tunable per venue for big
  places like ITECC), max 1 check-in per venue per 4 hours, max 6 check-ins per
  night per user (anti-farming). Server recomputes distance; never trust the
  client's "in range" claim.
- **Trending:** check-ins per venue in a rolling 3h window. Public sees the
  count only, never who.

## 3. Privacy model (non-negotiable)

- Public/anyone: venue trending counts; a user's Phai, badges, totals
  (distinct venues, ember total, streak length) on comments and profile.
- Friends only (mutual accept): live presence "at X now" — auto-expires 3h
  after check-in. There is NO browsable history of past locations for ANY
  viewer, including friends. Presence is a moment, not a record.
- Ghost mode: global toggle — check-ins still earn Embers/streak but are
  invisible to everyone and excluded from "here now" counts shown to friends
  (still counted in anonymous venue trending).
- Per-friend mute: hide presence from specific friends without unfriending.
- Data deletion: deleting the account hard-deletes check-in rows (not just the
  user row).

## 4. D1 schema

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  google_sub TEXT UNIQUE NOT NULL,
  handle TEXT UNIQUE NOT NULL,          -- public name, user-chosen
  created_at TEXT NOT NULL,
  ghost INTEGER NOT NULL DEFAULT 0,
  embers_total INTEGER NOT NULL DEFAULT 0,
  streak_months INTEGER NOT NULL DEFAULT 0,
  last_checkin_month TEXT,              -- 'YYYY-MM' for streak logic
  dormant INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE checkins (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL,               -- matches venues.json id
  created_at TEXT NOT NULL,             -- ISO UTC
  lat REAL, lng REAL,                   -- as reported, for audit; purge >90d
  embers INTEGER NOT NULL
);
CREATE INDEX idx_checkins_venue_time ON checkins(venue_id, created_at);
CREATE INDEX idx_checkins_user_time  ON checkins(user_id, created_at);

CREATE TABLE badges (
  code TEXT PRIMARY KEY,                -- 'cafe-hunter'
  name TEXT NOT NULL, name_lo TEXT,
  rule TEXT NOT NULL                    -- human-readable; logic lives in Worker
);

CREATE TABLE user_badges (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_code TEXT NOT NULL REFERENCES badges(code),
  earned_at TEXT NOT NULL,
  PRIMARY KEY (user_id, badge_code)
);

CREATE TABLE friendships (
  a INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  b INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,                 -- 'pending' | 'accepted'
  muted_by_a INTEGER NOT NULL DEFAULT 0,
  muted_by_b INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (a, b)                    -- store with a < b
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id TEXT NOT NULL,
  body TEXT NOT NULL,                   -- max 500 chars, enforced in Worker
  created_at TEXT NOT NULL,
  hidden INTEGER NOT NULL DEFAULT 0     -- moderation flag
);
CREATE INDEX idx_comments_venue ON comments(venue_id, created_at);

CREATE TABLE quests (                   -- monthly quest definitions
  id INTEGER PRIMARY KEY,
  month TEXT NOT NULL,                  -- 'YYYY-MM'
  code TEXT NOT NULL,                   -- 'two-new-places'
  target INTEGER NOT NULL,
  reward_embers INTEGER NOT NULL
);

CREATE TABLE quest_progress (
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quest_id INTEGER NOT NULL REFERENCES quests(id),
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (user_id, quest_id)
);

CREATE TABLE config (                   -- tunables without redeploy
  key TEXT PRIMARY KEY, value TEXT NOT NULL
);
-- seed: ember_base=10, ember_new_venue=10, ember_event=5, ember_friend=5,
--       checkin_radius_m=150, phai_thresholds=[0,100,400,1200,3000]
```

## 5. API routes (Worker)

All under `/api`. Auth via session cookie unless marked public.

- `POST /auth/google` — exchange Google credential, create/find user, set cookie.
- `POST /auth/logout`
- `GET  /me` — profile, embers, streak, phai stage, badges, active quests.
- `POST /checkin` — body `{venue_id, lat, lng}`. Worker validates: venue
  exists, distance ≤ radius, rate limits, then inserts, computes embers,
  updates streak/badges/quests atomically. Returns the celebration payload
  (embers earned, new badges, streak, phai stage) in one response — the
  confetti screen renders from this single call.
- `GET  /venues/trending` — public. `{venue_id, count_3h}` list.
- `GET  /venues/:id/here` — friends of caller currently present (≤3h, not
  ghost, not muted). Never returns non-friends.
- `GET  /venues/:id/comments` — public, paginated. Each row: body, created_at,
  author {handle, phai_stage, badge_codes, distinct_venues}. No location data.
- `POST /venues/:id/comments`
- `POST /friends/request`, `POST /friends/accept`, `POST /friends/mute`
- `GET  /board/explorers` — caller's friends ranked by distinct venues this
  month.
- `DELETE /me` — full account deletion (cascades).

## 6. Build order (slices — each ships alone)

**This list is HISTORY, not status.** It is the order the work was planned
in, kept for context. What is actually built is in the STATUS header at the
top of this file, which is the only part of this document that tracks
reality — and the two no longer line up, because slice B and half of slice C
shipped ahead of slice D and E for the reason the header gives. Do not read
"slice C is next" out of this section. Annotations below are what is true as
of 2026-09-14.

1. **Slice A — auth + check-ins + streak.** Google sign-in, POST /checkin with
   server-side GPS validation, monthly streak, the celebration screen (reuse
   the demo's confetti). No social, no comments. THIS ALONE IS LAUNCHABLE.
   — *shipped.*
2. **Slice B — Embers + Phai stages.** XP math, config table, Phai render
   (layered SVG, stage from thresholds). Still no social.
   — *shipped, plus heat, badges, avatar items and the first-sign-in intro.*
3. **Slice C — badges + comments.** Badge engine on the check-in path,
   comments with Phai/badge display.
   — *badges shipped (with slice B). Comments NOT built and still gated:
   they need check-in volume to be worth reading.*
4. **Slice D — friends + presence + Explorer board.** All privacy switches
   ship IN this slice, not after it.
   — *not built, still gated on Gate 2 usage data.*
5. **Slice E — quests.** Monthly definitions + progress on the check-in path.
   — *not built, still gated on Gate 2 usage data.*

### Challenges (idea, not built)

An idea parked against slice E, written down so it is not re-invented from
scratch. Nothing below exists, nothing below is agreed, and no schema or
endpoint here has been designed.

**The idea.** Phase 1 shipped a wheel (`openWheel()` in `js/app.js`): a group
spins one shared `/?wheel=<ids>&seed=<n>` link and everyone who opens it is
handed the same venue. That is already a small group commitment — *we said
we'd go here* — with nothing on the other side of it. A challenge would close
that loop: **spin the wheel together, then actually check in at the venue the
wheel picked, and the check-in is worth a bonus.** It rewards the one thing
the app most wants and currently cannot see — a group deciding, and then
going.

**Why it is not in slice E as written.** Slice E's quests are solo and
monthly ("two new places"), measured entirely from one user's own check-in
rows. A wheel challenge is neither: it is per-outing, and its whole value is
that more than one person turns up. That makes it a different mechanic
sharing a table, not another row in `quests`.

**Gated on friends (slice D), hard.** Without an accepted-friend graph there
is no way to tell a group outing from one person opening their own link on
two devices, and the bonus becomes a thing you grind alone. Slice D is itself
still gated on Gate 2 usage data, so this sits behind two gates, not one.
Build order is not negotiable here: friends first, or not at all.

**Anti-farming, which is most of the work.** A bonus attached to a URL that
anybody can mint is a bonus that will be minted. At minimum, before any of
this is worth designing properly:

- The wheel link is currently *stateless by design* — the ids and the seed
  are the whole thing, nothing is written anywhere. A rewardable wheel cannot
  stay stateless: the server has to have seen the spin before it happened, or
  "I spun and got the bar I was already standing in" is unfalsifiable.
- The server decides the winner, not the client. `wheelWinner()` is
  deterministic in `(seed, pool)` precisely so friends agree — which also
  means a sender can search seeds until the wheel picks whatever they want.
- The bonus is per *outing*, not per person per venue, and it has to survive
  the obvious abuses: the same group re-spinning at the same venue all night,
  one account riding several groups' wheels, a wheel spun from a sofa and
  redeemed a week later.
- It inherits every rule check-in already has — server-side GPS validation
  (§3), the radius from `config`, the existing rate limits — and adds a
  window: a wheel result that is hours old is not a plan any more.
- Embers for this come out of the same `config` table as everything else, so
  the number is tunable without a redeploy and can be set to zero if it turns
  out to be farmable after all.

**Open questions, none answered:** does everyone who opened the link get the
bonus or only those who check in; what happens when the group splits and half
of them go somewhere else; does a declined wheel cost anything (it should
not — punishing a group for changing its mind is the opposite of the point).

Rule: do not start a slice until the previous one is deployed and used.
The exception already taken is recorded in the header: gamification went
ahead of the gate because friends asked for it during validation. That was a
decision about one thing, not a general licence to reorder.

## 7. Explicitly out of scope for phase 2

Paid promotions, Phai cosmetic shop, push notifications, native apps. Phase 3
candidates, all gated on usage.

**Two items were removed from that list on 2026-09-14 because they are
built and live, and leaving them here made the section wrong rather than
aspirational:**

- **Venue owner accounts.** Owners sign in, submit a venue, edit their own
  venue and see it in a review queue: `migrations/006_owners.sql`,
  `functions/api/my-venues.js`, `functions/api/pending.js`,
  `functions/api/venues/[id].js` and the whole of `js/owner.js`. An owner
  submission lands with `pin_status: 'pending'` and no coordinates until Kar
  places the pin by hand (see the pin_status rule in CLAUDE.md).
- **Photo uploads.** Signed Cloudinary uploads for venue photos and for the
  profile picture: `functions/api/upload-signature.js`, plus the uploader in
  `js/owner.js` and the avatar path in `js/avatar.js`.

Neither was a gate being reinterpreted — they are owner-side tooling rather
than the social/usage features Gate 2 is about. The record is corrected
rather than quietly deleted so the next reader can see that the scope moved
and why.

## 8. Identity visual design (locked 2026-07-12, supersedes earlier Phai-as-pet design)

- Avatar: round chibi head-and-shoulders in a circle frame, Muan palette,
  ink #131019 features. Built as layered SVG: base + hair + skin tone +
  outfit + gear layers. Presets are fixed combinations of these layers.
- Flame rank badge: one teardrop flame path scaled/staged as before
  (ember .45 → naga 1.5). Gold inner flame #FFC24B constant at flame
  stage and above; ember/flicker stages render outer flame only at
  reduced opacity. Renders legibly at 12px height (comment rows).
- Gear = separate SVG layers toggled by unlock, never edits to the base.
- Comment row layout: avatar (44px) | name + flame pill | gold receipt
  line "✓ checked in here N×" | body | timestamp. Receipt in gold
  #FFC24B — gold always means earned.
- In API section 5, GET /venues/:id/comments author object becomes:
  {handle, avatar_preset, gear_codes, flame_stage, venue_checkins}.
