// Builds one 1080x1920 SVG frame of the Paisaidee advert for time t (seconds).
// Deterministic: same t -> same frame, so it can be stepped frame by frame.
const { phai } = require('./phai');
const PINS = require('./pins.json');

const W = 1080, H = 1920, DUR = 17.5;
const K = { ink: '#131019', ink2: '#1C1726', ink3: '#241E31', ink4: '#2E2740', flame: '#FF5A3C',
  gold: '#FFC24B', teal: '#1FBF9C', bone: '#F5F1E8', mute: '#948F9D', violet: '#7C5CE0' };
const PIN_C = { bar: K.flame, cafe: K.teal, venue: K.violet };

// Lao lines — TODO(lao): Kar to check every one of these before posting.
const COPY = {
  s1lo: 'ຄືນນີ້ໄປໃສດີ?', s1en: 'Where should we go tonight?',
  s2lo: 'ຄາເຟ · ບາ · ອີເວັນ ທົ່ວວຽງຈັນ', s2en: 'Cafés, bars and events across Vientiane',
  s3lo: 'ຮູ້ກ່ອນວ່າຮ້ານໃດເປີດຢູ່', s3en: 'Know what’s open before you head out',
  s4lo: 'ເຊັກອິນ ໃຫ້ໄຟລຸກ', s4en: 'Check in. Keep your flame burning.',
  url: 'muan.pages.dev',
};

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = p => 1 - Math.pow(1 - p, 3);
const easeInOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
const back = p => { const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
// damped spring 0 -> 1 with overshoot
const spring = p => p <= 0 ? 0 : 1 - Math.exp(-7 * p) * Math.cos(13 * p);
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const LO = `font-family="Space Grotesk, Noto Sans Lao" font-weight="700"`;
const EN = `font-family="Space Grotesk" font-weight="500"`;
function caption(lo, en, t, a, b, y = 300) {
  const pin = easeOut(prog(t, a, a + .45)), pout = prog(t, b - .3, b);
  const o = pin * (1 - pout); if (o <= 0) return '';
  const dy = (1 - pin) * 40 - pout * 20;
  return `<g opacity="${o}" transform="translate(0 ${dy})">
    <text x="540" y="${y}" text-anchor="middle" ${LO} font-size="76" fill="${K.bone}">${lo}</text>
    <text x="540" y="${y + 74}" text-anchor="middle" ${EN} font-size="42" fill="${K.mute}">${en}</text></g>`;
}
// mascot placed with its base at (x,y), size s (1 = 200x240 px)
function mascot(x, y, s, o, t, extra = '') {
  const sway = 2.6 * Math.sin(t * 2 * Math.PI * 1.4) + 1.2 * Math.sin(t * 2 * Math.PI * 3.1);
  const bt = (t % 3.4); const blink = bt > 3.2 ? Math.sin((bt - 3.2) / .2 * Math.PI) : 0;
  const breath = 1 + .025 * Math.sin(t * 2 * Math.PI * .9);
  return `<g transform="translate(${x} ${y}) scale(${s}) translate(-100 -228)" ${extra}>
    ${phai({ sway, blink: o.eyes && o.eyes !== 'open' ? 0 : blink, ...o, sy: (o.sy ?? 1) * breath })}</g>`;
}
function glow(x, y, r, a) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#glow)" opacity="${a}"/>`;
}

// ---- map projection over the central cluster ----
const B = { w: 102.578, e: 102.652, s: 17.938, n: 17.99 };
const MAP = { x: 70, y: 560, w: 940, h: 820 };
const proj = (lng, lat) => [MAP.x + (lng - B.w) / (B.e - B.w) * MAP.w, MAP.y + (B.n - lat) / (B.n - B.s) * MAP.h];
const RIVER = [[102.570, 17.972], [102.585, 17.966], [102.597, 17.9615], [102.607, 17.9595], [102.618, 17.955], [102.630, 17.947], [102.645, 17.939], [102.66, 17.934]].map(p => proj(...p));
function riverPath() {
  let d = `M${RIVER[0][0]} ${RIVER[0][1]}`;
  for (let i = 1; i < RIVER.length; i++) { const [x0, y0] = RIVER[i - 1], [x1, y1] = RIVER[i]; d += ` Q${x0} ${y0} ${(x0 + x1) / 2} ${(y0 + y1) / 2}`; }
  return d + ` L${RIVER.at(-1)[0]} ${RIVER.at(-1)[1]}`;
}
const ROADS = [
  [[102.585, 17.975], [102.6, 17.968], [102.62, 17.962], [102.645, 17.958]],
  [[102.6, 17.985], [102.604, 17.97], [102.606, 17.96]],
  [[102.612, 17.988], [102.618, 17.97], [102.622, 17.955]],
  [[102.59, 17.985], [102.61, 17.978], [102.635, 17.974], [102.652, 17.97]],
  [[102.625, 17.99], [102.63, 17.975], [102.64, 17.96]],
].map(r => 'M' + r.map(p => proj(...p).join(' ')).join(' L'));

