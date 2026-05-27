import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

const seeded = (i: number) => {
  const x = Math.sin(i * 9999.13) * 43758.5453;
  return x - Math.floor(x);
};

// Animated cobalt geometric subject — sphere + blobs + lines
// Fills a square frame. Used as the right-side subject in V2 cover.
export const CobaltSubject: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const cx = width / 2;
  const cy = height / 2;

  // Slow camera rotation
  const rot = (frame / durationInFrames) * 12;

  // Sphere breathing
  const breathe = Math.sin((frame / fps) * 0.6) * 0.5 + 0.5;

  // Color pulse
  const corePulse = 0.7 + breathe * 0.3;

  return (
    <AbsoluteFill style={{ background: "#0A1230", overflow: "hidden" }}>
      {/* Deep cobalt base + nebula gradient */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(74, 123, 255, 0.45) 0%, rgba(0, 42, 138, 0.6) 30%, #050818 70%, #02040E 100%)",
        }}
      />

      {/* Halftone dot mesh — subtle */}
      <AbsoluteFill
        style={{
          backgroundImage:
            "radial-gradient(rgba(255, 255, 255, 0.06) 1.4px, transparent 1.4px)",
          backgroundSize: "12px 12px",
          opacity: 0.7,
        }}
      />

      {/* Concentric rings rotating */}
      <svg
        width={width}
        height={height}
        style={{
          position: "absolute",
          inset: 0,
          transform: `rotate(${rot}deg)`,
          transformOrigin: "center",
        }}
      >
        {[0.18, 0.28, 0.42, 0.62, 0.84].map((r, i) => {
          const radius = (Math.min(width, height) / 2) * r;
          const alpha = 0.1 + (1 - i / 5) * 0.18;
          const dash = i % 2 === 0 ? "6 8" : "1 14";
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={`rgba(180, 210, 255, ${alpha})`}
              strokeWidth={0.7}
              strokeDasharray={dash}
            />
          );
        })}
        {/* Crosshair */}
        <line x1={cx} y1={cy - 30} x2={cx} y2={cy + 30} stroke="rgba(255,255,255,0.25)" strokeWidth={0.6} />
        <line x1={cx - 30} y1={cy} x2={cx + 30} y2={cy} stroke="rgba(255,255,255,0.25)" strokeWidth={0.6} />
      </svg>

      {/* Bright cobalt core — soft sphere */}
      <div
        style={{
          position: "absolute",
          left: cx,
          top: cy,
          width: 460,
          height: 460,
          marginLeft: -230,
          marginTop: -230,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 32%, #B8D0FF 0%, #4A7BFF 22%, #0042D4 55%, #002A8A 80%, #001244 100%)",
          boxShadow:
            "0 0 100px rgba(74, 123, 255, 0.7), 0 0 220px rgba(0, 66, 212, 0.5)",
          transform: `scale(${0.92 + breathe * 0.08})`,
          opacity: corePulse,
        }}
      />

      {/* Inner specular highlight */}
      <div
        style={{
          position: "absolute",
          left: cx - 120,
          top: cy - 160,
          width: 180,
          height: 180,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255, 255, 255, 0.72) 0%, transparent 70%)",
          filter: "blur(8px)",
          opacity: 0.7,
        }}
      />

      {/* Secondary smaller satellite orb */}
      <div
        style={{
          position: "absolute",
          left: cx + Math.cos((frame / fps) * 0.5) * 220 - 36,
          top: cy + Math.sin((frame / fps) * 0.5) * 220 - 36,
          width: 72,
          height: 72,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #B8D0FF 0%, #4A7BFF 40%, #0042D4 80%)",
          boxShadow: "0 0 50px rgba(74, 123, 255, 0.7)",
        }}
      />

      {/* Drifting line strokes */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 14 }).map((_, i) => {
          const angle = (i / 14) * Math.PI * 2 + (frame / fps) * 0.04;
          const r1 = Math.min(width, height) * 0.42;
          const r2 = Math.min(width, height) * 0.48 + seeded(i) * 30;
          const x1 = cx + Math.cos(angle) * r1;
          const y1 = cy + Math.sin(angle) * r1;
          const x2 = cx + Math.cos(angle) * r2;
          const y2 = cy + Math.sin(angle) * r2;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(180, 210, 255, 0.65)"
              strokeWidth={1}
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* Floating spec particles */}
      {Array.from({ length: 30 }).map((_, i) => {
        const t = ((frame / fps) * 0.08 + seeded(i * 3.1)) % 1;
        const px = seeded(i * 7.3) * width;
        const py = (seeded(i * 11.1) * height + t * 60) % height;
        const size = 0.6 + seeded(i * 13.7) * 1.6;
        const alpha = 0.4 + seeded(i * 17.7) * 0.5;
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
              background: "#E8EEF8",
              boxShadow: `0 0 ${size * 4}px rgba(232, 238, 248, 0.8)`,
              opacity: alpha,
            }}
          />
        );
      })}

      {/* Type marker bottom-left — small caption inside subject */}
      <div
        style={{
          position: "absolute",
          left: 24,
          top: 24,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "rgba(232, 238, 248, 0.85)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: 999,
            background: "#4A7BFF",
            boxShadow: "0 0 8px #4A7BFF",
          }}
        />
        <span>rec · 03</span>
      </div>
      <div
        style={{
          position: "absolute",
          right: 24,
          top: 24,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 13,
          letterSpacing: "0.18em",
          color: "rgba(232, 238, 248, 0.7)",
        }}
      >
        cobalt · 0042D4
      </div>

      {/* Vignette */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(2, 4, 14, 0.55) 100%)",
        }}
      />
    </AbsoluteFill>
  );
};
