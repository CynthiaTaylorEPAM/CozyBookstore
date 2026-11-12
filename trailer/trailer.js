// The Gilded Griffin trailer. Every picture is drawn from the time alone:
// draw(t) builds the whole frame for second t, so the film can be played in a
// browser or captured frame by frame and always comes out the same.
/* global TL */

const C = {
  night: '#1c1a2e', deep: '#14132a', plum: '#3a2440', gold: '#d9a441', goldDeep: '#a9761c',
  parchment: '#f8f0e0', parchDeep: '#efe1c6', ink: '#2b1d14', inkSoft: '#6b5846',
  forest: '#2f5d50', ember: '#b5482a', outline: '#2a1b2e', glow: '#ffd98a',
};
const SPINES = ['#8f3554', '#2f5d50', '#d9a441', '#4b2e6b', '#b0702a', '#2e4a6b', '#8a3b22', '#55702f'];

// ---------- small helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ease = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
const E = (t, a, b) => ease((t - a) / (b - a));          // 0 to 1, smoothly, between a and b
const lin = (t, a, b) => clamp((t - a) / (b - a));
const L = (a, b, p) => a + (b - a) * p;
const win = (t, a, b, f = 0.5) => Math.min(E(t, a, a + f), 1 - E(t, b - f, b));
const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const f1 = (n) => Math.round(n * 10) / 10;
const beat = (id) => TL.beats[id];
/** When the narrator starts saying a word (the nth time it is said in that beat). */
function cue(id, word, n = 0) {
  const hits = beat(id).words.filter((w) => w.w.replace(/[.,:;!?]/g, '') === word);
  if (!hits[n]) throw new Error(`No word "${word}" in ${id}`);
  return hits[n].t0;
}
const cueEnd = (id, word) => beat(id).words.find((w) => w.w.replace(/[.,:;!?]/g, '') === word).t1;

function T(x, y, s, o = {}) {
  const { size = 40, fill = C.parchment, sans = false, weight = 500, italic = false, anchor = 'middle', op = 1, ls = 0, extra = '' } = o;
  if (op <= 0.003) return '';
  return `<text x="${f1(x)}" y="${f1(y)}" font-family="${sans ? 'Nunito Sans' : 'Cormorant Garamond'}" font-size="${size}" font-weight="${weight}"`
    + `${italic ? ' font-style="italic"' : ''} text-anchor="${anchor}" fill="${fill}" opacity="${f1(op * 100) / 100}" letter-spacing="${ls}" ${extra}>${s}</text>`;
}
const G = (op, inner, tf = '') => (op <= 0.003 ? '' : `<g opacity="${Math.round(op * 1000) / 1000}"${tf ? ` transform="${tf}"` : ''}>${inner}</g>`);

const DEFS = `<defs>
  <radialGradient id="halo"><stop offset="0%" stop-color="#ffd98a" stop-opacity="0.55"/><stop offset="100%" stop-color="#ffd98a" stop-opacity="0"/></radialGradient>
  <radialGradient id="warm"><stop offset="0%" stop-color="#ffcf80" stop-opacity="0.5"/><stop offset="60%" stop-color="#ffb060" stop-opacity="0.12"/><stop offset="100%" stop-color="#ffb060" stop-opacity="0"/></radialGradient>
  <linearGradient id="window" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffe2a0"/><stop offset="100%" stop-color="#f2a444"/></linearGradient>
  <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#59405a"/><stop offset="100%" stop-color="#3d2a40"/></linearGradient>
  <linearGradient id="sky" gradientUnits="userSpaceOnUse" x1="0" y1="-800" x2="0" y2="1000"><stop offset="0%" stop-color="#0b0a18"/><stop offset="55%" stop-color="#14132a"/><stop offset="100%" stop-color="#3a2440"/></linearGradient>
  <linearGradient id="room" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1d1629"/><stop offset="100%" stop-color="#35223a"/></linearGradient>
  <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f8f0e0"/><stop offset="100%" stop-color="#ecdcbb"/></linearGradient>
  <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7a4028"/><stop offset="100%" stop-color="#4a2618"/></linearGradient>
  <radialGradient id="vig" cx="50%" cy="50%" r="72%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></radialGradient>
</defs>`;

// ---------- drawing pieces ----------
function stars(t, n, x0, x1, y0, y1, seed = 0) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = L(x0, x1, rnd(i + seed)), y = L(y0, y1, rnd(i * 3.3 + seed + 9));
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(t * (0.5 + rnd(i + 5)) + i));
    s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.5 + rnd(i + 2) * 2.2)}" fill="#f6ecd9" opacity="${f1(tw * 10) / 10}"/>`;
  }
  return s;
}

function shelfRow(x0, x1, y, seed, h = 40, gap = null) {
  let s = '', x = x0, i = 0;
  while (x < x1 - 8) {
    const w = (7 + ((i * 5 + seed * 3) % 6)) * (h / 30);
    const hh = h * (0.75 + ((i * 7 + seed * 11) % 10) / 34);
    if (!(gap && x + w > gap[0] && x < gap[1])) s += `<rect x="${f1(x)}" y="${f1(y - hh)}" width="${f1(w)}" height="${f1(hh)}" rx="1.5" fill="${SPINES[(i + seed) % SPINES.length]}"/>`;
    x += w + 2.5 * (h / 30); i++;
  }
  return s + `<rect x="${x0 - 8}" y="${y}" width="${x1 - x0 + 16}" height="${Math.max(4, h / 6)}" fill="#5a3a22"/>`;
}

/** The shop front from the portal's landing page (ShopFront.tsx), redrawn so it can be animated by time. */
function shopFront(t) {
  const sway = 3 * Math.sin(t * 1.3), flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 2.3);
  let s = '';
  s += `<rect x="356" y="128" width="36" height="80" fill="#2f2033"/><rect x="351" y="122" width="46" height="10" rx="2" fill="#241827"/>`;
  for (let i = 0; i < 4; i++) { // chimney smoke
    const p = ((t * 0.12 + i / 4) % 1);
    s += `<circle cx="${f1(374 + 14 * Math.sin(p * 5 + i))}" cy="${f1(116 - p * 90)}" r="${f1(8 + p * 14)}" fill="#f6ecd9" opacity="${f1((1 - p) * 0.22 * 100) / 100}"/>`;
  }
  s += `<polygon points="118,472 118,236 280,122 442,236 442,472" fill="url(#wall)"/>
    <g stroke="#2a1b2e" stroke-width="7" stroke-linecap="round"><path d="M118 262h324M118 472V240M442 472V240M280 126v136M190 262l-40-52M370 262l40-52"/></g>
    <path d="M92 246 280 100l188 146-22 12L280 134 114 258z" fill="#241827"/>
    <path d="M92 246 280 100l188 146" fill="none" stroke="#d9a441" stroke-width="2" opacity="0.5"/>
    <circle cx="280" cy="208" r="52" fill="url(#halo)"/><circle cx="280" cy="208" r="25" fill="url(#window)" stroke="#2a1b2e" stroke-width="6"/>
    <path d="M280 183v50M255 208h50" stroke="#2a1b2e" stroke-width="4"/>
    <rect x="110" y="270" width="230" height="200" fill="url(#halo)"/>
    <rect x="148" y="288" width="154" height="140" rx="6" fill="url(#window)" stroke="#2a1b2e" stroke-width="8"/>`;
  s += shelfRow(160, 290, 336, 1, 30) + shelfRow(160, 290, 382, 4, 30);
  const tail = 6 * Math.sin(t * 1.1);
  s += `<g fill="#241827"><ellipse cx="262" cy="415" rx="20" ry="11"/><circle cx="246" cy="402" r="9"/><path d="M239 397l1-11 7 6zM253 397l1-11-7 5z"/>
    <path d="M280 416q14 2 ${f1(12 + tail * 0.3)}-${f1(12 + tail * 0.4)}" fill="none" stroke="#241827" stroke-width="5" stroke-linecap="round"/></g>
    <path d="M225 288v140M148 344h154" stroke="#2a1b2e" stroke-width="4" opacity="0.55"/><rect x="138" y="428" width="174" height="12" rx="3" fill="#2a1b2e"/>
    <path d="M344 472V348a36 36 0 0 1 72 0v124z" fill="#7a4028" stroke="#2a1b2e" stroke-width="7"/>
    <circle cx="380" cy="356" r="13" fill="url(#window)" stroke="#2a1b2e" stroke-width="4"/><circle cx="404" cy="414" r="4" fill="#d9a441"/>
    <circle cx="326" cy="318" r="${f1(34 * flick + 4)}" fill="url(#halo)"/><path d="M326 296v8" stroke="#d9a441" stroke-width="3"/>
    <rect x="319" y="304" width="14" height="20" rx="3" fill="#ffd98a" opacity="${f1(flick * 10) / 10}" stroke="#d9a441" stroke-width="3"/>
    <path d="M442 286h66" stroke="#2a1b2e" stroke-width="6" stroke-linecap="round"/>
    <g transform="rotate(${f1(sway)} 485 288)"><path d="M468 288v12M502 288v12" stroke="#d9a441" stroke-width="2"/>
      <rect x="454" y="300" width="62" height="54" rx="7" fill="#241827" stroke="#d9a441" stroke-width="3"/>
      <path d="M469 320c6-4 11-4 16 0 5-4 10-4 16 0v18c-6-4-11-4-16 0-5-4-10-4-16 0z" fill="#f6ecd9"/><path d="M485 320v18" stroke="#241827" stroke-width="2"/></g>
    <path d="M344 472h72l26 48H318z" fill="#ffd98a" opacity="0.12"/>`;
  return s;
}