function pinSvg(x, y, c, s) {
  return `<g transform="translate(${x} ${y}) scale(${s}) translate(-18 -44)">
    <path d="M18 2 C9 2 3 8.5 3 16.5 C3 26 13 35 18 42 C23 35 33 26 33 16.5 C33 8.5 27 2 18 2Z" fill="${c}" stroke="${K.ink}" stroke-width="2.5"/>
    <circle cx="18" cy="16.5" r="5.5" fill="${K.ink}"/></g>`;
}
function mapLayer(t) {
  const a = easeOut(prog(t, 3.2, 3.8)) * (1 - .55 * easeInOut(prog(t, 7.0, 7.6))) * (1 - .85 * easeInOut(prog(t, 11.9, 12.4))) * (1 - prog(t, 14.0, 14.5));
  if (a <= 0) return '';
  const zoom = lerp(1.06, 1, easeOut(prog(t, 3.2, 4.4)));
  let pins = '';
  // stagger west -> east so they "light up" across the city
  const order = PINS.map((p, i) => ({ ...p, i })).sort((a, b) => a.lng - b.lng);
  order.forEach((p, k) => {
    const st = 3.6 + k * .085; const pp = prog(t, st, st + .55);
    if (pp <= 0) return;
    const [x, y] = proj(p.lng, p.lat);
    const s = 1.35 * spring(pp); const drop = (1 - easeOut(pp)) * -60;
    pins += pinSvg(x, y + drop, PIN_C[p.t] || K.violet, s);
  });
  const legend = [['bar', 'ບາ · Bars'], ['cafe', 'ຄາເຟ · Cafés'], ['venue', 'ອີເວັນ · Events']].map(([k, l], i) =>
    `<g transform="translate(${150 + i * 290} 1460)"><circle r="12" fill="${PIN_C[k]}"/><text x="26" y="12" ${LO} font-size="34" fill="${K.bone}">${l}</text></g>`).join('');
  const la = easeOut(prog(t, 5.6, 6.1));
  return `<g opacity="${a}" transform="translate(540 970) scale(${zoom}) translate(-540 -970)">
    <rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}" rx="48" fill="${K.ink2}"/>
    <clipPath id="mc"><rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}" rx="48"/></clipPath>
    <g clip-path="url(#mc)">
      ${ROADS.map(d => `<path d="${d}" fill="none" stroke="${K.ink4}" stroke-width="9" stroke-linecap="round"/>`).join('')}
      <path d="${riverPath()}" fill="none" stroke="#1E2B3F" stroke-width="120" stroke-linecap="round"/>
      <path d="${riverPath()}" fill="none" stroke="#25364F" stroke-width="56" stroke-linecap="round" opacity=".7"/>
      <text x="${MAP.x + 90}" y="${MAP.y + MAP.h - 70}" ${LO} font-size="30" fill="#4A6080" transform="rotate(-14 ${MAP.x + 90} ${MAP.y + MAP.h - 70})">ແມ່ນ້ຳຂອງ · Mekong</text>
      ${pins}
    </g>
    <rect x="${MAP.x}" y="${MAP.y}" width="${MAP.w}" height="${MAP.h}" rx="48" fill="none" stroke="${K.ink4}" stroke-width="3"/>
    <g opacity="${la}">${legend}</g></g>`;
}

