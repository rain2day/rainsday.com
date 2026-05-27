import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

// Small 小紋 pattern — repeating geometric motif slowly drifting
export const KomonPattern: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Slow drift
  const driftX = (frame / fps) * 4;
  const driftY = Math.sin((frame / fps) * 0.3) * 6;

  const cellSize = 64;
  const cols = Math.ceil(width / cellSize) + 2;
  const rows = Math.ceil(height / cellSize) + 2;

  return (
    <AbsoluteFill style={{ background: "#F1ECDF" }}>
      {/* Subtle warm wash */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 70% 30%, rgba(122, 110, 92, 0.08), transparent 70%)",
        }}
      />

      <svg
        width={width + cellSize * 2}
        height={height + cellSize * 2}
        style={{
          position: "absolute",
          left: -cellSize - (driftX % cellSize),
          top: -cellSize + driftY,
        }}
      >
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const cx = col * cellSize + cellSize / 2;
            const cy = row * cellSize + cellSize / 2;
            const isOffset = row % 2 === 1;
            const actualCx = isOffset ? cx + cellSize / 2 : cx;

            // Pulse local elements
            const seed = (row * 37 + col * 13) % 100;
            const pulse = Math.sin((frame / fps) * 0.6 + seed * 0.2) * 0.5 + 0.5;
            const isAccent = (row + col) % 11 === 0;

            return (
              <g key={`${row}-${col}`}>
                {/* Center dot */}
                <circle
                  cx={actualCx}
                  cy={cy}
                  r={isAccent ? 3 : 1.4}
                  fill={isAccent ? "rgba(179, 58, 30, 0.55)" : "rgba(27, 23, 20, 0.32)"}
                  opacity={0.5 + pulse * 0.4}
                />
                {/* Cross / asanoha hint — 4 small ticks around */}
                {!isAccent && (row + col) % 3 !== 0 && (
                  <>
                    <line
                      x1={actualCx - 6}
                      y1={cy}
                      x2={actualCx - 12}
                      y2={cy}
                      stroke="rgba(27, 23, 20, 0.18)"
                      strokeWidth={0.5}
                    />
                    <line
                      x1={actualCx + 6}
                      y1={cy}
                      x2={actualCx + 12}
                      y2={cy}
                      stroke="rgba(27, 23, 20, 0.18)"
                      strokeWidth={0.5}
                    />
                    <line
                      x1={actualCx}
                      y1={cy - 6}
                      x2={actualCx}
                      y2={cy - 12}
                      stroke="rgba(27, 23, 20, 0.18)"
                      strokeWidth={0.5}
                    />
                    <line
                      x1={actualCx}
                      y1={cy + 6}
                      x2={actualCx}
                      y2={cy + 12}
                      stroke="rgba(27, 23, 20, 0.18)"
                      strokeWidth={0.5}
                    />
                  </>
                )}
              </g>
            );
          })
        )}
      </svg>

      {/* Faint hairline horizontal grid */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {[0.25, 0.5, 0.75].map((y, i) => (
          <line
            key={i}
            x1={0}
            y1={y * height}
            x2={width}
            y2={y * height}
            stroke="rgba(27, 23, 20, 0.06)"
            strokeWidth={0.5}
          />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