function crest(x, y, size) {
  return `<g transform="translate(${x - size / 2},${y - size / 2}) scale(${size / 64})">
    <path d="M32 3 56 11v20c0 15-10 25-24 30C18 56 8 46 8 31V11z" fill="#3a2440" stroke="#d9a441" stroke-width="3"/>
    <path d="M17 26c5-4 10-4 15 0 5-4 10-4 15 0v17c-5-4-10-4-15 0-5-4-10-4-15 0z" fill="#f6ecd9"/><path d="M32 26v17" stroke="#3a2440" stroke-width="2"/>
    <path d="M17 24c-5-6-5-11-2-15 2 5 6 8 12 9M47 24c5-6 5-11 2-15-2 5-6 8-12 9" fill="none" stroke="#d9a441" stroke-width="3" stroke-linecap="round"/></g>`;
}

function street(t, opts = {}) {
  let s = `<rect x="-300" y="-900" width="2520" height="2100" fill="url(#sky)"/>`;
  s += stars(t, 90, -100, 2020, -780, 620, opts.seed || 0);
  // far rooftops
  let x = -120, i = 0;
  s += '<g fill="#171529">';
  while (x < 2100) {
    const w = 130 + rnd(i + 40) * 120, h = 150 + rnd(i + 70) * 170;
    s += `<path d="M${f1(x)},940 v${f1(-h)} l${f1(w / 2)},${f1(-60 - rnd(i) * 50)} l${f1(w / 2)},${f1(60 + rnd(i) * 50)} v${f1(h)}z"/>`;
    x += w - 6; i++;
  }
  s += '</g>';
  x = -120; i = 0;
  while (x < 2100) { // a few lit windows
    const w = 130 + rnd(i + 40) * 120, h = 150 + rnd(i + 70) * 170;
    if (rnd(i + 11) > 0.35) s += `<rect x="${f1(x + w * 0.3)}" y="${f1(940 - h * 0.6)}" width="16" height="22" rx="2" fill="#f2a444" opacity="${f1(0.35 + 0.2 * Math.sin(t * 0.7 + i))}"/>`;
    x += w - 6; i++;
  }
  s += `<rect x="-300" y="932" width="2520" height="260" fill="#15131f"/><g fill="#262238">`;
  for (let k = 0; k < 34; k++) s += `<ellipse cx="${-80 + k * 64 + (k % 2) * 20}" cy="${962 + (k % 3) * 26}" rx="34" ry="8"/>`;
  return s + '</g>';
}

function lampPost(x, t, pulse = 0) {
  const fl = 0.9 + 0.1 * Math.sin(t * 7 + x);
  return `<circle cx="${x}" cy="690" r="${f1(90 * fl + pulse * 70)}" fill="url(#halo)" opacity="${f1(0.8 + pulse * 0.2)}"/>
    <rect x="${x - 5}" y="700" width="10" height="236" fill="#241827"/><rect x="${x - 16}" y="926" width="32" height="10" rx="3" fill="#241827"/>
    <path d="M${x - 16},712 h32 l-6,-46 h-20z" fill="#ffd98a" stroke="#d9a441" stroke-width="4" opacity="${f1(fl)}"/><path d="M${x - 20},664 h40 l-20,-18z" fill="#241827"/>`;
}

/**
 * A storybook figure: a cloak, a head, and a few details that say who it is.
 * x, y is where the feet stand. h is height to the shoulders, w half the hem width, head the head radius.
 */
function fig(o) {
  const { x, y, h = 200, w = 60, head = 28, cloak = C.forest, skin = '#e8c9a0', hair = '#5a3a22', flip = false, bob = 0, s = 1,
    ears = false, beard = false, longHair = false, hood = false, eyes = true, trim = null, add = () => '' } = o;
  const hy = -h - head * 0.7;
  let g = `<g transform="translate(${f1(x)},${f1(y + bob)}) scale(${flip ? -s : s},${s})">`;
  g += `<ellipse cx="0" cy="3" rx="${w}" ry="9" fill="#000" opacity="0.3"/>`;
  if (longHair) g += `<path d="M${-head},${hy} Q${-head * 1.3},${hy + head * 2.6} ${-head * 0.5},${hy + head * 3.4} L${head * 0.5},${hy + head * 3.4} Q${head * 1.3},${hy + head * 2.6} ${head},${hy}z" fill="${hair}"/>`;
  g += `<path d="M${-w * 0.42},${-h} Q${-w * 1.05},${-h * 0.45} ${-w * 0.85},0 L${w * 0.85},0 Q${w * 1.05},${-h * 0.45} ${w * 0.42},${-h} Q0,${-h - 12} ${-w * 0.42},${-h}z" fill="${cloak}"/>`;
  if (trim) g += `<path d="M0,${-h - 4} V-2" stroke="${trim}" stroke-width="4" opacity="0.8"/>`;
  if (ears) g += `<path d="M${-head * 0.8},${hy + 4} l${-head * 0.75},${-head * 0.7} l${head * 0.55},${head * 0.1}z M${head * 0.8},${hy + 4} l${head * 0.75},${-head * 0.7} l${-head * 0.55},${head * 0.1}z" fill="${skin}"/>`;
  if (hood) g += `<circle cx="0" cy="${hy}" r="${head * 1.25}" fill="${cloak}"/>`;
  g += `<circle cx="0" cy="${hy}" r="${head}" fill="${skin}"/>`;
  if (!hood) g += `<path d="M${-head * 1.04},${hy + 2} A${head * 1.04},${head * 1.04} 0 0 1 ${head * 1.04},${hy + 2} Q${head * 0.4},${hy - head * 0.55} ${-head * 0.2},${hy - head * 0.35} Q${-head * 0.8},${hy - head * 0.3} ${-head * 1.04},${hy + 2}z" fill="${hair}"/>`;
  if (eyes) g += `<circle cx="${-head * 0.52}" cy="${hy + head * 0.18}" r="${head * 0.1}" fill="${C.ink}"/><circle cx="${head * 0.12}" cy="${hy + head * 0.18}" r="${head * 0.1}" fill="${C.ink}"/>`;
  if (beard) g += `<path d="M${-head * 0.98},${hy + head * 0.3} Q${-head * 0.9},${hy + head * 2.5} ${-head * 0.2},${hy + head * 2.9} Q${head * 0.75},${hy + head * 2.4} ${head * 0.98},${hy + head * 0.3} Q${head * 0.1},${hy + head * 1.0} ${-head * 0.98},${hy + head * 0.3}z" fill="${hair}"/>`;
  g += add(hy, head, h, w);
  return g + '</g>';
}

const elf = (x, y, t, o = {}) => fig({ x, y, h: 250, w: 46, head: 25, cloak: '#4f6f8f', skin: '#efd9bd', hair: '#ece2c8', ears: true, longHair: true, trim: C.gold, ...o,
  add: (hy) => `<g transform="translate(-44,${hy + 86}) rotate(${f1(-8 + 2 * Math.sin(t * 0.8))})"><path d="M-30,0 L0,8 L30,0 L30,-34 L0,-26 L-30,-34z" fill="${C.parchment}" stroke="#8f3554" stroke-width="5"/><path d="M0,8V-26" stroke="#8f3554" stroke-width="3"/></g><circle cx="-22" cy="${hy + 92}" r="9" fill="#efd9bd"/>` });
const dwarf = (x, y, t, o = {}) => fig({ x, y, h: 96, w: 58, head: 31, cloak: '#8a3b22', skin: '#e2b48f', hair: '#c9772e', beard: true, ...o,
  add: (hy) => `<rect x="8" y="${hy - 2}" width="30" height="24" rx="4" fill="#fff" opacity="0.92" transform="rotate(${f1(6 * Math.sin(t * 3))} 22 ${hy})"/>`
    + `<circle cx="-22" cy="${f1(hy + 22 + ((t * 28) % 44))}" r="4" fill="#9fd0ea" opacity="${f1(1 - ((t * 28) % 44) / 44)}"/>` });
const halfling = (x, y, t, o = {}) => fig({ x, y, h: 84, w: 42, head: 27, cloak: '#55702f', skin: '#eac8a4', hair: '#7a4a25', flip: true, ...o,
  add: (hy) => `<circle cx="-20" cy="${hy - 22}" r="11" fill="#7a4a25"/><circle cx="2" cy="${hy - 27}" r="12" fill="#7a4a25"/><circle cx="22" cy="${hy - 20}" r="10" fill="#7a4a25"/>`
    + `<g transform="translate(-48,-40)"><path d="M-26,0 h52 l-8,30 h-36z" fill="#b0702a"/><path d="M-22,0 Q0,-44 22,0" fill="none" stroke="#b0702a" stroke-width="5"/>`
    + `<circle cx="-12" cy="-4" r="10" fill="#e9c98a"/><circle cx="6" cy="-7" r="10" fill="#f0d49a"/><circle cx="17" cy="-2" r="8" fill="#e9c98a"/></g>` });
function pip(x, y, t, run = 0, o = {}) {
  const sw = Math.sin(t * 16) * run;
  const legs = `<g stroke="#3b2a1e" stroke-width="11" stroke-linecap="round"><path d="M${f1(x - 8)},${y - 34} l${f1(sw * 26)},32"/><path d="M${f1(x + 8)},${y - 34} l${f1(-sw * 26)},32"/></g>`;
  return legs + fig({ x, y: y - 26, h: 62, w: 34, head: 27, cloak: C.forest, skin: '#f0cfae', hair: '#c9772e', bob: -Math.abs(sw) * 8, ...o,
    add: (hy, head) => `<path d="M${-head * 1.05},${hy - 4} Q0,${hy - head * 0.5} ${head * 1.05},${hy - 4} Q${head * 0.5},${hy - head * 2.4} ${head * (0.9 - run * 1.5)},${hy - head * 2.7} Q0,${hy - head * 1.6} ${-head * 1.05},${hy - 4}z" fill="${C.ember}"/>`
      + `<path d="M-14,-56 h28 v40 h-28z" fill="${C.parchment}" opacity="0.9"/>` });
}
const knight = (x, y, t, o = {}) => fig({ x, y, h: 250, w: 66, head: 30, cloak: '#77838f', skin: '#e8c9a0', hair: '#77838f', eyes: false, flip: true, ...o,
  add: (hy, head) => `<path d="M-40,-250 h80 l14,90 h-108z" fill="#93a0ad"/><path d="M-66,-10 h132" stroke="#5f6a75" stroke-width="10"/>`
    + `<circle cx="0" cy="${hy}" r="${head + 4}" fill="#a9b4bf"/><rect x="${-head - 4}" y="${hy - 6}" width="${head * 1.5}" height="12" rx="3" fill="#2a2f36"/>`
    + `<path d="M0,${hy - head - 2} q26,-46 62,-22 q-30,2 -40,26z" fill="${C.ember}"/><path d="M0,${hy - head - 4} v${head * 2 + 8}" stroke="#7d8894" stroke-width="4"/>`
    + (o.inner ? o.inner(hy, head) : '') });
