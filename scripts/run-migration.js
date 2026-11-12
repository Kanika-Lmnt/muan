#!/usr/bin/env node
// Runs one migration file against production D1:
//   node scripts/run-migration.js migrations/019_challenges_badges_reactions.sql
//
// Why not `wrangler d1 execute --remote --file=...`: --file goes through
// Cloudflare's D1 *import* API, and for this project (no wrangler.toml —
// Pages is configured in the dashboard) that call fails with
// "Authentication error [code: 10000]" even though the login is fine.
// --command goes through the normal query API, the same one
// scripts/check-schema.js uses, and that works. So this reads the file,
// strips the comments, and sends the statements with --command.
//
// Afterwards it reads back any rows the migration INSERTed with Lao text
// and checks they arrived intact, because Lao has to pass through the
// Windows command line on the way, and a mangled ໄປໃສດີ would otherwise
// only be noticed in the app. Then run `node scripts/check-schema.js`.
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DB_NAME = 'muan-db';
const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error('Usage: node scripts/run-migration.js migrations/<file>.sql');
  process.exit(1);
}

// drop "-- ..." comments, but not a "--" inside a 'quoted string'
function stripComments(sql) {
  let out = '', inStr = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (inStr) {
      out += c;
      if (c === "'") inStr = false;          // '' (escaped quote) just toggles twice
    } else if (c === "'") {
      inStr = true; out += c;
    } else if (c === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      out += '\n';
    } else {
      out += c;
    }
  }
  return out;
}

const sql = stripComments(fs.readFileSync(file, 'utf8'))
  .split('\n').map(l => l.trim()).filter(Boolean).join(' ')
  .replace(/\s+/g, ' ').trim();

// the statement goes inside "..." on the command line
if (sql.includes('"')) {
  console.error('This migration has a double quote (") in its SQL, which can\'t be passed with --command. Use single quotes.');
  process.exit(1);
}

console.log(`Running ${path.basename(file)} against production D1 (${DB_NAME})...`);
try {
  execSync(`npx wrangler d1 execute ${DB_NAME} --remote --command "${sql}"`, { stdio: 'inherit' });
} catch (e) {
  console.error('\nThe migration failed (see above). Nothing after this point ran.');
  process.exit(1);
}

// check Lao text came through: every 'quoted' value with Lao letters in it
// should now be findable in the database exactly as written in the file
const lao = [...sql.matchAll(/'([^']*[\u0E80-\u0EFF][^']*)'/g)].map(m => m[1]);
const tables = [...new Set([...sql.matchAll(/INSERT\s+(?:OR\s+\w+\s+)?INTO\s+(\w+)/gi)].map(m => m[1]))];
if (lao.length && tables.length) {
  let found = new Set();
  for (const t of tables) {
    const raw = execSync(`npx wrangler d1 execute ${DB_NAME} --remote --json --command "SELECT * FROM ${t}"`,
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    // wrangler can print a notice line before the JSON; start at the JSON
    for (const row of JSON.parse(raw.slice(raw.indexOf('[')))[0]?.results || []) {
      for (const v of Object.values(row)) if (typeof v === 'string') found.add(v);
    }
  }
  const missing = lao.filter(s => !found.has(s));
  if (missing.length) {
    console.error(`\n✗ ${missing.length} Lao value(s) didn't arrive intact, e.g. "${missing[0]}".`);
    console.error('  The Windows command line likely changed the text. Tell Claude before deploying.');
    process.exit(1);
  }
  console.log(`\n✓ All ${lao.length} Lao text values arrived intact.`);
}
console.log('Done. Now run: node scripts/check-schema.js');
