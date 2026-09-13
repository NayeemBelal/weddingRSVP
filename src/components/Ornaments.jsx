/* Gold corner flourish, drawn once and mirrored for each corner. */
export function CornerFlourish({ className = "" }) {
  // A leaf on the vine: small, pointed, drawn once and placed by transform.
  const Leaf = ({ x, y, r, s = 1 }) => (
    <path
      d="M0 0 c 4 -6 12 -6 16 0 c -4 6 -12 6 -16 0z"
      transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}
      fill="currentColor"
      stroke="none"
      opacity="0.75"
    />
  );
  return (
    <svg
      className={`corner ${className}`}
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* arm along the top edge */}
      <path d="M8 8 C 40 4, 70 12, 100 8 S 150 4, 176 10" />
      <path d="M176 10 c 8 2 12 8 8 14 c -3 4 -9 3 -9 -1 c 0 -3 4 -4 5 -1" />
      <Leaf x={30} y={8} r={-30} s={0.9} />
      <Leaf x={58} y={10} r={20} s={0.8} />
      <Leaf x={88} y={8} r={-28} s={0.9} />
      <Leaf x={118} y={8} r={22} s={0.8} />
      <Leaf x={148} y={7} r={-26} s={0.8} />

      {/* arm along the left edge */}
      <path d="M8 8 C 4 40, 12 70, 8 100 S 4 150, 10 176" />
      <path d="M10 176 c 2 8 8 12 14 8 c 4 -3 3 -9 -1 -9 c -3 0 -4 4 -1 5" />
      <Leaf x={8} y={30} r={60} s={0.9} />
      <Leaf x={10} y={58} r={110} s={0.8} />
      <Leaf x={8} y={88} r={62} s={0.9} />
      <Leaf x={8} y={118} r={112} s={0.8} />
      <Leaf x={7} y={148} r={64} s={0.8} />

      {/* diagonal scroll curling into the corner */}
      <path d="M14 14 C 40 30, 60 50, 68 78 c 4 14 -6 24 -16 18 c -8 -5 -4 -16 4 -14 c 5 1 6 7 2 9" />
      <path d="M14 14 C 30 40, 50 60, 78 68 c 14 4 24 -6 18 -16 c -5 -8 -16 -4 -14 4 c 1 5 7 6 9 2" />
      <Leaf x={34} y={30} r={40} s={0.8} />
      <Leaf x={30} y={34} r={50} s={0.8} />
      <Leaf x={50} y={52} r={38} s={0.7} />
      <Leaf x={52} y={50} r={52} s={0.7} />

      {/* berries */}
      <circle cx="44" cy="16" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="16" cy="44" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="104" cy="16" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="16" cy="104" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="62" cy="66" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* Double-rule frame around the whole document, with a flourish in each corner. */
export function PageFrame() {
  return (
    <div className="frame" aria-hidden="true">
      {/* Phones: the illustrated rose border. Larger screens: the drawn double rule below. */}
      <div className="frame-art" />
      <div className="frame-outer" />
      <div className="frame-inner" />
      <CornerFlourish className="corner-tl" />
      <CornerFlourish className="corner-tr" />
      <CornerFlourish className="corner-bl" />
      <CornerFlourish className="corner-br" />
    </div>
  );
}

/* N | F wreath monogram, from the couple's artwork. */
export function Monogram({ size = 120, className = "" }) {
  return (
    <img
      src="/monogram.webp"
      alt="N and F monogram"
      className={`monogram ${className}`}
      width={size}
      height={size}
      draggable="false"
    />
  );
}