const teamMember = (x, y, t, k, o = {}) => fig({ x, y, h: 190, w: 56, head: 28, cloak: ['#2e4a6b', '#3d3566', '#27565a'][k % 3], skin: ['#c98f6b', '#f0d3b4', '#8a5a3c'][k % 3],
  hair: ['#241a16', '#8a5a2b', '#1a1412'][k % 3], trim: C.gold, flip: k % 2 === 1, bob: 2 * Math.sin(t * 1.4 + k), ...o,
  add: (hy) => (k % 3 === 0 ? `<circle cx="-62" cy="${hy + 150}" r="46" fill="url(#halo)"/><path d="M-62,${hy + 118} v14" stroke="${C.gold}" stroke-width="3"/><rect x="-71" y="${hy + 132}" width="18" height="26" rx="4" fill="#ffd98a" stroke="${C.gold}" stroke-width="3"/>`
    : k % 3 === 1 ? `<g transform="translate(40,${hy + 110}) rotate(8)"><rect x="-20" y="-28" width="40" height="54" rx="3" fill="${C.parchment}"/><path d="M-12,-14h24M-12,-2h24M-12,10h16" stroke="${C.inkSoft}" stroke-width="3"/></g>`
      : `<path d="M-30,${hy + 96} h60" stroke="${C.gold}" stroke-width="5" stroke-linecap="round"/>`) });

function quill(x, y, t, active, k = 0) {
  const wob = active ? 7 * Math.sin(t * 13 + k * 2) : 0, bob = 6 * Math.sin(t * 1.6 + k);
  return `<g transform="translate(${f1(x + wob)},${f1(y + bob)}) rotate(${f1(24 + (active ? 6 * Math.sin(t * 13 + k) : 0))})">
    <circle cx="0" cy="-40" r="${active ? 54 : 30}" fill="url(#halo)" opacity="${active ? 0.95 : 0.35}"/>
    <path d="M0,0 Q-26,-40 -8,-96 Q8,-118 14,-96 Q26,-44 0,0z" fill="${active ? '#fff6dc' : '#b9aa8c'}"/><path d="M0,6 L3,-92" stroke="${C.goldDeep}" stroke-width="3"/><path d="M0,0 l-2,16 l5,-14z" fill="${C.ink}"/></g>`;
}
function page(x, y, rot = 0, mark = '', sc = 1) {
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rot)}) scale(${sc})"><rect x="-26" y="-34" width="52" height="68" rx="3" fill="${C.parchment}" stroke="${C.parchDeep}" stroke-width="2"/>
    <path d="M-16,-20h32M-16,-9h32M-16,2h32M-16,13h20" stroke="${C.inkSoft}" stroke-width="2.5" opacity="0.7"/>${mark}</g>`;
}
const tick = (col = C.forest) => `<circle cx="16" cy="22" r="14" fill="${col}"/><path d="M9,22 l5,6 l9,-11" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;

// ---------- the scenes ----------
function sceneShop(t) {
  const b = beat('shop'), u = t - b.start;
  const pan = L(690, 0, E(u, 0.8, 6.4)), zoom = 1 + 0.07 * lin(u, 0, b.end - b.start);
  let w = street(t);
  // moon, and a very small dragon
  w += `<circle cx="330" cy="-360" r="230" fill="url(#halo)" opacity="0.6"/><circle cx="330" cy="-360" r="88" fill="#f6ecd9"/><circle cx="302" cy="-384" r="14" fill="#e6d8bd"/><circle cx="358" cy="-332" r="21" fill="#e6d8bd"/>`;
  const dx = L(60, 760, lin(u, 0.2, 8)), dy = -420 + 30 * Math.sin(u * 0.9);
  w += `<g transform="translate(${f1(dx)},${f1(dy)}) scale(${f1(2.4)},${f1(2.4 * (0.8 + 0.2 * Math.sin(u * 7)))})"><path d="M-14,10q10-16 22-4 4-10 14-9-6 6-5 13 9-3 15 4-10 0-15 6-9-7-17-2-6-8-14-8z" fill="#0f0e1d"/></g>`;
  w += T(1180, -370, 'A TALE FROM', { sans: true, weight: 700, size: 26, ls: 10, fill: C.gold, op: win(u, 1, 5.0, 1) });
  w += T(1180, -270, 'Emberhollow', { size: 130, italic: true, weight: 500, op: win(u, 1.4, 5.2, 1.2) });
  // fountain
  w += `<g fill="#2f2948"><rect x="60" y="890" width="250" height="46" rx="10"/><rect x="170" y="800" width="30" height="100"/><ellipse cx="185" cy="800" rx="62" ry="13"/></g>`;
  for (let i = 0; i < 6; i++) { const p = (u * 0.8 + i / 6) % 1; w += `<circle cx="${f1(185 + (i % 2 ? 1 : -1) * p * 58)}" cy="${f1(790 - 60 * Math.sin(p * Math.PI) + p * 100)}" r="4" fill="#9fd0ea" opacity="${f1((1 - p) * 0.7)}"/>`; }
  const c3 = cue('shop', 'third');
  const pulse = (k) => Math.max(0, 1 - Math.abs(t - (c3 + 0.1 + k * 0.45)) / 0.4);
  w += lampPost(420, t, pulse(0)) + lampPost(650, t, pulse(1));
  w += `<g transform="translate(700,40) scale(1.9)">${shopFront(t)}<circle cx="326" cy="318" r="${f1(60 * pulse(2))}" fill="url(#halo)"/></g>`;
  // the folk who come
  const cE = cue('shop', 'Elves') - 0.9, cD = cue('shop', 'Dwarves') - 0.9, cH = cue('shop', 'Halflings') - 0.9;
  if (t > cD) w += G(E(t, cD, cD + 0.5), dwarf(L(760, 880, E(t, cD, cD + 1.4)), 938, t, { bob: 3 * Math.sin(t * 9) * (1 - E(t, cD + 1, cD + 1.4)) }));
  if (t > cE) w += G(E(t, cE, cE + 0.5), elf(L(1960, 1775, E(t, cE, cE + 1.6)), 940, t, { bob: 3 * Math.sin(t * 7) * (1 - E(t, cE + 1.2, cE + 1.6)) }));
  if (t > cH) {
    const hx = L(2000, 1610, E(t, cH, cH + 2.6));
    for (let i = 0; i < 7; i++) { const cx = 1960 - i * 46; if (cx > hx + 40) w += `<circle cx="${cx}" cy="${946 + (i % 3) * 5}" r="3.5" fill="#e9c98a" opacity="0.8"/>`; }
    w += halfling(hx, 940, t, { bob: 4 * Math.sin(t * 10) * (1 - E(t, cH + 2.2, cH + 2.6)) });
  }
  let s = `<g transform="translate(960,640) scale(${zoom}) translate(-960,${f1(-640 + pan)})">${w}</g>`;
  const a = win(t, cue('shop', 'bookshop') + 0.2, cE + 0.5, 0.8);
  s += T(96, 250, 'The Gilded Griffin', { size: 96, weight: 700, anchor: 'start', op: a });
  s += T(100, 306, 'BOOKS &amp; CURIOS  ·  NO. 7 LANTERN STREET', { sans: true, weight: 700, size: 22, ls: 6, fill: C.gold, anchor: 'start', op: a });
  s += T(100, 364, 'Established in the Year of the Quiet Comet', { size: 36, italic: true, anchor: 'start', op: Math.min(a, E(t, cue('shop', 'stood'), cue('shop', 'stood') + 0.8)) });
  const p = E(t, cueEnd('shop', 'scones') + 0.1, cueEnd('shop', 'scones') + 1.1);
  s += T(100, 250, '“Stories for every folk.', { size: 60, italic: true, anchor: 'start', fill: C.gold, op: p });
  s += T(100, 322, 'Shelter from every storm.”', { size: 60, italic: true, anchor: 'start', fill: C.gold, op: p });
  return s;
}