// ---- venue card ----
function cardLayer(t, pressP, popP) {
  const pin = prog(t, 7.0, 7.9); if (pin <= 0) return '';
  const out = prog(t, 11.9, 12.4);
  const y = lerp(1950, 760, back(pin)) + easeInOut(out) * 260;
  const o = 1 - out;
  const cx = 110, w = 860;
  // illustrated "rooftop at night" panel — no photograph stands in for the venue's own
  const r = rng(7); let windows = '';
  const bld = [[30, 210, 120], [150, 150, 150], [300, 250, 110], [410, 120, 160], [570, 190, 130], [700, 160, 160]];
  bld.forEach(([bx, bh, bw]) => {
    windows += `<rect x="${bx}" y="${380 - bh}" width="${bw}" height="${bh}" fill="#241C38"/>`;
    for (let wy = 380 - bh + 22; wy < 360; wy += 34) for (let wx = bx + 16; wx < bx + bw - 20; wx += 30)
      if (r() > .45) windows += `<rect x="${wx}" y="${wy}" width="12" height="16" rx="2" fill="${r() > .3 ? K.gold : K.flame}" opacity="${.35 + r() * .5}"/>`;
  });
  let lights = '';
  for (let i = 0; i < 14; i++) { const lx = 40 + i * 58, ly = 70 + 18 * Math.sin(i * .9); const tw = .55 + .45 * Math.sin(t * 5 + i * 1.7);
    lights += `<circle cx="${lx}" cy="${ly}" r="9" fill="${K.gold}" opacity="${tw}"/><circle cx="${lx}" cy="${ly}" r="22" fill="${K.gold}" opacity="${tw * .15}"/>`; }
  const pr = pressP; // 0..1 press depth
  const btnY = 690 + 8 * pr;
  return `<g opacity="${o}" transform="translate(${cx} ${y})">
    <rect x="0" y="0" width="${w}" height="860" rx="44" fill="${K.ink3}"/>
    <clipPath id="ph"><rect x="0" y="0" width="${w}" height="380" rx="44"/><rect x="0" y="44" width="${w}" height="336"/></clipPath>
    <g clip-path="url(#ph)">
      <rect width="${w}" height="380" fill="url(#sky)"/>
      <circle cx="700" cy="110" r="46" fill="#F5E9C8" opacity=".9"/>
      ${windows}
      <path d="M20 66 Q 430 140 840 60" fill="none" stroke="#5A4A70" stroke-width="3"/>
      ${lights}
      <rect y="330" width="${w}" height="50" fill="#1A1428"/>
    </g>
    <g transform="translate(32 32)"><rect width="300" height="62" rx="31" fill="${K.teal}"/>
      <circle cx="32" cy="31" r="9" fill="${K.ink}" opacity="${.6 + .4 * Math.sin(t * 6)}"/>
      <text x="54" y="42" ${LO} font-size="30" fill="${K.ink}">ເປີດຢູ່ · Open now</text></g>
    <text x="40" y="460" font-family="Space Grotesk" font-weight="700" font-size="54" fill="${K.bone}">Tipsy Elephant Rooftop</text>
    <text x="40" y="518" ${LO} font-size="36" fill="${K.mute}">ທິບຊີ ເອເລແຟນ · rooftop bar</text>
    <g transform="translate(40 560)">
      <rect width="330" height="64" rx="32" fill="none" stroke="${K.teal}" stroke-width="3"/>
      <text x="165" y="43" text-anchor="middle" ${EN} font-size="32" fill="${K.teal}">until midnight</text>
      <rect x="350" width="200" height="64" rx="32" fill="none" stroke="${K.ink4}" stroke-width="3"/>
      <text x="450" y="43" text-anchor="middle" ${EN} font-size="32" fill="${K.bone}">650 m</text></g>
    <rect x="40" y="${698}" width="${w - 80}" height="120" rx="60" fill="#B23A22"/>
    <rect x="40" y="${btnY - 8 + 0}" width="${w - 80}" height="120" rx="60" fill="${K.flame}"/>
    <text x="${w / 2}" y="${btnY + 70}" text-anchor="middle" ${LO} font-size="44" fill="${K.ink}">ເຊັກອິນ · Check in</text>
    ${popP > 0 ? `<rect x="40" y="${btnY - 8}" width="${w - 80}" height="120" rx="60" fill="none" stroke="${K.gold}" stroke-width="${6 * (1 - popP)}" opacity="${1 - popP}"/>` : ''}
  </g>`;
}

