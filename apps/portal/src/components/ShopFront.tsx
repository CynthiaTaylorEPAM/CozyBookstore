// The hero illustration: the shop front on a quiet night. Pure SVG, no image files.

const SPINE_COLOURS = ['#8f3554', '#2f5d50', '#d9a441', '#4b2e6b', '#b0702a', '#2e4a6b', '#8a3b22', '#55702f'];

/** One shelf of book spines in the bay window. */
function Shelf({ y, seed }: { y: number; seed: number }) {
  const spines = [];
  let x = 160;
  for (let i = 0; x < 286; i++) {
    const width = 7 + ((i * 5 + seed * 3) % 6);
    const height = 24 + ((i * 7 + seed * 11) % 10);
    spines.push(
      <rect key={i} x={x} y={y - height} width={width} height={height} rx={1} fill={SPINE_COLOURS[(i + seed) % SPINE_COLOURS.length]} />,
    );
    x += width + 2;
  }
  return (
    <g>
      {spines}
      <rect x={154} y={y} width={142} height={4} fill="#5a3a22" />
    </g>
  );
}

export function ShopFront() {
  return (
    <svg className="shop-front" viewBox="0 0 560 520" role="img" aria-label="The Gilded Griffin bookshop at night, its windows glowing">
      {/* Ids carry a shopfront- prefix: this inline SVG shares the page's id namespace with the landing sections. */}
      <defs>
        <radialGradient id="shopfront-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shopfront-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe2a0" />
          <stop offset="100%" stopColor="#f2a444" />
        </linearGradient>
        <linearGradient id="shopfront-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#59405a" />
          <stop offset="100%" stopColor="#3d2a40" />
        </linearGradient>
      </defs>

      {/* Moon, stars and a very small dragon */}
      <circle cx="92" cy="92" r="90" fill="url(#shopfront-halo)" opacity="0.6" />
      <circle cx="92" cy="92" r="38" fill="#f6ecd9" />
      <circle cx="80" cy="82" r="6" fill="#e6d8bd" />
      <circle cx="104" cy="104" r="9" fill="#e6d8bd" />
      <path className="dragon" d="M150 70q10-16 22-4 4-10 14-9-6 6-5 13 9-3 15 4-10 0-15 6-9-7-17-2-6-8-14-8z" fill="#1c1a2e" />
      {[
        [210, 40], [300, 62], [470, 48], [520, 130], [30, 190], [420, 110], [250, 22], [500, 215], [40, 300],
      ].map(([cx, cy], i) => (
        <circle key={i} className="star" style={{ animationDelay: `${i * 0.7}s` }} cx={cx} cy={cy} r={i % 3 === 0 ? 2.4 : 1.6} fill="#f6ecd9" />
      ))}

      {/* Chimney and smoke */}
      <rect x="356" y="128" width="36" height="80" fill="#2f2033" />
      <rect x="351" y="122" width="46" height="10" rx="2" fill="#241827" />
      <g className="smoke" fill="#f6ecd9" opacity="0.18">
        <circle cx="374" cy="104" r="10" />
        <circle cx="386" cy="82" r="13" />
        <circle cx="372" cy="56" r="16" />
      </g>

      {/* The building */}
      <polygon points="118,472 118,236 280,122 442,236 442,472" fill="url(#shopfront-wall)" />
      <g stroke="#2a1b2e" strokeWidth="7" strokeLinecap="round">
        <path d="M118 262h324M118 472V240M442 472V240M280 126v136M190 262l-40-52M370 262l40-52" />
      </g>
      <path d="M92 246 280 100l188 146-22 12L280 134 114 258z" fill="#241827" />
      <path d="M92 246 280 100l188 146" fill="none" stroke="#d9a441" strokeWidth="2" opacity="0.5" />

      {/* Attic window */}
      <circle cx="280" cy="208" r="52" fill="url(#shopfront-halo)" />
      <circle cx="280" cy="208" r="25" fill="url(#shopfront-window)" stroke="#2a1b2e" strokeWidth="6" />
      <path d="M280 183v50M255 208h50" stroke="#2a1b2e" strokeWidth="4" />

      {/* Bay window full of books */}
      <rect x="110" y="270" width="230" height="200" fill="url(#shopfront-halo)" />
      <rect x="148" y="288" width="154" height="140" rx="6" fill="url(#shopfront-window)" stroke="#2a1b2e" strokeWidth="8" />
      <Shelf y={336} seed={1} />
      <Shelf y={382} seed={4} />
      {/* The shop cat */}
      <g fill="#241827">
        <ellipse cx="262" cy="415" rx="20" ry="11" />
        <circle cx="246" cy="402" r="9" />
        <path d="M239 397l1-11 7 6zM253 397l1-11-7 5z" />
        <path d="M280 416q14 2 12-12" fill="none" stroke="#241827" strokeWidth="5" strokeLinecap="round" />
      </g>
      <path d="M225 288v140M148 344h154" stroke="#2a1b2e" strokeWidth="4" opacity="0.55" />
      <rect x="138" y="428" width="174" height="12" rx="3" fill="#2a1b2e" />

      {/* Door and lantern */}
      <path d="M344 472V348a36 36 0 0 1 72 0v124z" fill="#7a4028" stroke="#2a1b2e" strokeWidth="7" />
      <circle cx="380" cy="356" r="13" fill="url(#shopfront-window)" stroke="#2a1b2e" strokeWidth="4" />
      <circle cx="404" cy="414" r="4" fill="#d9a441" />
      <circle cx="326" cy="318" r="34" fill="url(#shopfront-halo)" />
      <path d="M326 296v8" stroke="#d9a441" strokeWidth="3" />
      <rect className="lantern" x="319" y="304" width="14" height="20" rx="3" fill="#ffd98a" stroke="#d9a441" strokeWidth="3" />

      {/* Hanging sign */}
      <path d="M442 286h66" stroke="#2a1b2e" strokeWidth="6" strokeLinecap="round" />
      <g className="sign">
        <path d="M468 288v12M502 288v12" stroke="#d9a441" strokeWidth="2" />
        <rect x="454" y="300" width="62" height="54" rx="7" fill="#241827" stroke="#d9a441" strokeWidth="3" />
        <path d="M469 320c6-4 11-4 16 0 5-4 10-4 16 0v18c-6-4-11-4-16 0-5-4-10-4-16 0z" fill="#f6ecd9" />
        <path d="M485 320v18" stroke="#241827" strokeWidth="2" />
      </g>

      {/* Cobbles */}
      <rect x="-3000" y="470" width="6560" height="50" fill="#15131f" />
      <g fill="#262238">
        {[20, 80, 140, 205, 265, 330, 395, 455, 515].map((x, i) => (
          <ellipse key={x} cx={x + (i % 2) * 12} cy={488 + (i % 3) * 8} rx="24" ry="6" />
        ))}
      </g>
      <path d="M344 472h72l26 48H318z" fill="#ffd98a" opacity="0.12" />
    </svg>
  );
}
