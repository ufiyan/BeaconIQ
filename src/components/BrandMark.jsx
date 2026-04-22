// BeaconIQ brand mark — a geometric "B" constructed from stacked rounded bars
// with a small warm-gold beacon dot. Crisp as SVG at any size.
export default function BrandMark({ size = 32, className = "", withGold = true }) {
  const id = `bm-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0F1B34" />
          <stop offset="100%" stopColor="#162447" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="10" y1="8" x2="30" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      {/* Rounded navy tile */}
      <rect x="0.5" y="0.5" width="39" height="39" rx="9.5" fill={`url(#${id}-bg)`} stroke="rgba(255,255,255,0.06)" />
      {/* Stylized geometric "B" */}
      <path
        d="M13 10.5h9.5a5.25 5.25 0 0 1 2.4 9.92 5.75 5.75 0 0 1-2.9 10.58H13V10.5Zm3.4 3.1v6.05h5.9a3.025 3.025 0 0 0 0-6.05h-5.9Zm0 9.1v6.25h6.4a3.125 3.125 0 0 0 0-6.25h-6.4Z"
        fill={`url(#${id}-b)`}
      />
      {/* Warm-gold beacon dot — subtle premium accent */}
      {withGold && <circle cx="29" cy="12" r="2" fill="#F5B544" />}
    </svg>
  );
}