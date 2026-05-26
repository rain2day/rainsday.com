import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

const seeded = (i: number) => {
  const x = Math.sin(i * 9999.13) * 43758.5453;
  return x - Math.floor(x);
};

// Radiating rays — campaign / RAD feel
export const CampaignSignal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const cx = 1280;
  const cy = 320;

  const slowRot = (frame / durationInFrames) * 36;
  const flickerBase = Math.sin((frame / fps) * 0.7) * 0.5 + 0.5;

  return (
    <AbsoluteFill style={{ background: "#070405", overflow: "hidden" }}>
      {/* Deep ash + ember base */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 65% 50%, rgba(255, 120, 40, 0.34) 0%, rgba(80, 30, 10, 0.4) 30%, transparent 60%), linear-gradient(180deg, #0c0606 0%, #050203 100%)",
        }}
      />

      {/* Radiating rays */}
      <svg
        width="1920"
        height="640"
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${slowRot}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {Array.from({ length: 40 }).map((_, i) => {
          const angle = (i / 40) * Math.PI * 2;
          const len = 900 + seeded(i) * 360;
          const ex = cx + Math.cos(angle) * len;
          const ey = cy + Math.sin(angle) * len;
          const localPulse = Math.sin((frame / fps) * 1.2 + i * 0.4) * 0.5 + 0.5;
          const alpha = (0.06 + localPulse * 0.18) * (flickerBase * 0.6 + 0.6);
          return (
            <line
              key={i}
              x1={cx + Math.cos(angle) * 60}
              y1={cy + Math.sin(angle) * 60}
              x2={ex}
              y2={ey}
              stroke={`rgba(255,160,60,${alpha})`}
              strokeWidth={i % 6 === 0 ? 1.6 : 0.6}
            />
          );
        })}
      </svg>

      {/* Bright core */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: 220,
          height: 220,
          marginLeft: -110,
          marginTop: -110,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 210, 110, 0.95) 0%, rgba(255, 130, 40, 0.6) 40%, transparent 80%)",
          filter: "blur(2px)",
          opacity: 0.7 + flickerBase * 0.3,
        }}
      />

      {/* Outer halo */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: 720,
          height: 720,
          marginLeft: -360,
          marginTop: -360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 130, 40, 0.18) 0%, transparent 60%)",
          opacity: 0.8,
          filter: "blur(20px)",
        }}
      />

      {/* Drifting embers */}
      {Array.from({ length: 26 }).map((_, i) => {
        const t = ((frame / durationInFrames) * 1.4 + seeded(i)) % 1;
        const x = seeded(i * 2.1) * 1920;
        const y = 640 - t * 720 - 40;
        const size = 1.5 + seeded(i * 3.7) * 3;
        const opacity = Math.sin(t * Math.PI) * 0.8;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: 999,
              background: "#ff9a48",
              boxShadow: `0 0 ${size * 8}px #ff9a48`,
              opacity,
            }}
          />
        );
      })}

      {/* Soft vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 65% 50%, transparent 30%, rgba(0,0,0,0.5) 80%)",
        }}
      />

      {/* Top / bottom fades */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          height: 90,
          background: "linear-gradient(180deg, #050203, transparent)",
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