function confetti(t, x0, y0, start) {
  const p = t - start; if (p < 0 || p > 2.2) return '';
  const r = rng(42); let s = '';
  const cols = [K.flame, K.gold, K.teal, K.bone, K.violet];
  for (let i = 0; i < 70; i++) {
    const ang = -Math.PI / 2 + (r() - .5) * Math.PI * 1.5, sp = 900 + r() * 1100;
    const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
    const x = x0 + vx * p * (1 - p * .25), y = y0 + vy * p + 1300 * p * p;
    const rot = (r() * 360 + p * 720 * (r() > .5 ? 1 : -1));
    const o = 1 - prog(p, 1.3, 2.2); const c = cols[i % cols.length];
    s += r() > .5 ? `<rect x="-9" y="-5" width="18" height="10" rx="3" fill="${c}" opacity="${o}" transform="translate(${x} ${y}) rotate(${rot})"/>`
      : `<circle cx="${x}" cy="${y}" r="${6 + r() * 5}" fill="${c}" opacity="${o}"/>`;
  }
  return s;
}

function logoLayer(t) {
  const p = prog(t, 14.5, 15.2); if (p <= 0) return '';
  const s = spring(p) * 3.2;
  const tp = easeOut(prog(t, 14.9, 15.5)), up = easeOut(prog(t, 15.3, 15.9)), mp = easeOut(prog(t, 15.6, 16.3));
  return `<g transform="translate(540 700) scale(${s}) translate(-36 -44)">
      <path d="M36 4 C18 4 6 17 6 33 C6 52 26 70 36 84 C46 70 66 52 66 33 C66 17 54 4 36 4 Z" fill="${K.flame}"/>
      <path d="M36 20 C36 20 26 30 26 40 C26 47.5 30.5 53 36 53 C41.5 53 46 47.5 46 40 C46 35 42 31 41 27 C40 31 37 32.5 36 36 C34.5 32 36 24 36 20 Z" fill="${K.ink}"/>
      <path d="M36 34 C36 34 32 38.5 32 42.5 C32 46 34 48 36 48 C38 48 40 46 40 42.5 C40 39.5 36.8 37.5 36 34 Z" fill="${K.gold}"/></g>
    <g opacity="${tp}" transform="translate(0 ${(1 - tp) * 40})">
      <text x="540" y="1040" text-anchor="middle" ${LO} font-size="150" fill="${K.bone}">ໄປໃສດີ</text></g>
    <g opacity="${up}"><text x="540" y="1130" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="44" letter-spacing="14" fill="${K.mute}">PAISAIDEE</text></g>
    <g opacity="${mp}" transform="translate(0 ${(1 - mp) * 30})">
      <rect x="290" y="1210" width="500" height="96" rx="48" fill="${K.flame}"/>
      <rect x="290" y="1200" width="500" height="96" rx="48" fill="${K.flame}"/>
      <text x="540" y="1262" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="40" fill="${K.ink}">${COPY.url}</text></g>`;
}

