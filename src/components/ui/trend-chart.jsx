import { useId, useMemo, useRef, useState } from "react";

// Dependency-free SVG trend chart for the admin console.
//   points  — number[]
//   labels  — string[] (same length; shown in the tooltip and on the x-axis)
//   type    — "area" (cumulative metrics) | "bar" (daily counts)
//   format  — value formatter for axis labels and the tooltip
// Renders gridlines, min/max axis labels and a nearest-point hover tooltip.
// Pure SVG + one absolutely-positioned div, so there is no chart library
// weight and nothing runs per-frame.

const W = 600;
const H = 180;
const PAD_X = 6;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

export default function TrendChart({
  points = [],
  labels = [],
  type = "area",
  color = "#0d9488",
  format = (v) => String(v),
}) {
  const gradId = useId();
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // index | null

  const max = Math.max(1, ...points);
  const innerH = H - PAD_TOP - PAD_BOTTOM;
  const innerW = W - PAD_X * 2;
  const n = points.length;

  const x = (i) => PAD_X + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => PAD_TOP + innerH - (v / max) * innerH;

  const areaPath = useMemo(() => {
    if (!n) return "";
    const line = points.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");
    return {
      line,
      area: `${line} L${x(n - 1)},${PAD_TOP + innerH} L${x(0)},${PAD_TOP + innerH} Z`,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.join(","), n, max]);

  function onMove(e) {
    if (!n || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const fx = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((fx - PAD_X) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  }

  const gridYs = [0.5, 1].map((f) => y(max * f));
  const barW = n ? Math.max(2, Math.min(18, (innerW / n) * 0.6)) : 0;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Gridlines + y labels */}
        {gridYs.map((gy, gi) => (
          <g key={gi}>
            <line x1={PAD_X} x2={W - PAD_X} y1={gy} y2={gy} stroke="var(--chart-grid)" strokeDasharray="4 4" strokeWidth="1" />
            <text x={PAD_X + 2} y={gy - 4} fontSize="10" fill="var(--chart-text)">
              {format(Math.round(max * (gi === 0 ? 0.5 : 1)))}
            </text>
          </g>
        ))}
        <line x1={PAD_X} x2={W - PAD_X} y1={PAD_TOP + innerH} y2={PAD_TOP + innerH} stroke="var(--chart-grid)" strokeWidth="1" />

        {/* Data */}
        {type === "bar" ? (
          points.map((v, i) => (
            <rect
              key={i}
              x={x(i) - barW / 2}
              y={v ? y(v) : PAD_TOP + innerH - 1}
              width={barW}
              height={v ? PAD_TOP + innerH - y(v) : 1}
              rx={Math.min(3, barW / 2)}
              fill={hover === i ? color : `${color}99`}
            />
          ))
        ) : (
          <>
            <path d={areaPath.area} fill={`url(#${gradId})`} />
            <path
              d={areaPath.line}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        {/* Hover marker */}
        {hover !== null && n > 0 && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD_TOP} y2={PAD_TOP + innerH} stroke="var(--chart-grid)" strokeWidth="1" />
            {type !== "bar" && (
              <circle cx={x(hover)} cy={y(points[hover])} r="4" fill="#fff" stroke={color} strokeWidth="2" />
            )}
          </g>
        )}

        {/* X labels: first / middle / last */}
        {n > 1 &&
          [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => (
            <text
              key={k}
              x={x(i)}
              y={H - 6}
              fontSize="10"
              fill="var(--chart-text)"
              textAnchor={k === 0 ? "start" : k === 2 ? "end" : "middle"}
            >
              {labels[i] ?? ""}
            </text>
          ))}
      </svg>

      {/* Tooltip */}
      {hover !== null && n > 0 && (
        <div
          className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <span className="mr-1.5 text-slate-400">{labels[hover]}</span>
          {format(points[hover])}
        </div>
      )}
    </div>
  );
}
