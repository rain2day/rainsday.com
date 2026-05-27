import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Connected brush stroke connecting nodes — for career timeline backdrop
export const BrushTimeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Loop progress (continuous, no hard cut)
  const t = (frame / durationInFrames) % 1;

  // 4 nodes along the timeline
  const nodes = [
    { x: 0.10, label: "2007" },
    { x: 0.36, label: "2014" },
    { x: 0.66, label: "2025" },
    { x: 0.92, label: "2026" },
  ];

  // Brush stroke pulse — sweep highlight along the stroke
  const sweep = t * 1.4 - 0.2; // -0.2..1.2

  return (
    <AbsoluteFill style={{ background: "#F1ECDF" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="brushGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(27, 23, 20, 0.30)" />
            <stop offset="50%" stopColor="rgba(27, 23, 20, 0.55)" />
            <stop offset="100%" stopColor="rgba(27, 23, 20, 0.30)" />
          </linearGradient>
          <linearGradient id="sweepGrad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="rgba(179, 58, 30, 0)" />
            <stop offset="50%" stopColor="rgba(179, 58, 30, 0.8)" />
            <stop offset="100%" stopColor="rgba(179, 58, 30, 0)" />
          </linearGradient>
        </defs>

        {/* Main brush stroke — uneven path with slight wave */}
        <path
          d={`M 60 ${height * 0.55}
              C ${width * 0.25} ${height * 0.52},
                ${width * 0.45} ${height * 0.6},
                ${width * 0.6} ${height * 0.5}
              S ${width * 0.85} ${height * 0.62},
                ${width - 60} ${height * 0.55}`}
          stroke="url(#brushGrad)"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
        />

        {/* Ghost shadow stroke */}
        <path
          d={`M 60 ${height * 0.57}
              C ${width * 0.25} ${height * 0.54},
                ${width * 0.45} ${height * 0.62},
                ${width * 0.6} ${height * 0.52}
              S ${width * 0.85} ${height * 0.64},
                ${width - 60} ${height * 0.57}`}
          stroke="rgba(27, 23, 20, 0.14)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />

        {/* Bristle texture — small parallel hairs along stroke */}
        {Array.from({ length: 18 }).map((_, i) => {
          const px = 60 + (i / 17) * (width - 120);
          const py = height * 0.55 + Math.sin(i * 0.7) * 8;
          return (
            <line
              key={i}
              x1={px}
              y1={py - 4}
              x2={px}
              y2={py + 4}
              stroke="rgba(27, 23, 20, 0.18)"
              strokeWidth={0.5}
            />
          );
        })}

        {/* Animated 朱 sweep highlight — clipped to a horizontal band */}
        <rect
          x={sweep * width - 80}
          y={height * 0.5 - 2}
          width={160}
          height={10}
          fill="url(#sweepGrad)"
          opacity={0.7}
        />

        {/* Nodes */}
        {nodes.map((n, i) => {
          const nx = n.x * width;
          const ny = height * 0.55;
          const localT = Math.sin((frame / fps) * 1.4 + i * 0.6) * 0.5 + 0.5;
          return (
            <g key={i}>
              <circle cx={nx} cy={ny} r={12} fill="#F1ECDF" stroke="#1B1714" strokeWidth={1.2} />
              <circle cx={nx} cy={ny} r={5} fill="#B33A1E" opacity={0.65 + localT * 0.35} />
              {/* Label */}
              <text
                x={nx}
                y={ny + 38}
                textAnchor="middle"
                fontFamily="JetBrains Mono, monospace"
                fontSize={14}
                fill="rgba(122, 110, 92, 0.8)"
                letterSpacing={1.5}
              >
                {n.label}
              </text>
              {/* Tick line down from node */}
              <line
                x1={nx}
                y1={ny + 14}
                x2={nx}
                y2={ny + 22}
                stroke="rgba(27, 23, 20, 0.4)"
                strokeWidth={0.6}
              />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
