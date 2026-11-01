// The whole repository is the Pages output directory ("/", no build step),
// so without this every file in it is publicly downloadable — project
// notes (CLAUDE.md, design/autonomous-run.md), SQL, scripts, the Functions'
// own source and design files. None of it holds a secret today, but it is
// internal and some of it names accounts. Only the paths listed in
// _routes.json reach this Function at all (static assets stay free and
// fast); of those, anything under an internal prefix gets a plain 404 and
// everything else is passed through untouched.
const INTERNAL = [
  /^\/(CLAUDE|PHASE2|README)\.md$/i,
  /^\/schema\.sql$/i,
  /^\/(design|marketing|migrations|scripts|functions|\.claude|\.wrangler|\.git)(\/|$)/i,
];

export async function onRequest(context) {
  const path = new URL(context.request.url).pathname;
  if (INTERNAL.some((re) => re.test(path))) {
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  return context.next();
}
