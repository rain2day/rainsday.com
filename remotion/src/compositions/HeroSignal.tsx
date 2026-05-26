import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";

// Seeded random so particles stay stable across frames
const seeded = (i: number) => {
  const x = Math.sin(i * 9999.13) * 43758.5453;
  return x - Math.floor(x);
};

const Particle: React.FC<{ index: number; frame: number; fps: number; duration: number }> = ({
  index,
  frame,
  fps,
  duration,
}) => {
  const t = (frame / duration + seeded(index)) % 1;
  const startX = seeded(index * 3.1) * 1920;
  const endX = startX + (seeded(index * 4.7) - 0.5) * 360;
  const startY = seeded(index * 7.3) * 1080;
  const endY = startY - 220 - seeded(index * 11.1) * 380;
  const x = startX + (endX - startX) * t;
  const y = startY + (endY - startY) * t;
  const size = 1 + seeded(index * 13.7) * 2.5;
  const opacity = Math.sin(t * Math.PI) * (0.4 + seeded(index * 17.7) * 0.6);
  const isOrange = seeded(index * 19.3) > 0.35;
  const color = isOrange ? "#ff8a30" : "#fff1d6";
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        background: color,
        borderRadius: 999,
        opacity,
        boxShadow: `0 0 ${size * 6}px ${color}`,
      }}
    />
  );
};

const ScanLine: React.FC<{ frame: number; fps: number; offset: number }> = ({ frame, offset }) => {
  const period = 360;
  const t = ((frame + offset) % period) / period;
  const y = t * 1180 - 60;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: y,
        height: 2,
        background: "linear-gradient(90deg, transparent, rgba(255,160,60,0.6), transparent)",
        opacity: 0.6,
      }}
    />
  );
};

export const HeroSignal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  // Slow camera push
  const scale = interpolate(frame, [0, durationInFrames], [1.04, 1.16]);

  // Pulsing orange sun
  const sunPulse = Math.sin((frame / fps) * 1.4) * 0.5 + 0.5;
  const sunGlow = 0.6 + sunPulse * 0.4;

  // Rotation of grid
  const gridRot = (frame / durationInFrames) * 4; // 4deg over duration

  return (
    <AbsoluteFill style={{ background: "#020203", overflow: "hidden" }}>
      {/* Deep base gradient */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 62% 56%, rgba(255, 110, 28, 0.55), transparent 48%), radial-gradient(circle at 40% 70%, rgba(255, 170, 60, 0.2), transparent 38%), linear-gradient(180deg, #08060a 0%, #050405 100%)",
          transform: `scale(${scale})`,
          transformOrigin: "62% 56%",
        }}
      />

      {/* Orange sun core */}
      <div
        style={{
          position: "absolute",
          left: "62%",
          top: "56%",
          width: 720,
          height: 720,
          marginLeft: -360,
          marginTop: -360,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 130, 40, 0.95) 0%, rgba(255, 90, 20, 0.4) 32%, transparent 65%)",
          opacity: sunGlow,
          filter: `blur(8px)`,
          transform: `scale(${1 + sunPulse * 0.05})`,
        }}
      />

      {/* Concentric tech rings */}
      {[0, 1, 2, 3].map((i) => {
        const ringPulse = Math.sin((frame / fps) * 1.1 + i * 0.6) * 0.5 + 0.5;
        const r = 380 + i * 110;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: "62%",
              top: "56%",
              width: r * 2,
              height: r * 2,
              marginLeft: -r,
              marginTop: -r,
              borderRadius: "50%",
              border: `1px solid rgba(255, 170, 60, ${0.12 + ringPulse * 0.12})`,
              opacity: 0.7,
            }}
          />
        );
      })}

      {/* Grid */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,160,60,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,160,60,0.08) 1px, transparent 1px)",
          backgroundSize: "120px 120px",
          opacity: 0.4,
          transform: `rotate(${gridRot}deg) scale(1.3)`,
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      {/* Scan lines */}
      <ScanLine frame={frame} fps={fps} offset={0} />
      <ScanLine frame={frame} fps={fps} offset={120} />
      <ScanLine frame={frame} fps={fps} offset={240} />

      {/* Floating particles */}
      {Array.from({ length: 80 }).map((_, i) => (
        <Particle key={i} index={i} frame={frame} fps={fps} duration={durationInFrames} />
      ))}

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 62% 56%, transparent 30%, rgba(2,2,3,0.6) 88%)",
          pointerEvents: "none",
        }}
      />

      {/* Chromatic streaks (subtle) */}
      <div
        style={{
          position: "absolute",
          left: "30%",
          top: 0,
          bottom: 0,
          width: 2,
          background: "linear-gradient(180deg, transparent, rgba(255,160,60,0.16), transparent)",
          opacity: Math.sin((frame / fps) * 0.7) * 0.5 + 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "78%",
          top: 0,
          bottom: 0,
          width: 1,
          background: "linear-gradient(180deg, transparent, rgba(255,200,120,0.22), transparent)",
          opacity: Math.cos((frame / fps) * 0.9) * 0.5 + 0.5,
        }}
      />

      {/* Bottom noise band */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.7) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
