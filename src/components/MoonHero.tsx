// Landing background: a rose moon rising over a wine surface. Decorative, hidden from screen readers.
// Star positions use a fixed seed so the sky looks the same on every load.

const STARS = Array.from({ length: 70 }, (_, i) => {
  const r = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { x: r(1) * 1600, y: r(2) * 560, s: 0.5 + r(3) * 1.3, o: 0.15 + r(4) * 0.5, d: 3 + r(5) * 5 };
});

export default function MoonHero() {
  return (
    <svg
      className="moon-hero"
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
      focusable="false"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: -1, pointerEvents: "none" }}
    >
      <defs>
        <radialGradient id="mh-glow" cx="50%" cy="38%" r="45%">
          <stop offset="0%" stopColor="#f399b3" stopOpacity="0.28" />
          <stop offset="45%" stopColor="#f399b3" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#f399b3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mh-moon" cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fff3f6" />
          <stop offset="55%" stopColor="#f7c3d2" />
          <stop offset="100%" stopColor="#d9849d" />
        </radialGradient>
        <linearGradient id="mh-wine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5a1f33" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#2e0f1b" />
          <stop offset="100%" stopColor="#121212" />
        </linearGradient>
        <linearGradient id="mh-path" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f399b3" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#f399b3" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mh-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#121212" stopOpacity="1" />
          <stop offset="18%" stopColor="#121212" stopOpacity="0" />
          <stop offset="82%" stopColor="#121212" stopOpacity="0" />
          <stop offset="100%" stopColor="#121212" stopOpacity="1" />
        </linearGradient>
        <filter id="mh-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <style>{`
        .moon-hero .mh-star { animation: mh-twinkle var(--d) ease-in-out infinite alternate; }
        .moon-hero .mh-orb { animation: mh-rise 2.4s cubic-bezier(.16,1,.3,1) both, mh-float 9s ease-in-out 2.4s infinite alternate; transform-box: fill-box; transform-origin: center; }
        .moon-hero .mh-shimmer { animation: mh-shimmer 6s ease-in-out infinite alternate; }
        @keyframes mh-twinkle { from { opacity: var(--o); } to { opacity: calc(var(--o) * 0.35); } }
        @keyframes mh-rise { from { transform: translateY(70px); opacity: 0; } to { transform: none; opacity: 1; } }
        @keyframes mh-float { from { transform: translateY(0); } to { transform: translateY(-10px); } }
        @keyframes mh-shimmer { from { opacity: 0.9; } to { opacity: 0.55; } }
        @media (prefers-reduced-motion: reduce) { .moon-hero * { animation: none !important; } }
      `}</style>

      {STARS.map((s, i) => (
        <circle
          key={i}
          className="mh-star"
          cx={s.x}
          cy={s.y}
          r={s.s}
          fill="#fff"
          style={{ opacity: s.o, ["--o" as string]: s.o, ["--d" as string]: `${s.d}s` }}
        />
      ))}

      <rect x="0" y="0" width="1600" height="1000" fill="url(#mh-glow)" />

      <g className="mh-orb">
        <circle cx="800" cy="390" r="128" fill="#f399b3" opacity="0.18" filter="url(#mh-blur)" />
        <circle cx="800" cy="390" r="112" fill="url(#mh-moon)" />
        <circle cx="760" cy="360" r="18" fill="#d9849d" opacity="0.18" />
        <circle cx="838" cy="420" r="26" fill="#d9849d" opacity="0.14" />
        <circle cx="822" cy="338" r="10" fill="#d9849d" opacity="0.16" />
        <circle cx="772" cy="438" r="8" fill="#d9849d" opacity="0.14" />
      </g>

      {/* Wine surface: a slightly curved horizon with a glowing rim */}
      <path d="M0 690 Q800 650 1600 690 L1600 1000 L0 1000 Z" fill="url(#mh-wine)" />
      <path d="M0 690 Q800 650 1600 690" fill="none" stroke="#f399b3" strokeOpacity="0.45" strokeWidth="1.5" />

      {/* Moonlight path reflected on the wine */}
      <g className="mh-shimmer">
        <path d="M770 672 L830 672 L900 1000 L700 1000 Z" fill="url(#mh-path)" opacity="0.5" />
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <rect key={k} x={800 - (40 + k * 18) / 2} y={690 + k * 26} width={40 + k * 18} height="2" rx="1" fill="#f399b3" opacity={0.5 - k * 0.06} />
        ))}
      </g>

      <rect x="0" y="0" width="1600" height="1000" fill="url(#mh-fade)" />
    </svg>
  );
}
