import BrandMark from "./BrandMark";

// Full BeaconIQ lockup: mark + wordmark, optically balanced for nav / header / sidebar.
//
// Props:
//   size      — icon pixel size. Wordmark size scales with it.
//   className — extra classes on the wrapper
//   glow      — pass through to BrandMark (use on hero/auth only)
//   tone      — "light" (white wordmark on dark, default) | "muted" (softer)
export default function BrandLockup({ size = 30, className = "", glow = false, tone = "light" }) {
  // Optical sizing: wordmark reads best at ~52% of the tile height at these sizes.
  const wordSize = Math.max(13, Math.round(size * 0.52));
  // Gap scales gently with size so small lockups feel tight and big ones feel airy.
  const gapPx = size >= 36 ? 10 : size >= 28 ? 9 : 7;

  const wordColor = tone === "muted" ? "text-slate-200" : "text-white";

  return (
    <span className={`inline-flex items-center ${className}`} style={{ gap: `${gapPx}px` }}>
      <BrandMark size={size} glow={glow} />
      <span
        className={`font-semibold tracking-tight ${wordColor}`}
        style={{
          fontSize: `${wordSize}px`,
          letterSpacing: "-0.015em",
          lineHeight: 1,
        }}
      >
        Beacon<span className="text-slate-300 font-semibold">IQ</span>
      </span>
    </span>
  );
}