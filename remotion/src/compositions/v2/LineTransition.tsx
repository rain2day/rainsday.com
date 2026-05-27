import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

// Single ink line drawing across with small branches
export const LineTransition: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const mainProgress = interpolate(frame, [0, durationInFrames * 0.7], [0, 1], {
    extrapolateRight: "clamp",
  });

  const mainY = height * 0.5;
  const mainEndX = mainProgress * width;

  // Branches off the main line
  const branches = [
    { x: 0.15, top: true, len: 80, delay: 0.05 },
    { x: 0.32, top: false, len: 60, delay: 0.12 },
    { x: 0.48, top: true, len: 110, delay: 0.22 },
    { x: 0.66, top: false, len: 70, delay: 0.32 },
    { x: 0.84, top: true, len: 50, delay: 0.44 },
  ];

  return (
    <AbsoluteFill style={{ background: "#F1ECDF" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {/* Main line */}
        <line
          x1={0}
          y1={mainY}
          x2={mainEndX}
          y2={mainY}
          stroke="rgba(27, 23, 20, 0.92)"
          strokeWidth={1.4}
          strokeLinecap="round"
        />

        {/* Subtle parallel ghost line */}
        <line
          x1={0}
          y1={mainY + 4}
          x2={mainEndX * 0.96}
          y2={mainY + 4}
          stroke="rgba(27, 23, 20, 0.18)"
          strokeWidth={0.6}
        />

        {/* Branches */}
        {branches.map((b, i) => {
          const branchProgress = Math.min(1, Math.max(0, (mainProgress - b.delay) * 3.2));
          const bx = b.x * width;
          const by = mainY;
          const targetY = mainY + (b.top ? -b.len : b.len);
          const tipY = by + (targetY - by) * branchProgress;
          if (branchProgress <= 0) return null;
          return (
            <g key={i}>
              <line
                x1={bx}
                y1={by}
                x2={bx}
                y2={tipY}
                stroke="rgba(27, 23, 20, 0.6)"
                strokeWidth={0.8}
              />
              {/* End cap */}
              {branchProgress > 0.9 && (
                <circle cx={bx} cy={tipY} r={2.2} fill="#B33A1E" />
              )}
            </g>
          );
        })}

        {/* End cap on main line */}
        {mainProgress > 0.95 && (
          <circle cx={mainEndX - 2} cy={mainY} r={3.6} fill="#1B1714" />
        )}

        {/* A subtle 朱 mark mid-route */}
        {mainProgress > 0.55 && (
          <g>
            <circle cx={width * 0.55} cy={mainY} r={5} fill="#B33A1E" opacity={0.85} />
            <circle cx={width * 0.55} cy={mainY} r={10} fill="none" stroke="rgba(179,58,30,0.4)" strokeWidth={0.5} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
