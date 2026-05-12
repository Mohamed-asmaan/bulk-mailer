/** Inline illustration — replaces missing raster hero asset in repo. */
export default function HeroGraphic({ className = "" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="hg-a" x1="80" y1="40" x2="360" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3b82f6" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="280" rx="160" ry="28" fill="url(#hg-a)" />
      <path
        d="M72 118h256c12 0 22 10 22 22v132c0 12-10 22-22 22H72c-12 0-22-10-22-22V140c0-12 10-22 22-22z"
        fill="#0f172a"
        stroke="#38bdf8"
        strokeWidth="3"
        strokeOpacity="0.5"
      />
      <path
        d="M72 118l128 88 128-88"
        stroke="#67e8f9"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M72 258l104-74M328 258L224 184" stroke="#38bdf8" strokeOpacity="0.4" strokeWidth="2" />
    </svg>
  );
}