function mirabelFigure(t, look = 0) {
  const cx = 640, cy = 440, nod = 2 * Math.sin(t * 0.9);
  let s = `<path d="M420,720 Q440,590 560,566 L720,566 Q840,590 860,720z" fill="${C.forest}"/><path d="M590,566 L640,640 L690,566z" fill="${C.parchment}"/>`;
  s += `<path d="M452,720 Q470,640 540,610" stroke="#25493f" stroke-width="8" fill="none"/><path d="M828,720 Q810,640 740,610" stroke="#25493f" stroke-width="8" fill="none"/>`;
  s += `<g transform="translate(0,${f1(nod)})">`;
  s += `<circle cx="${cx}" cy="${cy - 118}" r="46" fill="#8b6a52"/>`;
  for (let i = 0; i < 9; i++) { const a = Math.PI * (1.02 + i * 0.12); s += `<circle cx="${f1(cx + Math.cos(a) * 98)}" cy="${f1(cy + Math.sin(a) * 92)}" r="34" fill="${i % 3 === 1 ? '#a58a76' : '#8b6a52'}"/>`; }
  s += `<circle cx="${cx}" cy="${cy}" r="94" fill="#eac8a4"/>`;
  s += `<path d="M${cx - 96},${cy - 8} A96,96 0 0 1 ${cx + 96},${cy - 8} Q${cx + 40},${cy - 62} ${cx - 10},${cy - 50} Q${cx - 70},${cy - 46} ${cx - 96},${cy - 8}z" fill="#8b6a52"/>`;
  s += `<circle cx="${cx - 58}" cy="${cy + 34}" r="17" fill="#e39a86" opacity="0.5"/><circle cx="${cx + 58}" cy="${cy + 34}" r="17" fill="#e39a86" opacity="0.5"/>`;
  const ex = look * 4;
  s += `<circle cx="${cx - 36 + ex}" cy="${cy + 14}" r="7" fill="${C.ink}"/><circle cx="${cx + 36 + ex}" cy="${cy + 14}" r="7" fill="${C.ink}"/>`
    + `<path d="M${cx - 54},${cy - 26 - look * 4} q18,${f1(-8 + look * 10)} 36,0M${cx + 18},${cy - 26 - look * 4} q18,${f1(-8 - look * 10 + look * 20)} 36,0" stroke="#6d5140" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  s += `<g fill="none" stroke="${C.gold}" stroke-width="5"><circle cx="${cx - 36}" cy="${cy + 8}" r="27"/><circle cx="${cx + 36}" cy="${cy + 8}" r="27"/><path d="M${cx - 9},${cy + 6} q9,-8 18,0"/></g>`;
  s += `<path d="M${cx - 16},${cy + 54} q16,${f1(6 - look * 10)} 32,0" stroke="#9b5a48" stroke-width="5" fill="none" stroke-linecap="round"/>`;
  return s + '</g>';
}

function sceneMirabel(t) {
  const b = beat('mirabel'), u = t - b.start;
  const cKnow = cue('mirabel', 'What');
  const push = E(t, cKnow - 0.6, cKnow + 3.5);
  const zoom = 1 + 0.04 * lin(u, 0, 14) + 0.5 * push;
  const fl = 0.9 + 0.1 * Math.sin(t * 11) * Math.sin(t * 3.1);
  let w = `<rect x="-200" y="-200" width="2320" height="1480" fill="url(#room)"/>`;
  // window
  w += `<rect x="110" y="120" width="280" height="330" rx="140" fill="#14132a" stroke="${C.outline}" stroke-width="14"/>` + stars(t, 9, 140, 360, 160, 400, 50)
    + `<circle cx="300" cy="230" r="34" fill="#f6ecd9"/><path d="M250,124V450M112,300h276" stroke="${C.outline}" stroke-width="8"/>`;
  // shelf above her
  const cBook = cue('mirabel', 'book');
  w += shelfRow(470, 980, 250, 3, 64);
  w += `<rect x="470" y="150" width="520" height="100" fill="${C.glow}" opacity="${f1(0.22 * win(t, cBook - 0.2, cBook + 2.2, 0.5))}"/>`;
  // the aunt's portrait
  const aunt = cue('mirabel', 'aunt');
  w += `<circle cx="1560" cy="300" r="${f1(230 * E(t, aunt - 0.4, aunt + 0.5))}" fill="url(#halo)" opacity="0.5"/>
    <ellipse cx="1560" cy="300" rx="118" ry="146" fill="#2a1b2e" stroke="${C.gold}" stroke-width="10"/>
    <path d="M1482,410 Q1500,342 1560,336 Q1620,342 1638,410 Q1600,440 1560,444 Q1520,440 1482,410z" fill="#8f3554"/>
    <circle cx="1560" cy="208" r="26" fill="#d8d2cc"/><circle cx="1560" cy="270" r="52" fill="#dfb894"/><path d="M1506,266 A54,54 0 0 1 1614,266 Q1586,232 1560,238 Q1530,234 1506,266z" fill="#d8d2cc"/>
    <path d="M1538,272 q8,5 16,0M1568,272 q8,5 16,0" stroke="${C.ink}" stroke-width="3" fill="none"/><path d="M1548,296 q12,8 24,0" stroke="#9b5a48" stroke-width="3" fill="none"/>`;
  // candle light, Mirabel, table
  w += `<circle cx="1010" cy="600" r="${f1(520 * fl)}" fill="url(#warm)"/>`;
  w += mirabelFigure(t, push);
  w += `<rect x="-200" y="700" width="2320" height="600" fill="url(#wood)"/><rect x="-200" y="700" width="2320" height="16" fill="#9a5a36"/>`;
  w += `<rect x="996" y="610" width="28" height="100" rx="4" fill="#efe1c6"/><ellipse cx="1010" cy="${f1(590 - 4 * fl)}" rx="${f1(11 * fl)}" ry="${f1(24 * fl)}" fill="#ffd98a"/><ellipse cx="1010" cy="596" rx="5" ry="11" fill="#fff6dc"/><ellipse cx="1010" cy="712" rx="40" ry="9" fill="#5a3a22"/>`;
  // tea
  w += `<path d="M1150,690 h110 q0,70 -55,70 q-55,0 -55,-70z" fill="${C.parchment}"/><path d="M1258,704 q40,4 26,30 q-10,16 -34,12" stroke="${C.parchment}" stroke-width="9" fill="none"/><ellipse cx="1205" cy="690" rx="55" ry="10" fill="#8a4d2c"/><ellipse cx="1205" cy="764" rx="76" ry="9" fill="#efe1c6"/>`;
  for (let i = 0; i < 2; i++) { const ph = t * 1.2 + i * 2; w += `<path d="M${1190 + i * 30},672 q${f1(14 * Math.sin(ph))},-30 0,-58 q${f1(-14 * Math.sin(ph + 1))},-28 0,-56" stroke="#fff" stroke-width="5" fill="none" opacity="0.2" stroke-linecap="round"/>`; }
  // the ledger
  w += `<path d="M400,742 L672,752 L672,912 L372,896z" fill="url(#paper)"/><path d="M944,742 L672,752 L672,912 L972,896z" fill="url(#paper)"/><path d="M672,752V912" stroke="#b9a37a" stroke-width="4"/>`;
  const rows = [['Tomes sold', '31'], ['Scones, received', '12'], ['Lost to bookwyrm', '4'], ['Adventurers', '3 gp?']];
  rows.forEach(([k, v], i) => {
    const a = E(u, 1.5 + i * 2.4, 2.3 + i * 2.4);
    w += T(420, 786 + i * 30, k, { size: 23, italic: true, fill: C.ink, anchor: 'start', op: a }) + T(650, 786 + i * 30, v, { size: 23, italic: true, fill: C.ink, anchor: 'end', op: a });
  });
  w += `<path d="M700,790h230M700,818h230M700,846h180" stroke="${C.inkSoft}" stroke-width="2.5" opacity="0.4"/>`;
  const q = E(t, cue('mirabel', 'money') - 0.5, cue('mirabel', 'money') + 0.4);
  w += T(700, 884, 'Takings this month', { size: 25, italic: true, weight: 700, fill: C.ink, anchor: 'start', op: E(t, cKnow, cKnow + 0.8) });
  w += T(920, 890, '?', { size: 58, weight: 700, fill: C.ember, op: q, extra: `transform="rotate(${f1(8 * (1 - q))} 920 880)"` });
  // her hand and quill
  const wr = 1 - push, hx = 800 + 14 * Math.sin(t * 5) * wr * (u < 11 ? 1 : 0.2), hyy = 800 + 4 * Math.sin(t * 9) * wr;
  w += `<g transform="translate(${f1(hx)},${f1(hyy)})"><path d="M0,0 Q-10,-50 30,-110 Q52,-126 50,-104 Q44,-50 0,0z" fill="#fff6dc" transform="rotate(20)"/><circle cx="14" cy="-6" r="24" fill="#eac8a4"/></g>`;
  let s = `<g transform="translate(700,820) scale(${f1(zoom * 1000) / 1000}) translate(-700,-820)">${w}</g>`;
  const cN = cue('mirabel', 'Mirabel'), out = 1 - E(t, cKnow - 1, cKnow - 0.2);
  s += T(1560, 548, 'THE PROPRIETOR', { sans: true, weight: 700, size: 22, ls: 8, fill: C.gold, op: Math.min(out, E(t, cN - 0.4, cN + 0.4)) });
  s += T(1560, 618, 'Mirabel Thistlewick', { size: 64, weight: 700, op: Math.min(out, E(t, cN, cN + 0.8)) });
  s += T(1560, 668, 'twenty years behind the counter', { size: 36, italic: true, op: Math.min(out, E(t, cN + 0.9, cN + 1.7)) });
  return s;
}

function panel(x, lit, inner, label, sub) {
  return `<g opacity="${f1(L(0.22, 1, lit) * 100) / 100}"><rect x="${x}" y="170" width="540" height="640" rx="18" fill="#241a33" stroke="${C.gold}" stroke-width="3"/>
    <svg x="${x}" y="170" width="540" height="640" viewBox="0 0 540 640">${inner}</svg></g>`
    + T(x + 270, 872, label, { size: 38, italic: true, op: lit }) + T(x + 270, 912, sub, { sans: true, size: 20, weight: 700, ls: 4, fill: C.gold, op: lit });
}

function mimic(x, y, open, t) {
  const ang = -34 * open;
  let s = `<g transform="translate(${f1(x)},${f1(y)})">`;
  if (open > 0.5) s += `<path d="M30,-10 Q150,${f1(-6 + 8 * Math.sin(t * 6))} 196,${f1(26 + 8 * Math.sin(t * 6))}" stroke="#d9667a" stroke-width="26" stroke-linecap="round" fill="none" opacity="${f1((open - 0.5) * 2)}"/>`;
  s += `<rect x="-160" y="0" width="320" height="44" rx="7" fill="#4b2e6b"/><rect x="-152" y="-16" width="306" height="20" fill="#f1e3c4"/><path d="M-152,-9h306M-152,-3h306" stroke="#cdb98e" stroke-width="1.5"/>`;
  for (let i = 0; i < 8; i++) s += `<path d="M${-128 + i * 35},-16 l12,-24 l12,24z" fill="#fff" opacity="${f1(open)}"/>`;
  s += `<g transform="rotate(${f1(ang)} -160 -16)">`;
  for (let i = 0; i < 8; i++) s += `<path d="M${-112 + i * 35},-16 l12,24 l12,-24z" fill="#fff" opacity="${f1(open)}"/>`;
  s += `<rect x="-160" y="-62" width="320" height="46" rx="7" fill="#5b3a80"/><rect x="-150" y="-55" width="300" height="32" rx="4" fill="none" stroke="${C.gold}" stroke-width="2.5"/>`;
  s += T(0, -30, 'FIRST EDITION', { size: 22, weight: 700, fill: C.gold, ls: 5, op: 1 - open * 0.6 });
  s += G(open, `<circle cx="60" cy="-78" r="20" fill="#fff"/><circle cx="112" cy="-78" r="20" fill="#fff"/><circle cx="${f1(66 + 3 * Math.sin(t * 2))}" cy="-76" r="8" fill="${C.ink}"/><circle cx="${f1(118 + 3 * Math.sin(t * 2))}" cy="-76" r="8" fill="${C.ink}"/>`);
  return s + '</g></g>';
}

function sceneTrouble(t) {
  const b = beat('trouble');
  const cMimic = cue('trouble', 'And') - 0.5, cPip = cue('trouble', 'Pip') - 0.9;
  let s = `<rect width="1920" height="1080" fill="url(#room)"/>`;
  if (t < cMimic + 0.5) {
    // three troubles, side by side
    const a = 1 - E(t, cMimic - 0.1, cMimic + 0.5);
    const l1 = E(t, cue('trouble', 'Favourite') - 0.2, cue('trouble', 'Favourite') + 0.4), l2 = E(t, cueEnd('trouble', 'out') + 0.1, cueEnd('trouble', 'out') + 0.6), l3 = E(t, cue('trouble', 'bookwyrm') - 0.4, cue('trouble', 'bookwyrm') + 0.3);
    let p1 = shelfRow(50, 490, 190, 2, 96) + shelfRow(50, 490, 380, 5, 96, [200, 350]) + shelfRow(50, 490, 570, 7, 96);
    p1 += `<rect x="204" y="262" width="140" height="116" rx="6" fill="none" stroke="${C.parchment}" stroke-width="3" stroke-dasharray="9 9" opacity="0.5"/>`
      + `<g transform="rotate(${f1(7 * Math.sin(t * 1.8))} 274 270)"><path d="M274,270 v26" stroke="${C.gold}" stroke-width="3"/><rect x="214" y="296" width="120" height="50" rx="6" fill="${C.parchment}"/>${T(274, 331, 'SOLD OUT', { sans: true, weight: 700, size: 21, ls: 2, fill: C.ember })}</g>`;
    let p2 = `<rect x="0" y="560" width="540" height="80" fill="#15131f"/><path d="M-30,560 V250 a100,100 0 0 1 200,0 V560z" fill="url(#window)" stroke="${C.outline}" stroke-width="12"/>`;
    const q = [['#8a3b22', 130, 50, 32], ['#4f6f8f', 230, 40, 23], ['#55702f', 90, 38, 25], ['#4b2e6b', 190, 46, 26], ['#b0702a', 150, 44, 26]];
    q.forEach(([col, h, wd, hd], i) => {
      const x = 96 + i * 96;
      p2 += fig({ x, y: 580, h, w: wd, head: hd, cloak: col, hair: SPINES[(i + 4) % 8], skin: ['#e2b48f', '#efd9bd', '#eac8a4', '#9aa56a', '#e8c9a0'][i], bob: 3 * Math.sin(t * 2 + i * 1.7), ears: i === 1, beard: i === 0,
        add: (hy, hd2) => (i === 3 ? `<path d="M0,${hy - hd2 - 46 - 8 * Math.sin(t * 13)} q-22,30 0,48 q22,-18 0,-48z" fill="#ffb347"/><path d="M0,${hy - hd2 - 22} q-9,14 0,22 q9,-8 0,-22z" fill="#fff2b0"/><circle cx="0" cy="${hy - hd2 - 20}" r="60" fill="url(#halo)"/>` : '') });
    });
    let p3 = `<rect x="0" y="540" width="540" height="100" fill="#15131f"/>`;
    [[110, 500, 320, '#8f3554'], [130, 460, 290, '#2e4a6b'], [100, 420, 330, '#b0702a']].forEach(([x, y, wd, col]) => { p3 += `<rect x="${x}" y="${y}" width="${wd}" height="40" rx="5" fill="${col}"/><rect x="${x + 8}" y="${y + 8}" width="${wd - 16}" height="24" fill="#f1e3c4"/><circle cx="${x + wd}" cy="${y + 12}" r="17" fill="#241a33"/><circle cx="${x + wd - 26}" cy="${y + 2}" r="11" fill="#241a33"/>`; });
    const br = 1 + 0.04 * Math.sin(t * 1.6);
    p3 += `<g transform="translate(270,330) scale(${f1(br * 100) / 100})"><path d="M-130,60 Q-150,-40 -40,-50 Q80,-56 110,10 Q130,70 40,80 Q-40,86 -40,30 Q-36,0 10,6" stroke="#6f9a4a" stroke-width="72" fill="none" stroke-linecap="round"/>
      <path d="M-130,60 Q-150,-40 -40,-50 Q80,-56 110,10 Q130,70 40,80" stroke="#cfe09a" stroke-width="22" fill="none" stroke-linecap="round" opacity="0.55"/>
      <circle cx="14" cy="8" r="50" fill="#7fae55"/><path d="M-14,2 q14,12 28,0M22,2 q12,10 24,0" stroke="${C.ink}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-10,-36 l-8,-26 l22,16zM36,-38 l12,-24 l8,26z" fill="${C.gold}"/><path d="M0,30 q14,10 30,0" stroke="${C.ink}" stroke-width="4" fill="none"/></g>`;
    for (let i = 0; i < 3; i++) { const p = (t * 0.35 + i / 3) % 1; p3 += T(350 + p * 90, 250 - p * 150, 'z', { size: 34 + p * 44, italic: true, weight: 700, fill: C.parchment, op: (1 - p) * 0.9 }); }
    p3 += `<path d="M40,540 h70 l-10,60 h-50z" fill="${C.ember}"/><path d="M75,540 q-34,-50 -10,-90 M75,540 q0,-60 20,-80 M75,540 q30,-36 34,-70" stroke="#6f9a4a" stroke-width="7" fill="none" stroke-linecap="round"/>`;
    s += G(a, T(960, 112, 'WHAT THE LEDGER CANNOT TELL HER', { sans: true, weight: 700, size: 24, ls: 9, fill: C.gold, op: E(t, b.start + 0.5, b.start + 1.5) })
      + panel(110, l1, p1, 'Favourite tomes run out', 'AND THE DUDS PILE UP')
      + panel(690, l2, p2, '“…one of them is on fire.”', 'PIP, AT THE COUNTER')
      + panel(1270, l3, p3, '“Very full, and not at all sorry.”', 'INCIDENT REPORT'));
  }
  if (t >= cMimic && t < cPip + 0.5) {
    // the mimic and the knight
    const a = Math.min(E(t, cMimic, cMimic + 0.6), 1 - E(t, cPip - 0.1, cPip + 0.5));
    const cBit = cue('trouble', 'bit'), open = E(t, cBit - 0.1, cBit + 0.15) * (0.8 + 0.2 * Math.sin((t - cBit) * 5));
    const shake = Math.max(0, 1 - (t - cBit) / 0.5) * (t > cBit ? 1 : 0);
    const reach = E(t, cue('trouble', 'signed'), cBit) - E(t, cBit + 0.1, cBit + 0.45);
    const recoil = E(t, cBit + 0.1, cBit + 0.5);
    let m = '';
    for (let r = 0; r < 3; r++) m += G(0.28, shelfRow(60, 1860, 250 + r * 190, r + 2, 110));
    m += `<circle cx="760" cy="560" r="430" fill="url(#warm)"/>`;
    m += `<path d="M640,940 L690,700 H830 L880,940z" fill="#5a3a22"/><rect x="600" y="668" width="320" height="34" rx="8" fill="#6f4a2c"/><path d="M590,668 q170,-60 340,0z" fill="#8f3554"/>`;
    m += `<rect x="660" y="760" width="200" height="64" rx="6" fill="${C.parchment}"/>` + T(760, 788, 'Signed first edition', { size: 24, italic: true, weight: 700, fill: C.ink }) + T(760, 812, '40 gold pieces', { sans: true, size: 15, weight: 700, ls: 2, fill: C.goldDeep });
    m += mimic(760, 606, open, t);
    const kx = 1250 + recoil * 90;
    m += `<path d="M${f1(kx - 60)},680 L${f1(kx - 90 - reach * 210)},${f1(650 - reach * 60)}" stroke="#93a0ad" stroke-width="26" stroke-linecap="round"/><circle cx="${f1(kx - 90 - reach * 210)}" cy="${f1(650 - reach * 60)}" r="22" fill="#a9b4bf"/>`;
    m += knight(kx, 940, t, { bob: -recoil * 14 * Math.abs(Math.sin((t - cBit) * 9)) * (t < cBit + 1.2 ? 1 : 0) });
    m += T(kx + 10, 560, '!', { size: 110, weight: 700, fill: C.gold, op: win(t, cBit + 0.05, cBit + 1.3, 0.2) });
    const qa = E(t, cueEnd('trouble', 'mimic') + 0.3, cueEnd('trouble', 'mimic') + 1.0);
    const zm = 1.22 + 0.05 * lin(t, cMimic, cPip);
    s += G(a, m, `translate(${f1(960 + shake * 14 * Math.sin(t * 70))},${f1(800 + shake * 9 * Math.cos(t * 63))}) scale(${f1(zm * 1000) / 1000}) translate(-960,-800)`);
    s += `<rect width="1920" height="250" fill="#14101f" opacity="${f1(0.6 * qa * a)}"/>`;
    s += T(960, 130, '“The mimic bit me. Five stars.”', { size: 78, italic: true, op: qa * a });
    s += T(960, 186, 'SIR ALDRIC FENN, KNIGHT AND FIRST-TIME VISITOR', { sans: true, weight: 700, size: 21, ls: 6, fill: C.gold, op: qa * a });
  }
  if (t >= cPip) {
    // Pip runs to the tavern
    const a = E(t, cPip, cPip + 0.6);
    const arrive = cue('trouble', 'tavern') + 0.9, cPrice = cue('trouble', 'price'), cNo = cue('trouble', 'Nobody');
    const p = E(t, cPip + 0.2, arrive), px = L(-60, 1180, p), running = t < arrive ? 1 : 0;
    let m = street(t, { seed: 7 }) + lampPost(260, t) + lampPost(760, t);
    m += `<path d="M1300,936 V520 l250,-150 l250,150 V936z" fill="url(#wall)"/><path d="M1270,530 L1550,350 L1830,530 l-20,16 L1550,386 L1290,546z" fill="#241827"/>`
      + `<rect x="1360" y="560" width="110" height="130" rx="8" fill="url(#window)" stroke="${C.outline}" stroke-width="9"/><path d="M1415,560v130M1360,625h110" stroke="${C.outline}" stroke-width="5"/>`
      + `<circle cx="1640" cy="800" r="230" fill="url(#halo)"/><path d="M1560,936 V740 a80,80 0 0 1 160,0 V936z" fill="url(#window)" stroke="${C.outline}" stroke-width="10"/>`
      + `<path d="M1300,600 h-90" stroke="${C.outline}" stroke-width="8" stroke-linecap="round"/><g transform="rotate(${f1(4 * Math.sin(t * 1.5))} 1250 600)"><rect x="1212" y="616" width="76" height="84" rx="8" fill="#241827" stroke="${C.gold}" stroke-width="3"/><path d="M1232,640 h30 v40 h-30z M1262,648 q16,0 16,12 q0,12 -16,12" fill="none" stroke="${C.gold}" stroke-width="5"/><path d="M1232,640 q15,-12 30,0" fill="#f6ecd9"/></g>`;
    // the adventurer in the doorway
    m += G(E(t, cPrice - 0.9, cPrice - 0.2), fig({ x: 1640, y: 936, h: 230, w: 70, head: 32, cloak: '#1f1a2c', hood: true, skin: '#1f1a2c', eyes: false, add: (hy) => `<path d="M40,${hy + 20} l40,-80" stroke="#77838f" stroke-width="9" stroke-linecap="round"/><path d="M52,${hy - 22} l34,16" stroke="${C.gold}" stroke-width="8" stroke-linecap="round"/>` }));
    for (let i = 0; i < 3; i++) if (running) m += `<circle cx="${f1(px - 50 - i * 34)}" cy="${930 - i * 3}" r="${10 - i * 2}" fill="#f6ecd9" opacity="${f1(0.25 - i * 0.07)}"/>`;
    m += pip(px, 938, t, running);
    const lab = win(t, cue('trouble', 'Pip') - 0.2, arrive + 0.2, 0.4);

    // the haggle, remembered differently by each side
    const fade = 1 - E(t, cNo, cNo + 1.4), rise = -70 * E(t, cNo, cNo + 1.6);
    const bub = (x, y, txt, at, wd) => G(Math.min(E(t, at, at + 0.3), fade), `<rect x="${x - wd / 2}" y="${y - 44}" width="${wd}" height="64" rx="32" fill="${C.parchment}"/>` + T(x, y, txt, { size: 36, italic: true, weight: 700, fill: C.ink }), `translate(0,${f1(rise)})`);
    m += bub(1060, 690, '“Three gold?”', cPrice, 250) + bub(1650, 600, '“Five.”', cPrice + 0.8, 150) + bub(1140, 610, '“…three.”', cPrice + 1.6, 190);
    // what the ledger would have held
    const n = E(t, cNo + 0.3, cNo + 1.2);
    let slip = `<rect x="-250" y="-150" width="500" height="300" rx="10" fill="url(#paper)"/>` + T(0, -92, 'Dire incident: one mimic', { size: 34, italic: true, weight: 700, fill: C.ink });
    ['Bounty offered', 'Claimed by', 'Paid'].forEach((k, i) => {
      slip += T(-210, -26 + i * 58, k, { size: 30, italic: true, fill: C.inkSoft, anchor: 'start' }) + `<path d="M10,${-22 + i * 58} h150" stroke="${C.inkSoft}" stroke-width="2" stroke-dasharray="4 7"/>` + T(200, -22 + i * 58, '?', { size: 42, weight: 700, fill: C.ember });
    });
    s += G(a, m, 'translate(1100,940) scale(1.3) translate(-1100,-940)');
    s += G(a, T(130, 300, 'Pip Underbough', { size: 84, weight: 700, anchor: 'start', op: lab }) + T(134, 348, 'CLERK  ·  USUALLY ALONE AT THE COUNTER WHEN THINGS GO WRONG', { sans: true, weight: 700, size: 20, ls: 5, fill: C.gold, anchor: 'start', op: lab }));
    s += G(n * a, slip, `translate(430,${f1(360 + 20 * (1 - n))}) rotate(-3) scale(1.25)`);
  }
  return s;
}

function sceneGuild(t) {
  const b = beat('guild'), u = t - b.start;
  const open = E(u, 0.3, 2.0), hgt = 760 * open;
  let s = `<rect width="1920" height="1080" fill="url(#room)"/><circle cx="960" cy="480" r="760" fill="url(#warm)" opacity="0.6"/>`;
  let c = `<rect x="540" y="110" width="840" height="${f1(hgt)}" fill="url(#paper)"/>`;
  let inner = `<circle cx="960" cy="196" r="34" fill="none" stroke="${C.ink}" stroke-width="3"/><path d="M944,212 Q946,180 972,172 Q970,196 950,214z" fill="${C.ink}"/>`
    + T(960, 290, 'THE SCRIBES’ GUILD', { size: 58, weight: 700, fill: C.ink, ls: 6 }) + T(960, 338, 'a quotation, for the keeping of one bookshop’s accounts', { size: 30, italic: true, fill: C.inkSoft })
    + `<path d="M640,372 h640" stroke="${C.goldDeep}" stroke-width="2"/>`;
  const rows = [['dozen', 'SCRIBES', 'Twelve'], ['year', 'TIME', 'A year and a day'], ['gold', 'PRICE', 'More gold than the shop takes in a decade']];
  rows.forEach(([w, k, v], i) => {
    const a = E(t, cue('guild', w) - 0.15, cue('guild', w) + 0.5), y = 458 + i * 124;
    inner += T(960, y - 44, k, { sans: true, weight: 700, size: 19, ls: 7, fill: C.goldDeep, op: a }) + T(960, y + 8, v, { size: i === 2 ? 44 : 56, weight: 700, fill: i === 2 ? C.ember : C.ink, op: a });
  });
  const f = E(t, cueEnd('guild', 'decade') + 0.2, cueEnd('guild', 'decade') + 1);
  inner += T(960, 800, 'Every change alters the price.', { size: 32, italic: true, fill: C.inkSoft, op: f });
  inner += G(f, `<circle cx="1250" cy="790" r="46" fill="${C.ember}"/><circle cx="1250" cy="790" r="34" fill="none" stroke="#8a3118" stroke-width="4"/>` + T(1250, 803, 'G', { size: 44, weight: 700, fill: '#8a3118' }), `rotate(-12 1250 790)`);
  c += `<svg x="0" y="110" width="1920" height="${f1(Math.max(1, hgt))}" viewBox="0 110 1920 ${f1(Math.max(1, hgt))}">${inner}</svg>`;
  c += `<rect x="510" y="86" width="900" height="44" rx="22" fill="#d9c9a3"/><rect x="510" y="${f1(88 + hgt)}" width="900" height="44" rx="22" fill="#d9c9a3"/>`
    + `<circle cx="510" cy="108" r="26" fill="#7a4028"/><circle cx="1410" cy="108" r="26" fill="#7a4028"/><circle cx="510" cy="${f1(110 + hgt)}" r="26" fill="#7a4028"/><circle cx="1410" cy="${f1(110 + hgt)}" r="26" fill="#7a4028"/>`;
  return s + c;
}

const STAGES = [
  ['asks the questions', 'Elaboration', 'quill'], ['draws up the plan', 'Planning', 'draws'], ['several write at once', 'Development', 'Several'],
  ['reads every page back', 'Testing', 'reads'], ['carries it to the shelf', 'Deployment', 'carries'],
];
const DESK_X = [210, 540, 870, 1200, 1530];

function sceneFactory(t) {
  const b = beat('factory');
  const cRoom = cue('factory', 'scriptorium') - 0.5;
  let s = `<rect width="1920" height="1080" fill="url(#sky)"/>`;
  if (t < cRoom + 0.6) {
    const a = 1 - E(t, cRoom, cRoom + 0.6);
    const cE = cue('factory', 'EPAM'), cNot = cue('factory', 'not'), cTeam = cue('factory', 'small');
    let m = stars(t, 50, 0, 1920, 0, 700, 21);
    m += T(960, 150, 'MIRABEL SENT FOR', { sans: true, weight: 700, size: 24, ls: 10, fill: C.gold, op: E(t, cE - 0.9, cE - 0.2) });
    const e = E(t, cE - 0.1, cE + 0.7);
    m += T(960, 300 + 16 * (1 - e), 'EPAM', { size: 190, weight: 700, ls: 26, fill: C.parchment, op: e });
    m += `<path d="M${f1(960 - 250 * e)},340 h${f1(500 * e)}" stroke="${C.gold}" stroke-width="3"/>`;
    const sa = Math.min(E(t, cNot - 1.0, cNot - 0.4), 1 - 0.85 * E(t, cue('factory', 'dozen'), cue('factory', 'dozen') + 0.7)) * (1 - E(t, cTeam - 0.4, cTeam + 0.2));
    let row = '';
    for (let i = 0; i < 12; i++) row += fig({ x: 300 + i * 120, y: 640, h: 96, w: 34, head: 20, cloak: '#4a3d55', hood: true, skin: '#cdb9a5', eyes: false, bob: 2 * Math.sin(t * 2 + i) });
    row += `<path d="M250,${f1(L(560, 560, 0))} L${f1(250 + 1420 * E(t, cue('factory', 'dozen'), cue('factory', 'dozen') + 0.5))},560" stroke="${C.ember}" stroke-width="7" stroke-linecap="round"/>`;
    m += G(sa, row);
    const ta = E(t, cTeam - 0.2, cTeam + 0.6);
    let team = '';
    [760, 960, 1160].forEach((x, k) => { team += teamMember(x, 900 + 30 * (1 - E(t, cTeam - 0.2 + k * 0.15, cTeam + 0.6 + k * 0.15)), t, k, { s: 1.2 }); });
    m += G(ta, team) + T(960, 990 - 520, 'a small team', { size: 46, italic: true, op: ta * 0 });
    s += G(a, m);
  }
  if (t >= cRoom) {
    const a = E(t, cRoom, cRoom + 0.8);
    const cs = STAGES.map(([, , w]) => cue('factory', w) - 0.25);
    const cHuman = cue('factory', 'judgement') - 0.3, cTire = cue('factory', 'tireless') - 0.6;
    const active = (i) => (t >= cs[i] && (i === 4 ? t < cs[4] + 3 : t < cs[i + 1] + 0.3)) || (t > cTire);
    let m = `<rect width="1920" height="1080" fill="url(#room)"/><rect y="800" width="1920" height="280" fill="#1b1424"/>`;
    m += T(960, 96, 'THE SCRIPTORIUM THAT NEVER SLEEPS', { sans: true, weight: 700, size: 24, ls: 10, fill: C.gold });
    DESK_X.forEach((x, i) => {
      const on = E(t, cs[i], cs[i] + 0.5);
      // alcove, plaque, desk
      m += `<path d="M${x - 130},800 V330 a130,130 0 0 1 260,0 V800z" fill="#2a1f38" stroke="#3d2d4d" stroke-width="5"/>`;
      m += `<circle cx="${x}" cy="520" r="${f1(250 * on)}" fill="url(#warm)" opacity="${f1(0.9 * on)}"/>`;
      m += T(x, 300, STAGES[i][0], { size: 28, italic: true, op: L(0, 0.95, on) });
      m += T(x, 352, STAGES[i][1], { size: 44, weight: 700, fill: C.gold, op: L(0.0, 1, on) });
      m += T(x, 256, ['I', 'II', 'III', 'IV', 'V'][i], { size: 30, weight: 700, fill: C.gold, op: L(0.3, 0.9, on) });
      m += `<rect x="${x - 118}" y="640" width="236" height="20" rx="4" fill="#7a4028"/><path d="M${x - 100},660 v140 M${x + 100},660 v140" stroke="#5a3a22" stroke-width="14"/>`;
      m += `<rect x="${x + 76}" y="596" width="14" height="44" fill="#efe1c6"/><ellipse cx="${x + 83}" cy="${f1(586 - Math.sin(t * 9 + i))}" rx="6" ry="13" fill="#ffd98a"/>`;
      const act = active(i);
      if (i === 2) m += quill(x - 62, 580, t, act, 1) + quill(x, 566, t, act, 2) + quill(x + 50, 584, t, act, 3);
      else m += quill(x, 574, t, act, i);
    });
    // the little bookcase that stands for the shop
    const landed = E(t, cs[4] + 1.7, cs[4] + 2.3);
    m += `<circle cx="1790" cy="560" r="${f1(210 * landed)}" fill="url(#halo)"/><rect x="1712" y="390" width="156" height="410" rx="8" fill="#5a3a22"/><rect x="1726" y="404" width="128" height="382" fill="#2a1b2e"/>`
      + shelfRow(1736, 1846, 500, 3, 60) + shelfRow(1736, 1846, 640, 6, 60, [1776, 1812]) + shelfRow(1736, 1846, 780, 1, 60);
    m += T(1790, 368, 'the shop', { size: 30, italic: true, op: 0.9 });
    m += `<path d="M40,560 h40" stroke="none"/>`;
    // the request, travelling from desk to desk
    const pos = (i) => [i < 0 ? -80 : DESK_X[i], 618];
    let k = -1; for (let i = 0; i < 5; i++) if (t >= cs[i] - 0.7) k = i;
    const enterAt = cRoom + 0.9;
    let px, py, hop = 0;
    if (k === -1) { const p = E(t, enterAt, enterAt + 1.2); px = L(-80, 96, p); py = 560 - 40 * Math.sin(p * Math.PI); }
    else { const from = k === 0 ? [96, 560] : pos(k - 1), to = pos(k); hop = E(t, cs[k] - 0.7, cs[k]); px = L(from[0], to[0], hop); py = L(from[1], to[1], hop) - 150 * Math.sin(hop * Math.PI); }
    if (t < cs[4] + 1.0) {
      const done = k >= 3 && hop > 0.9;
      if (k >= 2 && !(k === 2 && hop < 1)) m += page(px - 14, py - 6, -8) + page(px + 12, py - 3, 7);
      m += page(px, py, hop * 360 * (k >= 0 ? 1 : 0), done && t > cs[3] + 1.0 ? tick() : '');
      if (k <= 0) m += G(1 - E(t, cs[0] + 0.6, cs[0] + 1.2), T(40, 500, 'Mirabel’s request', { size: 30, italic: true, anchor: 'start' }));
    } else {
      // bound as a book and carried to the shelf
      const p = E(t, cs[4] + 1.0, cs[4] + 2.0), bx = L(DESK_X[4], 1794, p), by = L(612, 610, p) - 170 * Math.sin(p * Math.PI);
      m += `<g transform="translate(${f1(bx)},${f1(by)}) rotate(${f1((1 - p) * -90)})"><rect x="-17" y="-30" width="34" height="60" rx="3" fill="${C.gold}"/><path d="M-17,-18h34M-17,18h34" stroke="${C.goldDeep}" stroke-width="3"/></g>`;
    }
    // the people who walk the floor
    const spot = E(t, cHuman, cHuman + 0.8);
    let folk = '';
    [[380, 0], [1035, 1], [1380, 2]].forEach(([x, kk]) => { folk += teamMember(x + 16 * Math.sin(t * 0.5 + kk * 2), 950, t, kk, { s: 0.95 }); });
    m += `<circle cx="1035" cy="800" r="${f1(330 * spot)}" fill="url(#warm)"/>` + G(L(0.5, 1, Math.max(spot, 1 - E(t, cRoom + 1, cRoom + 2.5) * 0.0)), folk);
    // a page sent back by a person
    if (t > cHuman) {
      const p1 = E(t, cHuman + 0.2, cHuman + 1.0), p2 = E(t, cHuman + 1.3, cHuman + 2.2), p3 = E(t, cHuman + 3.0, cHuman + 3.9);
      const bx = p2 > 0 ? L(1062, 870, p2) : L(1200, 1062, p1), by = (p2 > 0 ? L(770, 618, p2) : L(618, 770, p1)) - 80 * Math.sin((p2 > 0 ? p2 : p1) * Math.PI);
      const cross = `<circle cx="16" cy="22" r="14" fill="${C.ember}"/><path d="M10,16 l12,12 M22,16 l-12,12" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>`;
      if (p3 <= 0) m += page(bx, by, 0, cross, 1.15) + T(1035, 708, 'not yet right: sent back', { size: 30, italic: true, op: win(t, cHuman + 0.5, cHuman + 2.8, 0.4) });
      else m += page(L(870, 1200, p3), 618 - 120 * Math.sin(p3 * Math.PI), 0, p3 > 0.95 ? tick() : '', 1.15);
    }
    s += G(a, m);
  }
  return s;
}

const CHIPS = [['Shop front', 'shop'], ['Counter', 'counter'], ['Catalog', 'catalog'], ['Guest book', 'guest'], ['Incident board', 'incident']];

function sceneDelivered(t, shots) {
  const b = beat('delivered');
  const cShop = cue('delivered', 'shop') - 0.5, cCounter = cue('delivered', 'counter') - 0.4, cInc = cue('delivered', 'incident') - 0.5, cList = cue('delivered', 'And') + 0.9;
  let s = `<rect width="1920" height="1080" fill="url(#sky)"/>` + stars(t, 40, 0, 1920, 0, 1080, 33);
  const title = 1 - E(t, cShop - 0.3, cShop + 0.3);
  s += T(960, 470, 'Chapter One', { size: 170, italic: true, fill: C.gold, op: Math.min(title, E(t, b.start + 0.6, b.start + 1.6)) });
  s += T(960, 560, 'ALREADY WRITTEN. ALREADY WORKING.', { sans: true, weight: 700, size: 26, ls: 10, op: Math.min(title, E(t, cue('delivered', 'already'), cue('delivered', 'already') + 0.6)) });
  const fa = Math.min(E(t, cShop, cShop + 0.6), 1 - E(t, cList, cList + 0.7));
  shots.frame = fa;
  shots.scale = 0.96 + 0.04 * E(t, cShop, cShop + 1.2);
  shots.op = [1 - E(t, cCounter, cCounter + 0.5), Math.min(E(t, cCounter, cCounter + 0.5), 1 - E(t, cInc, cInc + 0.5)), E(t, cInc, cInc + 0.5)];
  shots.y = [-430 * E(t, cShop + 0.3, cCounter + 0.5), -200 * E(t, cCounter + 0.4, cInc + 0.4), -330 * E(t, cInc + 0.4, cList + 0.4)];
  s += T(960, 84, 'CHAPTER ONE  ·  DELIVERED', { sans: true, weight: 700, size: 22, ls: 9, fill: C.gold, op: fa });
  let x = 960 - (CHIPS.reduce((n, [label]) => n + 60 + label.length * 15.5 + 22, 0) - 22) / 2;
  CHIPS.forEach(([label, w]) => {
    const on = E(t, cue('delivered', w) - 0.2, cue('delivered', w) + 0.3), wd = 60 + label.length * 15.5;
    s += G(fa, `<rect x="${x}" y="882" width="${wd}" height="56" rx="28" fill="${C.gold}" opacity="${f1(L(0.0, 1, on))}"/><rect x="${x}" y="882" width="${wd}" height="56" rx="28" fill="none" stroke="${C.gold}" stroke-width="2" opacity="0.6"/>`
      + T(x + wd / 2, 919, label, { sans: true, weight: 700, size: 25, fill: on > 0.5 ? C.night : C.parchment }));
    x += wd + 22;
  });
  return s;
}

const LIST = [
  ['Regulars get 5% off, Fellows get 10%.'], ['Some tomes I want to reorder at five copies, others at one.'],
  ['When I am away, Pip may close incidents, and only then.'], ['Was this month better than last, and what did', 'that bookwyrm cost me?'],
  ['Let me mark a ward as flickering or mended.'], ['Fellows may borrow up to three tomes for a fortnight.'], ['I have hired a second clerk.'],
];

function sceneHandover(t) {
  const b = beat('handover');
  const cEnd = cue('handover', 'Today') - 0.9;
  let s = `<rect width="1920" height="1080" fill="url(#sky)"/>` + stars(t, 60, 0, 1920, 0, 1080, 44);
  if (t < cEnd + 0.7) {
    const a = 1 - E(t, cEnd, cEnd + 0.7);
    const cTop = cue('handover', 'At'), cFor = cue('handover', 'For'), cAdv = cueEnd('handover', 'adventurers');
    const z = E(t, cTop + 0.2, cFor + 0.2);
    let m = `<rect x="470" y="50" width="980" height="1200" rx="6" fill="url(#paper)"/><path d="M470,50 h980" stroke="#d9c9a3" stroke-width="10"/>`;
    m += T(960, 150, 'Mirabel’s list', { size: 76, italic: true, weight: 700, fill: C.ink }) + `<path d="M780,176 q180,18 360,0" stroke="${C.goldDeep}" stroke-width="3" fill="none"/>`;
    // the top request, underlined as it is read
    const rd = lin(t, cFor, cAdv);
    const l1 = 'For a dire incident I want to post', l2 = 'a bounty for adventurers.';
    m += `<rect x="560" y="226" width="${f1(790 * clamp(rd * 1.75))}" height="58" rx="8" fill="${C.gold}" opacity="0.45"/><rect x="560" y="292" width="${f1(560 * clamp(rd * 1.75 - 0.75) / 1)}" height="58" rx="8" fill="${C.gold}" opacity="0.45"/>`;
    m += `<rect x="520" y="240" width="28" height="28" rx="4" fill="none" stroke="${C.ink}" stroke-width="3"/>`;
    m += T(570, 270, '“' + l1, { size: 52, italic: true, weight: 700, fill: C.ink, anchor: 'start' }) + T(570, 336, l2 + '”', { size: 52, italic: true, weight: 700, fill: C.ink, anchor: 'start' });
    let y = 430;
    LIST.forEach((lines) => {
      m += `<rect x="520" y="${y - 24}" width="24" height="24" rx="4" fill="none" stroke="${C.inkSoft}" stroke-width="2.5"/>`;
      lines.forEach((ln, j) => { m += T(570, y + j * 42, ln, { size: 36, italic: true, fill: C.inkSoft, anchor: 'start' }); });
      y += 46 + lines.length * 42;
    });
    s += G(a, m, `translate(960,${f1(L(540, 470, z))}) scale(${f1(L(0.92, 1.42, z) * 1000) / 1000}) rotate(-1.2) translate(-960,${f1(L(-540, -300, z))})`);
  }
  if (t >= cEnd) {
    const a = E(t, cEnd + 0.3, cEnd + 1.1) * (1 - E(t, b.end - 1.4, b.end - 0.2));
    const cYou = cue('handover', 'you'), cEng = cue('handover', 'engineer') - 0.6, cFirst = cue('handover', 'First') - 0.2, cAfter = cue('handover', 'After') - 0.2;
    let m = `<circle cx="960" cy="190" r="260" fill="url(#halo)" opacity="0.5"/>` + crest(960, 190, 190);
    m += T(960, 372, 'CHAPTER TWO', { sans: true, weight: 700, size: 26, ls: 12, fill: C.gold, op: E(t, cEnd + 0.6, cEnd + 1.3) });
    m += T(960, 468, 'Today, you run the scriptorium.', { size: 92, weight: 700, op: E(t, cYou - 0.3, cYou + 0.6) });
    m += T(960, 530, 'You need not be an engineer to do it.', { size: 42, italic: true, op: E(t, cEng, cEng + 0.8) });
    const row = (y, num, head, txt, at) => {
      const e = E(t, at, at + 0.7);
      return G(e, `<path d="M520,${y - 62} h880" stroke="${C.gold}" stroke-width="1.5" opacity="0.5"/>` + T(560, y, num, { size: 60, weight: 700, fill: C.gold, anchor: 'start' })
        + T(680, y - 24, head, { sans: true, weight: 700, size: 21, ls: 7, fill: C.gold, anchor: 'start' }) + T(680, y + 34, txt, { size: 56, italic: true, anchor: 'start' }), `translate(${f1(30 * (1 - e))},0)`);
    };
    m += row(672, 'I.', 'FIRST, TOGETHER', 'The bounty board.', cFirst) + row(812, 'II.', 'AFTER THAT', 'Mirabel’s list is yours.', cAfter);
    const end = E(t, cueEnd('handover', 'yours') + 0.6, cueEnd('handover', 'yours') + 1.6);
    m += T(960, 950, 'The Gilded Griffin  ·  Occasionally beset. Never closed.', { size: 34, italic: true, fill: C.gold, op: end });
    s += G(a, m);
  }
  return s;
}

const SCENES = { shop: sceneShop, mirabel: sceneMirabel, trouble: sceneTrouble, guild: sceneGuild, factory: sceneFactory, delivered: sceneDelivered, handover: sceneHandover };

// ---------- putting a frame together ----------
const stage = document.getElementById('stage'), overlay = document.getElementById('top'), shotsBox = document.getElementById('shots');
const shotImgs = [0, 1, 2].map((i) => document.getElementById('shot' + i));

function draw(t) {
  t = clamp(t, 0, TL.duration - 0.001);
  let svg = DEFS;
  const shots = { frame: 0, scale: 1, op: [0, 0, 0], y: [0, 0, 0] };
  let fade = 1;
  for (const id of TL.order) {
    const b = beat(id);
    if (t < b.start || t >= b.end) continue;
    const first = id === TL.order[0], last = id === TL.order.at(-1);
    fade = Math.min(E(t, b.start, b.start + (first ? 1.6 : 0.55)), last ? 1 : 1 - E(t, b.end - 0.55, b.end));
    svg += G(fade, SCENES[id](t, shots));
  }
  stage.innerHTML = svg;
  shotsBox.style.opacity = shots.frame * fade;
  shotsBox.style.transform = `scale(${shots.scale})`;
  shotImgs.forEach((img, i) => { img.style.opacity = shots.op[i]; img.style.transform = `translateY(${shots.y[i]}px)`; });
  // captions and the soft dark edge sit above everything
  let cap = '';
  for (const [i, c] of TL.captions.entries()) {
    const next = TL.captions[i + 1];
    const a = win(t, c.t0 - 0.12, Math.min(c.t1 + 0.3, next ? next.t0 - 0.13 : 1e9), 0.12);
    if (a <= 0) continue;
    const wd = c.text.length * 15.2 + 56;
    cap += `<rect x="${f1(960 - wd / 2)}" y="992" width="${f1(wd)}" height="52" rx="26" fill="#0b0a16" opacity="${f1(a * 0.62 * 100) / 100}"/>`
      + T(960, 1028, c.text, { sans: true, size: 30, weight: 400, op: a });
  }
  overlay.innerHTML = `${DEFS.replace(/id="/g, 'id="t-')}<rect width="1920" height="1080" fill="url(#t-vig)"/>${cap}`;
}
window.draw = draw;

// ---------- playing it in a browser (not used when capturing) ----------
if (!new URLSearchParams(location.search).has('capture')) {
  const fit = () => { const k = Math.min(innerWidth / 1920, (innerHeight - 40) / 1080); document.getElementById('frame').style.transform = `scale(${k})`; };
  addEventListener('resize', fit); fit();
  const scrub = document.getElementById('scrub'), clock = document.getElementById('clock'), play = document.getElementById('play');
  scrub.max = TL.duration;
  const audio = new Audio('audio/soundtrack.m4a');
  let playing = false, t0 = 0, w0 = 0;
  const show = (t) => { draw(t); scrub.value = t; clock.textContent = `${t.toFixed(1)} / ${TL.duration.toFixed(1)} s`; };
  const loop = () => { if (!playing) return; const t = t0 + (performance.now() - w0) / 1000; if (t >= TL.duration) { playing = false; play.textContent = 'Play'; return; } show(t); requestAnimationFrame(loop); };
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing) { t0 = +scrub.value; w0 = performance.now(); audio.currentTime = t0; audio.play().catch(() => {}); loop(); } else audio.pause(); };
  scrub.oninput = () => { playing = false; audio.pause(); play.textContent = 'Play'; show(+scrub.value); };
  document.fonts.ready.then(() => show(+(new URLSearchParams(location.search).get('t') || 0)));
} else {
  document.body.classList.add('capture');
}