function frame(t) {
  // ---- mascot path through the piece ----
  let mx, my, ms, mo, mopa = 1;
  const land = .75; // ember lands
  if (t < 3.2) {
    const pop = spring(prog(t, land, land + 1.1));
    mx = 540; my = 1180; ms = 2.2 * (t < land ? 0 : 1);
    // squash on landing, stretch on rise
    const sq = t < land ? 1 : 1 + .22 * Math.sin(prog(t, land, land + .5) * Math.PI) * (1 - prog(t, land, land + .5));
    mo = { eyes: 'open', mouth: t > 1.6 ? 'smile' : 'o', sx: pop * sq, sy: pop / sq };
    if (t > 2.4 && t < 3.0) mo = { ...mo, eyes: 'happy', mouth: 'open' };
  } else if (t < 7.0) {
    const p = easeInOut(prog(t, 3.2, 3.9));
    mx = lerp(540, 905, p); my = lerp(1180, 630, p); ms = lerp(2.2, .9, p);
    mo = { eyes: 'open', mouth: 'o', look: [-6, 5], tilt: -10 * p };
  } else if (t < 11.4) {
    const p = easeInOut(prog(t, 7.0, 7.9));
    mx = lerp(905, 860, p); my = lerp(630, 790, p); ms = lerp(.9, 1.0, p);
    mo = t > 8.2 ? { eyes: 'happy', mouth: 'open', tilt: 6 } : { eyes: 'open', mouth: 'o', look: [-4, 6], tilt: -6 };
    if (t > 10.2) mo = { eyes: 'open', mouth: 'smile', look: [-5, 7], tilt: -4 };
  } else if (t < 14.2) {
    // heat rises: grows, brightens, sparkles
    const g = spring(prog(t, 11.7, 12.9));
    mx = lerp(860, 540, easeInOut(prog(t, 11.7, 12.5))); my = lerp(790, 1230, easeInOut(prog(t, 11.7, 12.5)));
    ms = lerp(1.0, 2.3, g);
    mo = { eyes: 'happy', mouth: 'open', sparkle: t > 12.2, tilt: 4 * Math.sin(t * 6) };
    if (t < 11.7) mo = { eyes: 'open', mouth: 'o', look: [-5, 7] };
  } else {
    const p = easeInOut(prog(t, 14.2, 15.0));
    mx = lerp(540, 830, p); my = lerp(1230, 1600, p); ms = lerp(2.3, 1.1, p);
    mo = t > 15.4 ? { eyes: 'wink', mouth: 'smile', tilt: 6 } : { eyes: 'happy', mouth: 'smile' };
  }

  // falling ember before landing
  let ember = '';
  if (t < land + .05) {
    const p = prog(t, 0.05, land); const ey = lerp(-40, 1150, p * p);
    ember = `<circle cx="540" cy="${ey}" r="16" fill="${K.gold}"/><circle cx="540" cy="${ey}" r="44" fill="${K.gold}" opacity=".18"/>
      <path d="M540 ${ey - 16} L540 ${ey - 140}" stroke="${K.gold}" stroke-width="10" stroke-linecap="round" opacity=".25"/>`;
  }
  // landing ring
  let ring = '';
  const rp = prog(t, land, land + .7);
  if (rp > 0 && rp < 1) ring = `<ellipse cx="540" cy="1185" rx="${80 + 260 * easeOut(rp)}" ry="${18 + 50 * easeOut(rp)}" fill="none" stroke="${K.gold}" stroke-width="${8 * (1 - rp)}" opacity="${1 - rp}"/>`;

  const pressP = t > 11.35 && t < 11.75 ? Math.sin(prog(t, 11.35, 11.75) * Math.PI) : 0;
  const popP = prog(t, 11.55, 12.2);
  const heat = easeOut(prog(t, 11.7, 12.6)) * (1 - prog(t, 14.0, 14.6));

  // +25 embers
  let plus = '';
  const pp = prog(t, 11.7, 13.4);
  if (pp > 0 && pp < 1) {
    const o = Math.min(1, pp * 5) * (1 - prog(pp, .7, 1));
    plus = `<g opacity="${o}" transform="translate(540 ${lerp(1440, 1370, easeOut(pp))})">
      <rect x="-210" y="-70" width="420" height="104" rx="52" fill="${K.ink3}" stroke="${K.gold}" stroke-width="4"/>
      <text x="0" y="5" text-anchor="middle" font-family="Space Grotesk" font-weight="700" font-size="56" fill="${K.gold}">+25 embers</text></g>`;
  }

  // backdrop glow
  const bgGlow = glow(540, 900, 900, .35 + .35 * heat);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow"><stop offset="0" stop-color="${K.flame}" stop-opacity=".55"/><stop offset=".55" stop-color="${K.flame}" stop-opacity=".08"/><stop offset="1" stop-color="${K.flame}" stop-opacity="0"/></radialGradient>
    <radialGradient id="mglow"><stop offset="0" stop-color="${K.gold}" stop-opacity=".6"/><stop offset="1" stop-color="${K.flame}" stop-opacity="0"/></radialGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1F4A"/><stop offset="1" stop-color="#4A2440"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${K.ink}"/>
  ${bgGlow}
  ${caption(COPY.s1lo, COPY.s1en, t, 1.3, 3.3, 420)}
  ${mapLayer(t)}
  ${caption(COPY.s2lo, COPY.s2en, t, 3.6, 7.1, 250)}
  ${caption(COPY.s3lo, COPY.s3en, t, 7.4, 11.3, 250)}
  ${caption(COPY.s4lo, COPY.s4en, t, 11.6, 14.2, 250)}
  ${cardLayer(t, pressP, popP)}
  ${heat > 0 ? `<circle cx="${mx}" cy="${my - 120 * ms}" r="${260 * ms}" fill="url(#mglow)" opacity="${heat * .8}"/>` : ''}
  ${ember}${ring}
  ${ms > 0 ? mascot(mx, my, ms, mo, t) : ''}
  ${confetti(t, 540, 1560, 11.6)}
  ${plus}
  ${logoLayer(t)}
  <rect width="${W}" height="${H}" fill="${K.ink}" opacity="${prog(t, DUR - .35, DUR)}"/>
  </svg>`;
}
module.exports = { frame, DUR, W, H };
