import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

const seeded = (i: number) => {
  const x = Math.sin(i * 9999.13) * 43758.5453;
  return x - Math.floor(x);
};

// Grid of pulsing modules — product / interface feel
export const ProductSignal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cols = 14;
  const rows = 5;
  const cellW = 1920 / cols;
  const cellH = 640 / rows;

  // Sweep
  const sweepT = (frame / durationInFrames) % 1;
  const sweepX = sweepT * 1920 * 1.4 - 200;

  return (
    <AbsoluteFill style={{ background: "#0a0504", overflow: "hidden" }}>
      {/* Deep base */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 30% 50%, rgba(255, 140, 60, 0.22), transparent 50%), radial-gradient(ellipse at 80% 70%, rgba(255, 80, 20, 0.35), transparent 55%), linear-gradient(180deg, #1a0a05 0%, #0a0303 100%)",
        }}
      />

      {/* Pulsing module grid */}
      {Array.from({ length: rows * cols }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * cellW;
        const y = row * cellH;
        const seed = seeded(i * 1.7);
        const offset = seed * 6;
        const localPulse = Math.sin((frame / fps) * 1.6 + offset) * 0.5 + 0.5;

        // Distance from sweep
        const cx = x + cellW / 2;
        const distFromSweep = Math.abs(cx - sweepX);
        const sweepInfluence = Math.max(0, 1 - distFromSweep / 320);

        const opacity = 0.04 + localPulse * 0.18 + sweepInfluence * 0.45;
        const accent = seed > 0.85;
        const fill = accent
          ? `rgba(255, 150, 50, ${opacity * 1.4})`
          : `rgba(255, 180, 90, ${opacity})`;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + 4,
              top: y + 4,
              width: cellW - 8,
              height: cellH - 8,
              border: `1px solid rgba(255,170,80,${0.08 + sweepInfluence * 0.3})`,
              background: fill,
              borderRadius: 4,
            }}
          />
        );
      })}

      {/* Connection lines (random) */}
      <svg width="1920" height="640" style={{ position: "absolute", inset: 0, opacity: 0.55 }}>
        {Array.from({ length: 24 }).map((_, i) => {
          const a = i;
          const b = (i * 7) % (rows * cols);
          const ax = (a % cols) * cellW + cellW / 2;
          const ay = Math.floor(a / cols) * cellH + cellH / 2;
          const bx = (b % cols) * cellW + cellW / 2;
          const by = Math.floor(b / cols) * cellH + cellH / 2;
          const pulse = Math.sin((frame / fps) * 1.4 + i) * 0.5 + 0.5;
          return (
            <line
              key={i}
              x1={ax}
              y1={ay}
              x2={bx}
              y2={by}
              stroke={`rgba(255,170,80,${0.04 + pulse * 0.08})`}
              strokeWidth={0.6}
            />
          );
        })}
      </svg>

      {/* Vertical sweep ribbon */}
      <div
        style={{
          position: "absolute",
          left: sweepX - 100,
          top: 0,
          bottom: 0,
          width: 200,
          background:
            "linear-gradient(90deg, transparent, rgba(255,160,60,0.32) 50%, transparent)",
          mixBlendMode: "screen" as any,
        }}
      />

      {/* Top and bottom fades */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 90,
          background: "linear-gradient(180deg, #0a0303, transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 90,
          background: "linear-gradient(0deg, #050203, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};
