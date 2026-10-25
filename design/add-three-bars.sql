-- NOT A MIGRATION. Do not move this file into migrations/ — it adds rows, not
-- columns, and scripts/check-schema.js reads every migrations/*.sql to decide
-- what production D1 must contain (same reasoning as design/events-repeat.sql
-- and design/remove-night-market-photo.sql). Nothing here has been run,
-- against --remote or anywhere.
--
-- Three new bars. Coordinates supplied by Kar on 2026-10-25; nothing else
-- about any of them has been sourced yet, so almost every column is NULL on
-- purpose. CLAUDE.md: "Never invent venue details: no made-up hours, prices,
-- events, addresses, or coordinates" and "New venues/events get verified:
-- false until the owner confirms them from a real source."
--
--   Moonlight Lounge          17.9645272, 102.6088799
--   Cocoon Bar                17.9659403, 102.6053832
--   The Office Bar & Tapas    17.9676534, 102.6011558
--
-- COLUMNS: checked against the live shape of `venues` as of migration 018 —
-- migrations/005_venues.sql (base), 009_pin_status.sql (the table rebuild that
-- folded in 007's location_review and 008's signature and relaxed lat/lng to
-- nullable), then 010 rejection_reason, 011 hours_note, 013 vibe, 016 outdoor,
-- 017 why/rating/review_count, 018 logo. Every one of those 31 columns is
-- named explicitly below, including the ones set to NULL, so a future column
-- added to the table shows up as a diff here rather than being silently
-- defaulted.
--
-- WHAT EACH NULL MEANS, and why it is not a placeholder:
--   short_name   the names are already short; cards use short_name || name
--                (plainListCardHtml(), rowCard() in js/app.js), so NULL just
--                means "use the real name". Making one up is a display
--                decision for Kar, not a fact to be derived.
--   name_lo      *** FLAGGED — see the note at the bottom of this file. ***
--   area         NULL, not derived from the coordinates. "area" is the
--                human-readable neighbourhood line on every card ("Quai Fa
--                Ngum, riverside"); reverse-geocoding a lat/lng into one and
--                presenting it as sourced is exactly the invented address the
--                data rules forbid. venueLine(v, v.area || '') already renders
--                fine without it.
--   short        the one-line tagline. No source, so no tagline — not even a
--                generic "cocktail bar".
--   description  same.
--   hours        NULL = unknown/unconfirmed, and the venue detail says exactly
--                that ("hours not yet confirmed"). statusPillHtml() returns ''
--                for a venue with no hours, so no open/closed pill is drawn
--                and nothing claims either way. Kar confirms these.
--   hours_note   only read when hours IS NULL, and only when there is a known
--                REASON for the absence rather than nobody having looked
--                (migrations/011_hours_note.sql). Nobody has looked, so NULL.
--   contact      no phone number has been sourced. CLAUDE.md: "never invent a
--                number."
--   parking      "Omit the field entirely rather than guessing — a wrong
--                parking note sends someone circling the block."
--   outdoor      TRI-STATE, and this is the state that must not be 0. NULL =
--                nobody has looked; 0 would be the positive claim "rain does
--                not change the plan", which nobody has checked. The rain note
--                on a card is skipped entirely for NULL, so the venue claims
--                neither way (migrations/016_outdoor.sql).
--   vibe         Kar-only editorial tags; none assigned.
--   why          Kar-written; not written.
--   rating /     Paisaidee's OWN reviews only. There are none, and
--   review_count check-data.js rule V10 fails a row with a rating and no
--                review_count > 0 — never an aggregator's number.
--   logo         no mark has been supplied.
--   status       NULL = normal (not "opening-soon").
--   signature    no signature items sourced.
--   photos       '[]', as asked. Already a live state (night-street, and
--                vte-night-market once design/remove-night-market-photo.sql
--                runs): every card falls back to the generated monogram tile
--                via venueTileUri(), and collagePhotosHtml()'s !photos.length
--                branch handles the detail hero. No hotlinked or guessed
--                image — "No photo > wrong photo."
--
-- WHAT IS SET, and why each is not an invention:
--   type         'bar' — one of VENUE_TYPES in functions/api/_venue-validation.js
--                ('bar', 'cafe', 'restaurant', 'venue'), and what Kar asked for.
--   lat / lng    Kar's coordinates, verbatim, to all seven decimals.
--   pin_status   'placed'. check-data.js V5: "placed" means real,
--                Kar-confirmed lat/lng — which is precisely where these came
--                from. NOT 'pending': pending is for an owner submission with
--                lat/lng NULL awaiting Kar, and these have Kar's own pin
--                already (migrations/009_pin_status.sql). A pin can be real
--                while the details are unconfirmed; the two flags are about
--                different things.
--   verified     0, as asked. The detail sheet then renders "details
--                unconfirmed — hours may differ" (openVenue() in js/app.js).
--   source       free text, and it says exactly and only what is true: where
--                the coordinates came from and that nothing else is sourced.
--                check-data.js V1 only REQUIRES a source when verified = 1, so
--                this is not there to satisfy a check — it is there so the row
--                carries its own provenance.
--   links        {"maps": ...} — the standard Google Maps *directions* deep
--                link, mechanically derived from Kar's own coordinates and
--                nothing else. Not a claim about the venue: it is the same
--                destination=<lat>,<lng> URL every other row carries, and
--                js/app.js only renders links.maps when it is present. The
--                legacy "facebook": "" key that older rows have is deliberately
--                NOT copied — an empty string is a placeholder, and the app
--                skips a falsy links.facebook anyway.
--   location_review / checkin_radius_m / rejection_reason
--                0 and NULL respectively: the table's own defaults, named
--                explicitly rather than relied on.
--
-- RUN (Kar, --remote, as CLAUDE.md requires for anything production):
--   wrangler d1 execute muan-db --remote --file=design/add-three-bars.sql
--   node scripts/export-venues.js     # refresh the data/venues.json mirror
--   node scripts/check-data.js        # expect: OK - 33 venues
--
-- INSERT, not INSERT OR REPLACE: if one of these ids somehow already exists,
-- this should fail loudly rather than overwrite a row that may have been
-- filled in since.

INSERT INTO venues (
  id, name, short_name, name_lo, type, lat, lng, area, short, description,
  photos, hours, hours_note, contact, parking, links, verified, status, source,
  checkin_radius_m, updated_at, location_review, signature, pin_status,
  rejection_reason, vibe, outdoor, why, rating, review_count, logo
) VALUES
  (
    'moonlight-lounge',
    'Moonlight Lounge',
    NULL, NULL,
    'bar',
    17.9645272, 102.6088799,
    NULL, NULL, NULL,
    '[]',
    NULL, NULL, NULL, NULL,
    '{"maps":"https://www.google.com/maps/dir/?api=1&destination=17.9645272,102.6088799"}',
    0, NULL,
    'Coordinates supplied by Kar, 2026-10-25. Nothing else about this venue has been sourced yet.',
    NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, NULL, 'placed',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    'cocoon-bar',
    'Cocoon Bar',
    NULL, NULL,
    'bar',
    17.9659403, 102.6053832,
    NULL, NULL, NULL,
    '[]',
    NULL, NULL, NULL, NULL,
    '{"maps":"https://www.google.com/maps/dir/?api=1&destination=17.9659403,102.6053832"}',
    0, NULL,
    'Coordinates supplied by Kar, 2026-10-25. Nothing else about this venue has been sourced yet.',
    NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, NULL, 'placed',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL
  ),
  (
    'office-bar-tapas',
    'The Office Bar & Tapas',
    NULL, NULL,
    'bar',
    17.9676534, 102.6011558,
    NULL, NULL, NULL,
    '[]',
    NULL, NULL, NULL, NULL,
    '{"maps":"https://www.google.com/maps/dir/?api=1&destination=17.9676534,102.6011558"}',
    0, NULL,
    'Coordinates supplied by Kar, 2026-10-25. Nothing else about this venue has been sourced yet.',
    NULL, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 0, NULL, 'placed',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL
  );

-- Verify (read-only; run separately, not as part of the file above):
--   wrangler d1 execute muan-db --remote \
--     --command="SELECT id, name, name_lo, type, lat, lng, verified, pin_status, photos, hours FROM venues WHERE id IN ('moonlight-lounge','cocoon-bar','office-bar-tapas');"

-- ============================================================================
-- FLAGGED: name_lo is NULL on all three, and that is a decision, not an
-- oversight.
--
-- Every one of the 30 existing venues carries a Lao name, and the venue detail
-- renders "<Lao> · <English>" as its title (openVenue() in js/app.js:
-- `v.name_lo ? ... : ''`). NULL and '' are both falsy there, so these three
-- will show the English name alone, with no empty separator and no gap — the
-- same code path, just one branch not taken. Lao search still works: the
-- search matcher reads name_lo through hit([...]) and a null simply never
-- matches, it does not throw. No check in scripts/check-data.js covers
-- name_lo, and the column is nullable (migrations/005_venues.sql), with
-- functions/api/venues.js's own insert writing `fields.name_lo || null`. So
-- NULL is the column's real "blank", and it is valid everywhere.
--
-- Why not fill it in: "Moonlight Lounge", "Cocoon Bar" and "The Office Bar &
-- Tapas" are English names, and a Lao string for them would be one of two
-- different things — a transliteration I made up (ມູນລາຍ, ໂຄຄູນ, ...), or the
-- venue's actual registered Lao name, which only the venue knows. The first is
-- a guess dressed as data and would read as wrong to anyone Lao-first, which
-- is the audience CLAUDE.md puts first; the second has to come from the venue.
-- Picking either without being asked is the same move as inventing an address.
--
-- NEEDED FROM YOU: the Lao name for each, if these places use one, at the same
-- time as the hours. If a venue genuinely trades under its English name only,
-- leaving name_lo NULL permanently is the honest answer and nothing needs
-- changing.
-- ============================================================================
