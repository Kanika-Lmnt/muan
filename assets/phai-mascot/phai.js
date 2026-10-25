// Phai — the Paisaidee flame mascot. Pure SVG string builder, no deps.
// viewBox 0 0 200 240, base of the flame at (100,228) — scale/squash from there.
const C = {
  flame: '#FF5A3C', flameDeep: '#E8462A', core: '#FFC24B', coreHi: '#FFE08A',
  ink: '#131019', cheek: '#FF8A5C', coldFlame: '#7E4A63', coldCore: '#D49A5C',
};
const BODY = 'M100 8 C106 34 132 50 152 76 C174 104 184 136 180 164 C174 204 142 228 100 228 C58 228 26 204 20 164 C16 136 28 112 44 96 C46 112 52 122 62 126 C58 96 72 70 86 50 C92 40 98 26 100 8 Z';
const CORE = 'M100 92 C118 112 150 132 150 170 C150 200 128 216 100 216 C72 216 50 200 50 170 C50 140 76 118 100 92 Z';
function eyes(kind, lx = 0, ly = 0, blink = 0) {
  const L = 82, R = 118, Y = 160;
  if (kind === 'happy') return `<g fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round">
    <path d="M${L - 9} ${Y + 3} Q${L} ${Y - 9} ${L + 9} ${Y + 3}"/><path d="M${R - 9} ${Y + 3} Q${R} ${Y - 9} ${R + 9} ${Y + 3}"/></g>`;
  if (kind === 'closed') return `<g fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round">
    <path d="M${L - 8} ${Y} Q${L} ${Y + 7} ${L + 8} ${Y}"/><path d="M${R - 8} ${Y} Q${R} ${Y + 7} ${R + 8} ${Y}"/></g>`;
  if (kind === 'wink') return `<ellipse cx="${L}" cy="${Y}" rx="7.5" ry="9.5" fill="${C.ink}"/><circle cx="${L - 2.5}" cy="${Y - 3.5}" r="2.8" fill="#fff"/>
    <path d="M${R - 9} ${Y + 1} Q${R} ${Y - 8} ${R + 9} ${Y + 1}" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`;
  const ry = 9.5 * (1 - blink) + 1.2 * blink;
  const hi = blink < .5 ? `<circle cx="${L - 2.5 + lx}" cy="${Y - 3.5 + ly}" r="2.8" fill="#fff"/><circle cx="${R - 2.5 + lx}" cy="${Y - 3.5 + ly}" r="2.8" fill="#fff"/>` : '';
  return `<ellipse cx="${L + lx}" cy="${Y + ly}" rx="7.5" ry="${ry}" fill="${C.ink}"/><ellipse cx="${R + lx}" cy="${Y + ly}" rx="7.5" ry="${ry}" fill="${C.ink}"/>${hi}`;
}
function mouth(kind, lx = 0) {
  const X = 100 + lx * .6, Y = 184;
  if (kind === 'open') return `<path d="M${X - 11} ${Y - 3} Q${X} ${Y + 16} ${X + 11} ${Y - 3} Z" fill="${C.ink}"/><path d="M${X - 5} ${Y + 6} Q${X} ${Y + 2} ${X + 5} ${Y + 6} Q${X} ${Y + 10} ${X - 5} ${Y + 6}Z" fill="${C.flame}"/>`;
  if (kind === 'o') return `<ellipse cx="${X}" cy="${Y + 2}" rx="5" ry="6" fill="${C.ink}"/>`;
  if (kind === 'flat') return `<path d="M${X - 6} ${Y + 1} L${X + 6} ${Y + 1}" stroke="${C.ink}" stroke-width="4.5" stroke-linecap="round"/>`;
  return `<path d="M${X - 9} ${Y - 1} Q${X} ${Y + 9} ${X + 9} ${Y - 1}" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>`;
}
// opts: eyes, mouth, look:[x,y], blink 0..1, tilt deg, sx, sy (squash), cold bool, cheeks bool, sparkle bool, flick 0..1 (tip sway)
function phai(o = {}) {
  const sx = o.sx ?? 1, sy = o.sy ?? 1, tilt = o.tilt ?? 0, [lx, ly] = o.look ?? [0, 0];
  const f = o.cold ? C.coldFlame : C.flame, k = o.cold ? C.coldCore : C.core;
  const sway = o.sway ?? 0; // skews the upper body like a flicker
  const cheeks = o.cheeks !== false && !o.cold ? `<ellipse cx="66" cy="180" rx="8" ry="5" fill="${C.cheek}" opacity=".55"/><ellipse cx="134" cy="180" rx="8" ry="5" fill="${C.cheek}" opacity=".55"/>` : '';
  const zz = o.cold ? `<g fill="${C.core}" font-family="Space Grotesk, sans-serif" font-weight="700" opacity=".85"><text x="160" y="70" font-size="26">z</text><text x="178" y="44" font-size="18">z</text></g>` : '';
  const spark = o.sparkle ? `<g fill="${C.core}"><path d="M30 46 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4z"/><path d="M168 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z"/><circle cx="178" cy="96" r="4"/></g>` : '';
  return `<g transform="translate(100 228) rotate(${tilt}) scale(${sx} ${sy}) skewX(${sway}) translate(-100 -228)">
    <path d="${BODY}" fill="${f}"/>
    <path d="${CORE}" fill="${k}"/>
    <path d="M70 150 C72 128 86 114 96 106" fill="none" stroke="${o.cold ? '#E0C48A' : C.coreHi}" stroke-width="7" stroke-linecap="round" opacity=".9"/>
    <g transform="skewX(${-sway * .7})">${eyes(o.eyes ?? 'open', lx, ly, o.blink ?? 0)}${mouth(o.mouth ?? 'smile', lx)}${cheeks}</g>
  </g>${zz}${spark}`;
}
const svg = (inner, w = 200, h = 240, vb = '0 0 200 240') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${h}">${inner}</svg>`;
const POSES = {
  cold:      { eyes: 'closed', mouth: 'flat', cold: true, sx: .92, sy: .82, cheeks: false },
  resting:   { eyes: 'open', mouth: 'smile' },
  lookingOver: { eyes: 'open', mouth: 'o', look: [7, -2], tilt: -7 },
  delighted: { eyes: 'happy', mouth: 'open', sx: 1.04, sy: 1.06, sparkle: true },
  wink:      { eyes: 'wink', mouth: 'smile', tilt: 5 },
};
module.exports = { phai, svg, POSES, C, BODY, CORE };
