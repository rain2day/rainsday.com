import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const seeded = (i: number) => {
  const x = Math.sin(i * 9999.13) * 43758.5453;
  return x - Math.floor(x);
};

// Ink wash on washi paper + tracing geometric grid
export const HeroInk: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const t = frame / durationInFrames;

  // Slow drifting ink blot
  const drift = Math.sin((frame / fps) * 0.4) * 8;
  const drift2 = Math.cos((frame / fps) * 0.3) * 5;

  // Trace progress for hero grid
  const traceProgress = interpolate(frame, [0, durationInFrames * 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Tap-out points for the central ink expansion
  const inkSpread = interpolate(frame, [0, durationInFrames * 0.6], [0.4, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: "#F1ECDF" }}>
      {/* Washi paper grain */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(122,110,92,0.10) 1px, transparent 1px), radial-gradient(rgba(122,110,92,0.06) 1px, transparent 1px)",
          backgroundSize: "5px 5px, 11px 11px",
          backgroundPosition: "0 0, 2px 3px",
          opacity: 0.9,
        }}
      />

      {/* Paper warmth variation */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 70% 40%, rgba(255, 230, 200, 0.32), transparent 70%), radial-gradient(ellipse at 30% 80%, rgba(122, 110, 92, 0.16), transparent 60%)",
        }}
      />

      {/* Center ink blot — slow growing soft blob */}
      <div
        style={{
          position: "absolute",
          left: "62%",
          top: "55%",
          width: 1100,
          height: 1100,
          marginLeft: -550 + drift,
          marginTop: -550 + drift2,
          borderRadius: "55% 45% 60% 40% / 50% 60% 40% 50%",
          background:
            "radial-gradient(ellipse, rgba(27, 23, 20, 0.32) 0%, rgba(27, 23, 20, 0.16) 30%, rgba(27, 23, 20, 0.04) 55%, transparent 80%)",
          filter: "blur(28px)",
          opacity: 0.7 * inkSpread,
          mixBlendMode: "multiply",
          transform: `rotate(${frame * 0.04}deg) scale(${0.95 + inkSpread * 0.18})`,
        }}
      />

      {/* Secondary blot — vermillion 朱 hint */}
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: "62%",
          width: 540,
          height: 540,
          marginLeft: -270 - drift,
          marginTop: -270 + drift2,
          borderRadius: "60% 40% 55% 45% / 45% 55% 45% 55%",
          background:
            "radial-gradient(ellipse, rgba(179, 58, 30, 0.28) 0%, rgba(179, 58, 30, 0.10) 40%, transparent 80%)",
          filter: "blur(22px)",
          opacity: 0.6 * inkSpread,
          mixBlendMode: "multiply",
          transform: `rotate(${-frame * 0.06}deg)`,
        }}
      />

      {/* Geometric grid — large thin lines tracing in */}
      <svg
        width="1920"
        height="1080"
        style={{ position: "absolute", inset: 0, opacity: 0.42 }}
      >
        {Array.from({ length: 8 }).map((_, i) => {
          const x = 240 + i * 180;
          const p = Math.min(1, Math.max(0, (traceProgress - i * 0.05) * 1.8));
          const y2 = 60 + p * 960;
          return (
            <line
              key={`v${i}`}
              x1={x}
              y1={60}
              x2={x}
              y2={y2}
              stroke="rgba(27, 23, 20, 0.32)"
              strokeWidth={0.6}
            />
          );
        })}
        {Array.from({ length: 5 }).map((_, i) => {
          const y = 200 + i * 170;
          const p = Math.min(1, Math.max(0, (traceProgress - i * 0.07) * 1.6));
          const x2 = 60 + p * 1800;
          return (
            <line
              key={`h${i}`}
              x1={60}
              y1={y}
              x2={x2}
              y2={y}
              stroke="rgba(27, 23, 20, 0.28)"
              strokeWidth={0.6}
            />
          );
        })}
      </svg>

      {/* Thin perimeter frame */}
      <div
        style={{
          position: "absolute",
          inset: 48,
          border: "1px solid rgba(27, 23, 20, 0.25)",
          pointerEvents: "none",
        }}
      />

      {/* Floating ink specks */}
      {Array.from({ length: 22 }).map((_, i) => {
        const px = ((seeded(i * 3.1) * 1920) + frame * (0.3 + seeded(i) * 0.6)) % 1920;
        const py = (seeded(i * 5.7) * 1080 + Math.sin((frame / fps) + i) * 12) % 1080;
        const size = 1 + seeded(i * 9.3) * 2.4;
        const alpha = 0.18 + seeded(i * 11.1) * 0.22;
        const isShu = seeded(i * 13.1) > 0.78;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: size,
              height: size,
              borderRadius: 999,
              background: isShu ? `rgba(179, 58, 30, ${alpha + 0.2})` : `rgba(27, 23, 20, ${alpha})`,
              mixBlendMode: "multiply",
            }}
          />
        );
      })}

      {/* Bottom soft fade to seamless transition into body */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 70%, rgba(241, 236, 223, 0.7) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
