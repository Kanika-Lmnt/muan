-- 019: monthly challenges, eight more badges, and "How was it?" reactions.
--
-- DEPLOY ORDER (CLAUDE.md): run this against production BEFORE deploying the
-- code that reads it (functions/api/checkin.js, me.js, react.js):
--   npx wrangler d1 execute muan-db --remote --file=migrations/019_challenges_badges_reactions.sql
--   node scripts/check-schema.js
-- Every statement is IF NOT EXISTS / OR IGNORE, so running it twice is safe.

-- One row per person per month once that month's challenge is done. The
-- challenge itself isn't stored: it's picked from a fixed rotation by the
-- month (functions/api/_challenges.js), so everyone gets the same one and
-- nothing needs setting up each month. The primary key is what makes the
-- +50 embers pay out once.
CREATE TABLE IF NOT EXISTS user_challenges (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month        TEXT NOT NULL,            -- 'YYYY-MM', Vientiane time
  challenge_id TEXT NOT NULL,
  completed_at TEXT NOT NULL,
  embers       INTEGER NOT NULL,
  PRIMARY KEY (user_id, month)
);

-- "How was it?" after a check-in: one reaction per person per place, and a
-- rank among that person's places of the same type, found by asking
-- "better or worse than X?" (functions/api/react.js). rank is a REAL so a
-- place can be slotted between two others without renumbering the rest.
CREATE TABLE IF NOT EXISTS user_reactions (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_id   TEXT NOT NULL,
  reaction   TEXT NOT NULL CHECK (reaction IN ('loved', 'fine', 'not-for-me')),
  rank       REAL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, venue_id)
);

-- eight more badges, so there's still something to chase after the first
-- month (the logic for each is in functions/api/checkin.js)
INSERT OR IGNORE INTO badges (code, name, name_lo, rule, icon) VALUES
 ('cafe-hunter', 'Café Hunter',    'ນັກລ່າຄາເຟ',    'Checked in at 5 different cafés',                     NULL),
 ('bar-hopper',  'Bar Hopper',     'ສາຍຕ່ອງບາຣ໌',   'Two different bars in one night',                     NULL),
 ('sunset',      'Sunset',         'ຕາເວັນຕົກ',     'A riverside place between 5 and 7 pm',                NULL),
 ('early-bird',  'Early Bird',     'ນົກຕື່ນເຊົ້າ',   'A café before 9 am',                                  NULL),
 ('ten-nights',  'Ten Nights Out', 'ສິບຄືນ',        'Out on 10 different nights',                          NULL),
 ('streak-3',    '3-Month Streak', 'ສາມເດືອນຕິດ',   'Out at least once a month, 3 months running',         NULL),
 ('streak-6',    '6-Month Streak', 'ຫົກເດືອນຕິດ',   'Out at least once a month, 6 months running',         NULL),
 ('streak-12',   'Year of Fire',   'ໜຶ່ງປີແຫ່ງໄຟ',  'Out at least once a month, 12 months running',        NULL);
