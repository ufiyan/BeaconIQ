// BeaconIQ brand mark — a geometric "B" on a deep navy tile with a warm-gold
// beacon dot. Pure SVG, pixel-crisp at any size from favicon to hero.
//
// Props:
//   size      — square pixel size (default 32)
//   className — extra classes on the <svg>
//   withGold  — toggle the gold beacon dot (keep on by default; off only for
//               mono contexts like tiny favicons where the dot would blur)
//   glow      — adds a soft outer glow around the beacon dot. Use on large
//               hero / auth contexts only — off by default to keep small
//               sizes crisp.
export default function BrandMark({ size = 32, className = "", withGold = true, glow = false }) {
  // Unique IDs per instance so multiple marks on the same page don't collide.
  const uid = `bm-${Math.round(size)}-${withGold ? "g" : "n"}${glow ? "w" : ""}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="BeaconIQ"
      role="img"
    >
      <defs>
        {/* Navy tile gradient — subtle top-to-bottom to add depth without noise */}
        <linearGradient id={`${uid}-tile`} x1="0" y1="0" x2="0" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#15213E" />
          <stop offset="100%" stopColor="#0C1428" />
        </linearGradient>
        {/* B gradient — premium blue, brighter at top for optical lift */}
        <linearGradient id={`${uid}-b`} x1="12" y1="10" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7DB4FF" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        {glow && (
          <radialGradient id={`${uid}-glow`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#F5B544" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#F5B544" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#F5B544" stopOpacity="0" />
          </radialGradient>
        )}
      </defs>

      {/* Rounded navy tile with hairline edge for premium feel */}
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="9.5"
        fill={`url(#${uid}-tile)`}
        stroke="rgba(255,255,255,0.07)"
      />

      {/* Geometric B — two balanced, rounded lobes on a shared stem.
          Stem: 14x22 rectangle. Top lobe: evenly arced. Bottom lobe: slightly
          larger for optical balance (classic typographic convention). */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 11a1 1 0 0 1 1-1h9.25a5.75 5.75 0 0 1 3.77 10.09A6.25 6.25 0 0 1 22.5 30H13a1 1 0 0 1-1-1V11Zm3.2 2.2v5.9h6.55a2.95 2.95 0 1 0 0-5.9h-6.55Zm0 8.5v6.1h7.05a3.05 3.05 0 1 0 0-6.1h-7.05Z"
        fill={`url(#${uid}-b)`}
      />

      {/* Warm-gold beacon — the signal. Placed at top-right of the tile. */}
      {withGold && (
        <>
          {glow && <circle cx="29.5" cy="11.5" r="7" fill={`url(#${uid}-glow)`} />}
          <circle cx="29.5" cy="11.5" r="2.1" fill="#F5B544" />
          <circle cx="29.5" cy="11.5" r="2.1" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        </>
      )}
    </svg>
  );
}