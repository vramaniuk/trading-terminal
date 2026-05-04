const SEGMENTS = [
  { color: "#EA3943" },
  { color: "#EA8C00" },
  { color: "#F3D42F" },
  { color: "#93D900" },
  { color: "#16C784" },
];

export function FearGreedGauge({ value, loading }: { value: number; loading: boolean }) {
  const cx = 65;
  const cy = 70;
  const r = 55;
  const GAP_DEG = 2.5;
  const segSpan = (180 - 4 * GAP_DEG) / 5;

  function polarToXY(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }

  function arcPath(startAngle: number, endAngle: number) {
    const p1 = polarToXY(startAngle);
    const p2 = polarToXY(endAngle);
    return `M ${p1.x.toFixed(4)} ${p1.y.toFixed(4)} A ${r} ${r} 0 0 0 ${p2.x.toFixed(4)} ${p2.y.toFixed(4)}`;
  }

  const needleAngle = 180 - (value / 100) * 180;
  const needlePt = polarToXY(needleAngle);

  return (
    <div
      style={{
        position: "relative",
        width: 130,
        height: 75,
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
      }}
    >
      <svg width="130" height="75" viewBox="0 0 130 75" aria-hidden="true">
        {SEGMENTS.map((seg, i) => {
          const startAngle = 180 - i * (segSpan + GAP_DEG);
          const endAngle = startAngle - segSpan;
          return (
            <path
              key={seg.color}
              d={arcPath(startAngle, endAngle)}
              stroke={seg.color}
              strokeWidth="6"
              strokeLinecap="round"
              fill="none"
            />
          );
        })}
        {!loading && (
          <>
            <circle
              cx={needlePt.x}
              cy={needlePt.y}
              r="6"
              fill="none"
              stroke="white"
              strokeWidth="2"
              style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
            <circle
              cx={needlePt.x}
              cy={needlePt.y}
              r="5"
              fill="black"
              style={{ transition: "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
            />
          </>
        )}
      </svg>
    </div>
  );
}

export function fngColor(value: number): string {
  if (value <= 25) return "oklch(0.637 0.220 25)";
  if (value <= 45) return "oklch(0.720 0.185 55)";
  if (value <= 55) return "oklch(0.820 0.160 90)";
  if (value <= 75) return "oklch(0.780 0.185 145)";
  return "oklch(0.723 0.185 150)";
}
