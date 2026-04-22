import BrandMark from "./BrandMark";

// Full BeaconIQ lockup: mark + wordmark, balanced for nav / header rows.
// size controls the icon; the wordmark scales with a matched optical weight.
export default function BrandLockup({ size = 28, className = "", wordClassName = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <BrandMark size={size} />
      <span
        className={`font-semibold tracking-tight text-white ${wordClassName}`}
        style={{ fontSize: Math.round(size * 0.54), letterSpacing: "-0.01em" }}
      >
        BeaconIQ
      </span>
    </span>
  );
}