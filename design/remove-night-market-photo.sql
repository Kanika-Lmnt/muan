-- NOT A MIGRATION. Do not move this file into migrations/ — it is a one-off
-- data edit, and scripts/check-schema.js reads every migrations/*.sql to work
-- out what columns production must have (see design/events-repeat.sql for the
-- same reasoning). Nothing here has been run, against --remote or anywhere.
--
-- WHY: "v1785192698/night_market_hrrub8" is the only photo on
-- vte-night-market and it carries a stock-library watermark, which is not a
-- photo of the venue — it is somebody else's asset with their mark across it.
-- CLAUDE.md: "No photo > wrong photo."
--
-- WHAT THIS LEAVES BEHIND: the venue ends up with photos = '[]'. That is an
-- established, already-live state, not a new one — night-street has had an
-- empty array since it was added — and every consumer already falls back to
-- the generated monogram tile: venueTileUri() via plainListCardHtml(),
-- rowCard(), sectionCard() and collagePhotosHtml()'s !photos.length branch in
-- js/app.js. vte-night-market is in picks.json's busy_venue_ids, so it does
-- still appear in Home's "Busy spots" with that monogram tile.
--
-- WRITTEN AS A FILTER, NOT AS "SET photos = '[]'": the statement removes that
-- one public ID and keeps whatever else is in the array. It happens to be the
-- only entry today, but written this way it stays correct if a real photo of
-- the market is added before anyone gets round to running it, and it cannot
-- silently wipe one.
--
-- RUN (Kar, --remote, as CLAUDE.md requires for anything production):
--   wrangler d1 execute muan-db --remote --file=design/remove-night-market-photo.sql
--   node scripts/export-venues.js     # refresh the data/venues.json mirror
--   node scripts/check-data.js        # V4 photo-shape rules still pass
--
-- The export matters here: data/venues.json is bundled into
-- functions/api/venues.js as the outage fallback AND fetched directly by
-- index.html for first paint, so until it is regenerated the watermarked
-- photo is still what a cold load and any D1 outage would show.

UPDATE venues
SET photos = COALESCE(
      (SELECT json_group_array(value)
         FROM json_each(venues.photos)
        WHERE value <> 'v1785192698/night_market_hrrub8'),
      '[]'
    ),
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE id = 'vte-night-market';

-- Verify (read-only; run it separately, not as part of the file above):
--   wrangler d1 execute muan-db --remote \
--     --command="SELECT id, photos FROM venues WHERE id = 'vte-night-market';"
-- Expect: []
