import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

// Horizon / road feel — slow horizontal scan, perspective grid
export const MissionSignal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const horizon = 320; // y position of horizon
  const gridShift = (frame / durationInFrames) * 240;

  // Slow pulse
  const pulse = Math.sin((frame / fps) * 0.9) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={{ background: "#0a0606", overflow: "hidden" }}>
      {/* Sky gradient */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, #1a0a05 0%, #2a1408 22%, #3a1a0a 38%, #0a0405 60%, #050203 100%)",
        }}
      />

      {/* Distant orange sun */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: horizon - 90,
          width: 380,
          height: 380,
          marginLeft: -190,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 130, 40, 0.85) 0%, rgba(255, 90, 20, 0.5) 38%, transparent 70%)",
          opacity: 0.7 + pulse * 0.2,
          filter: "blur(6px)",
        }}
      />

      {/* Sun core */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: horizon - 14,
          width: 110,
          height: 110,
          marginLeft: -55,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 200, 90, 0.95) 0%, rgba(255, 130, 40, 0.5) 60%, transparent 100%)",
          opacity: 0.9 + pulse * 0.1,
        }}
      />

      {/* Horizon line */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: horizon,
          height: 1,
          background: "linear-gradient(90deg, transparent, rgba(255,170,80,0.7), transparent)",
        }}
      />

      {/* Perspective road grid lines (toward camera) */}
      {Array.from({ length: 14 }).map((_, i) => {
        const t = ((i * 24 + gridShift) % 280) / 280;
        const y = horizon + Math.pow(t, 1.7) * (640 - horizon);
        const alpha = 0.08 + t * 0.32;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: y,
              height: 1,
              background: `linear-gradient(90deg, transparent 18%, rgba(255,170,80,${alpha}) 50%, transparent 82%)`,
            }}
          />
        );
      })}

      {/* Perspective road verticals */}
      <svg
        width="1920"
        height="640"
        style={{ position: "absolute", inset: 0, opacity: 0.6 }}
      >
        {Array.from({ length: 11 }).map((_, i) => {
          const offset = (i - 5) / 5;
          const xTop = 960 + offset * 60;
          const xBottom = 960 + offset * 1200;
          return (
            <line
              key={i}
              x1={xTop}
              y1={horizon}
              x2={xBottom}
              y2={640}
              stroke="rgba(255,170,80,0.15)"
              strokeWidth={1}
            />
          );
        })}
      </svg>

      {/* Horizontal scanner */}
      {[0, 0.4, 0.75].map((offset, i) => {
        const t = ((frame / fps) * 0.3 + offset) % 1;
        const x = t * 1920;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - 200,
              top: 0,
              bottom: 0,
              width: 400,
              background:
                "linear-gradient(90deg, transparent, rgba(255,180,90,0.18) 50%, transparent)",
              opacity: 0.55,
              mixBlendMode: "screen" as any,
            }}
          />
        );
      })}

      {/* Top fade */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 120,
          background: "linear-gradient(180deg, #0a0405, transparent)",
        }}
      />
      {/* Bottom fade */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 120,
          background: "linear-gradient(0deg, #050203, transparent)",
        }}
      />
    </AbsoluteFill>
  );
};
