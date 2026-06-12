(() => {
  "use strict";

  const canvas = document.getElementById("black-hole-canvas");
  const host = document.querySelector("[data-black-hole-scene]");
  const fallback = document.querySelector("[data-black-hole-fallback]");
  const fallbackCopy = document.querySelector("[data-bh-fallback-copy]");
  const statusReadout = document.querySelector("[data-bh-status]");
  const radiusReadout = document.querySelector("[data-bh-radius]");
  const timeReadout = document.querySelector("[data-bh-time]");
  const escapeReadout = document.querySelector("[data-bh-escape]");
  const fpsReadout = document.querySelector("[data-bh-fps]");
  const scaleReadout = document.querySelector("[data-bh-scale]");
  const qualityButton = document.querySelector("[data-bh-quality]");
  const pauseButton = document.querySelector("[data-bh-pause]");
  const resetButton = document.querySelector("[data-bh-reset]");
  const hint = document.querySelector("[data-bh-hint]");
  const titleOverlay = document.querySelector("[data-bh-title-overlay]");

  if (!canvas || !host) return;

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = matchMedia("(pointer: coarse)").matches;
  const RS_KM = 1.27e7;
  const MIN_RADIUS = 4.5;
  const MAX_RADIUS = 26.0;
  const MIN_POLAR = (55 * Math.PI) / 180;
  const MAX_POLAR = (96 * Math.PI) / 180;
  const DEFAULT_POLAR = (83 * Math.PI) / 180;
  const DEFAULT_AZIMUTH = -0.34;
  const STEP_TIERS = [220, 150, 96];
  const QUALITY_MODES = ["AUTO", "HIGH", "LOW"];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const setStatus = (value) => {
    if (statusReadout) statusReadout.textContent = value;
  };

  const showFallback = (reason) => {
    host.dataset.blackHoleState = "fallback";
    canvas.hidden = true;
    fallback?.removeAttribute("hidden");
    fallback?.setAttribute("aria-hidden", "false");
    setStatus(reason || "static fallback");
    if (fallbackCopy && reason) fallbackCopy.textContent = `${reason}. Reload the page to try the live lensing renderer.`;
  };

  async function loadRenderer() {
    try {
      setStatus("loading three.js");
      const [
        THREE,
        { EffectComposer },
        { RenderPass },
        { UnrealBloomPass },
        { OutputPass },
      ] = await Promise.all([
        import("three"),
        import("three/addons/postprocessing/EffectComposer.js"),
        import("three/addons/postprocessing/RenderPass.js"),
        import("three/addons/postprocessing/UnrealBloomPass.js"),
        import("three/addons/postprocessing/OutputPass.js"),
      ]);

      initBlackHole({ THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass });
    } catch (error) {
      console.warn("Black-hole lensing renderer failed to load", error);
      showFallback("static fallback");
    }
  }

  function initBlackHole({ THREE, EffectComposer, RenderPass, UnrealBloomPass, OutputPass }) {
    host.dataset.blackHoleState = "webgl";
    fallback?.setAttribute("hidden", "");
    fallback?.setAttribute("aria-hidden", "true");
    canvas.hidden = false;
    setStatus(reducedMotion ? "webgl still" : "webgl live");

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x06070f, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;

    const getDefaultRadius = () => {
      const rect = host.getBoundingClientRect();
      const width = rect.width || window.innerWidth || 1;
      const height = rect.height || window.innerHeight || 1;
      const aspect = width / Math.max(1, height);
      return aspect < 1 ? 14 : 11;
    };
    const initialRadius = getDefaultRadius();

    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uFrame: { value: 0 },
      uCamPos: { value: new THREE.Vector3(0, 0, initialRadius) },
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uCamForward: { value: new THREE.Vector3(0, 0, -1) },
      uFov: { value: THREE.MathUtils.degToRad(60) },
      uStepCount: { value: STEP_TIERS[0] },
      uExposure: { value: 1.1 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });

    const plane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    plane.frustumCulled = false;
    scene.add(plane);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.55, 0.85);
    const outputPass = new OutputPass();
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
    composer.addPass(outputPass);

    const worldUp = new THREE.Vector3(0, 1, 0);
    const camPos = new THREE.Vector3();
    const camForward = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();

    const state = {
      width: 1,
      height: 1,
      baseDpr: 1,
      renderScale: 1,
      quality: "AUTO",
      stepCount: STEP_TIERS[0],
      defaultRadius: initialRadius,
      radius: reducedMotion ? initialRadius : 24,
      targetRadius: initialRadius,
      azimuth: DEFAULT_AZIMUTH,
      targetAzimuth: DEFAULT_AZIMUTH,
      polar: DEFAULT_POLAR,
      targetPolar: DEFAULT_POLAR,
      pointerNdcX: 0,
      pointerNdcY: 0,
      velocityAzimuth: 0,
      velocityPolar: 0,
      dragging: false,
      interacted: false,
      paused: false,
      introActive: !reducedMotion,
      introStart: performance.now(),
      lastInteraction: performance.now(),
      lastFrameTime: 0,
      simTime: 0,
      frame: 0,
      raf: 0,
      renderSamples: [],
      fastFrames: 0,
      upscaleCooldown: 0,
      lastStatsUpdate: 0,
    };

    const activePointers = new Map();
    let lastPinchDistance = 0;

    function getBaseDpr() {
      const dpr = window.devicePixelRatio || 1;
      return coarsePointer ? Math.min(dpr, 1.25) : Math.min(dpr, 2);
    }

    function applyRenderSize() {
      state.baseDpr = getBaseDpr();
      const pixelRatio = state.baseDpr * state.renderScale;
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(state.width, state.height, false);
      composer.setPixelRatio(pixelRatio);
      composer.setSize(state.width, state.height);
      uniforms.uResolution.value.set(
        Math.max(1, Math.round(state.width * pixelRatio)),
        Math.max(1, Math.round(state.height * pixelRatio))
      );
      if (scaleReadout) scaleReadout.textContent = `scale ${state.renderScale.toFixed(2)}`;
    }

    function applyQualityMode() {
      if (state.quality === "HIGH") {
        state.stepCount = STEP_TIERS[0];
        state.renderScale = 1;
      } else if (state.quality === "LOW") {
        state.stepCount = STEP_TIERS[2];
        state.renderScale = 0.6;
      } else {
        state.stepCount = Math.max(state.stepCount, STEP_TIERS[0]);
        state.renderScale = Math.min(1, Math.max(0.45, state.renderScale));
      }

      uniforms.uStepCount.value = state.stepCount;
      if (qualityButton) qualityButton.textContent = `QUALITY ${state.quality}`;
      applyRenderSize();
      requestRender();
    }

    function resize() {
      const rect = host.getBoundingClientRect();
      state.width = Math.max(1, Math.round(rect.width));
      state.height = Math.max(1, Math.round(rect.height));
      applyRenderSize();
      requestRender();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();

    function markInteraction() {
      state.lastInteraction = performance.now();
      if (!state.interacted) {
        state.interacted = true;
        state.introActive = false;
        hideTitle();
        hint?.classList.add("is-muted");
      }
      requestRender();
    }

    function updatePointerParallax(event) {
      const rect = canvas.getBoundingClientRect();
      state.pointerNdcX = clamp(((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2, -1, 1);
      state.pointerNdcY = clamp(((event.clientY - rect.top) / Math.max(1, rect.height) - 0.5) * 2, -1, 1);
    }

    function setPointer(id, event) {
      activePointers.set(id, {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
      });
    }

    function getPinchDistance() {
      const points = [...activePointers.values()];
      if (points.length < 2) return 0;
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      return Math.hypot(dx, dy);
    }

    function onPointerDown(event) {
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      setPointer(event.pointerId, event);
      canvas.setPointerCapture?.(event.pointerId);
      updatePointerParallax(event);

      if (activePointers.size === 1) {
        state.dragging = true;
        state.velocityAzimuth = 0;
        state.velocityPolar = 0;
      } else if (activePointers.size === 2) {
        state.dragging = false;
        lastPinchDistance = getPinchDistance();
      }

      markInteraction();
    }

    function onPointerMove(event) {
      updatePointerParallax(event);
      const point = activePointers.get(event.pointerId);
      if (!point) return;

      event.preventDefault();
      const now = performance.now();
      const dx = event.clientX - point.x;
      const dy = event.clientY - point.y;
      const elapsed = Math.max(8, now - point.time);
      point.x = event.clientX;
      point.y = event.clientY;
      point.time = now;

      if (activePointers.size === 1 && state.dragging) {
        state.targetAzimuth -= dx * 0.0052;
        state.targetPolar = clamp(state.targetPolar + dy * 0.0042, MIN_POLAR, MAX_POLAR);
        state.velocityAzimuth = clamp((-dx * 0.0052) * (16 / elapsed), -0.085, 0.085);
        state.velocityPolar = clamp((dy * 0.0042) * (16 / elapsed), -0.055, 0.055);
      } else if (activePointers.size >= 2) {
        const distance = getPinchDistance();
        if (lastPinchDistance > 0 && distance > 0) {
          const delta = lastPinchDistance - distance;
          state.targetRadius = clamp(state.targetRadius * Math.exp(delta * 0.004), MIN_RADIUS, MAX_RADIUS);
        }
        lastPinchDistance = distance;
      }

      markInteraction();
    }

    function onPointerUp(event) {
      activePointers.delete(event.pointerId);
      canvas.releasePointerCapture?.(event.pointerId);
      lastPinchDistance = activePointers.size >= 2 ? getPinchDistance() : 0;
      state.dragging = activePointers.size === 1;
      markInteraction();
    }

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("wheel", (event) => {
      event.preventDefault();
      state.targetRadius = clamp(state.targetRadius * Math.exp(event.deltaY * 0.0012), MIN_RADIUS, MAX_RADIUS);
      markInteraction();
    }, { passive: false });

    canvas.addEventListener("keydown", (event) => {
      let handled = true;
      if (event.key === "ArrowLeft") state.targetAzimuth += 0.08;
      else if (event.key === "ArrowRight") state.targetAzimuth -= 0.08;
      else if (event.key === "ArrowUp") state.targetPolar = clamp(state.targetPolar - 0.06, MIN_POLAR, MAX_POLAR);
      else if (event.key === "ArrowDown") state.targetPolar = clamp(state.targetPolar + 0.06, MIN_POLAR, MAX_POLAR);
      else if (event.key === "+" || event.key === "=") state.targetRadius = clamp(state.targetRadius * Math.exp(-0.18), MIN_RADIUS, MAX_RADIUS);
      else if (event.key === "-" || event.key === "_") state.targetRadius = clamp(state.targetRadius * Math.exp(0.18), MIN_RADIUS, MAX_RADIUS);
      else handled = false;

      if (handled) {
        event.preventDefault();
        markInteraction();
      }
    });

    qualityButton?.addEventListener("click", () => {
      const nextIndex = (QUALITY_MODES.indexOf(state.quality) + 1) % QUALITY_MODES.length;
      state.quality = QUALITY_MODES[nextIndex];
      state.renderSamples = [];
      state.fastFrames = 0;
      applyQualityMode();
      markInteraction();
    });

    pauseButton?.addEventListener("click", () => {
      state.paused = !state.paused;
      pauseButton.textContent = state.paused ? "RESUME" : "PAUSE";
      setStatus(state.paused ? "webgl paused" : reducedMotion ? "webgl still" : "webgl live");
      markInteraction();
    });

    resetButton?.addEventListener("click", () => {
      state.defaultRadius = getDefaultRadius();
      state.targetRadius = state.defaultRadius;
      if (reducedMotion) state.radius = state.defaultRadius;
      state.targetAzimuth = DEFAULT_AZIMUTH;
      state.azimuth = DEFAULT_AZIMUTH;
      state.targetPolar = DEFAULT_POLAR;
      state.polar = DEFAULT_POLAR;
      state.velocityAzimuth = 0;
      state.velocityPolar = 0;
      state.paused = false;
      state.introActive = false;
      if (pauseButton) pauseButton.textContent = "PAUSE";
      setStatus(reducedMotion ? "webgl still" : "webgl live");
      markInteraction();
    });

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      stopLoop();
      showFallback("webgl context lost");
    });

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopLoop();
      } else if (reducedMotion) {
        requestRender();
      } else {
        startLoop();
      }
    });

    function showTitle() {
      if (!reducedMotion) titleOverlay?.classList.add("is-visible");
    }

    function hideTitle() {
      titleOverlay?.classList.remove("is-visible");
    }

    if (!reducedMotion) {
      requestAnimationFrame(showTitle);
      window.setTimeout(hideTitle, 4800);
    } else {
      hideTitle();
      hint?.classList.add("is-muted");
    }

    function updateReadouts() {
      const km = state.radius * RS_KM;
      const dilation = 1 / Math.sqrt(Math.max(0.0001, 1 - 1 / state.radius));
      const escapeVelocity = Math.sqrt(1 / state.radius);

      if (radiusReadout) radiusReadout.textContent = `${state.radius.toFixed(1)} rs · ${formatScientific(km)} km`;
      if (timeReadout) timeReadout.textContent = `×${dilation.toFixed(3)}`;
      if (escapeReadout) escapeReadout.textContent = `${escapeVelocity.toFixed(2)} c`;
    }

    function formatScientific(value) {
      if (value <= 0) return "0";
      const exponent = Math.floor(Math.log10(value));
      const mantissa = value / Math.pow(10, exponent);
      return `${mantissa.toFixed(2)}×10${toSuperscript(exponent)}`;
    }

    function toSuperscript(value) {
      const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
      return String(value).split("").map((char) => map[char] || char).join("");
    }

    function updateCamera(now, dt) {
      if (reducedMotion) {
        state.radius = state.targetRadius;
        state.azimuth = state.targetAzimuth;
        state.polar = state.targetPolar;
      } else if (state.introActive && !state.interacted) {
        const t = clamp((now - state.introStart) / 5500, 0, 1);
        const eased = easeInOutCubic(t);
        state.radius = lerp(24, state.defaultRadius, eased);
        state.targetRadius = state.defaultRadius;
        state.azimuth += dt * 0.052;
        state.targetAzimuth = state.azimuth;
        if (t >= 1) state.introActive = false;
      } else {
        if (!state.dragging && activePointers.size === 0) {
          state.targetAzimuth += state.velocityAzimuth;
          state.targetPolar = clamp(state.targetPolar + state.velocityPolar, MIN_POLAR, MAX_POLAR);
          state.velocityAzimuth *= 0.95;
          state.velocityPolar *= 0.95;
          if (Math.abs(state.velocityAzimuth) < 0.0001) state.velocityAzimuth = 0;
          if (Math.abs(state.velocityPolar) < 0.0001) state.velocityPolar = 0;

          if (!state.paused && !reducedMotion && now - state.lastInteraction > 5000) {
            state.targetAzimuth += dt * 0.018;
          }
        }

        state.radius += (state.targetRadius - state.radius) * 0.08;
        state.azimuth += (state.targetAzimuth - state.azimuth) * 0.12;
        state.polar += (state.targetPolar - state.polar) * 0.12;
      }

      let effectiveAzimuth = state.azimuth;
      let effectivePolar = state.polar;
      if (!state.dragging && activePointers.size === 0 && !reducedMotion) {
        effectiveAzimuth += state.pointerNdcX * (1.5 * Math.PI / 180);
        effectivePolar += -state.pointerNdcY * (1.5 * Math.PI / 180);
        if (!state.paused && now - state.lastInteraction > 5000) {
          effectivePolar += Math.sin(state.simTime * (Math.PI * 2 / 26)) * (1.2 * Math.PI / 180);
        }
      }
      effectivePolar = clamp(effectivePolar, MIN_POLAR, MAX_POLAR);

      const sinPolar = Math.sin(effectivePolar);
      camPos.set(
        state.radius * sinPolar * Math.sin(effectiveAzimuth),
        state.radius * Math.cos(effectivePolar),
        state.radius * sinPolar * Math.cos(effectiveAzimuth)
      );

      camForward.copy(camPos).multiplyScalar(-1).normalize();
      camRight.crossVectors(camForward, worldUp).normalize();
      camUp.crossVectors(camRight, camForward).normalize();

      uniforms.uCamPos.value.copy(camPos);
      uniforms.uCamForward.value.copy(camForward);
      uniforms.uCamRight.value.copy(camRight);
      uniforms.uCamUp.value.copy(camUp);
    }

    function updatePerf(frameMs, now) {
      state.renderSamples.push(frameMs);
      if (state.renderSamples.length > 30) state.renderSamples.shift();
      const average = state.renderSamples.reduce((sum, value) => sum + value, 0) / state.renderSamples.length;
      state.frame += 1;
      if (state.upscaleCooldown > 0) state.upscaleCooldown -= 1;

      if (now - state.lastStatsUpdate > 220 || !state.lastStatsUpdate) {
        state.lastStatsUpdate = now;
        if (fpsReadout) fpsReadout.textContent = `${Math.round(1000 / Math.max(1, average))} FPS`;
        if (scaleReadout) scaleReadout.textContent = `scale ${state.renderScale.toFixed(2)}`;
      }

      if (state.quality !== "AUTO" || state.renderSamples.length < 30) return;

      const budget = coarsePointer ? 33 : 16.7;
      if (average > budget * 1.3) {
        state.fastFrames = 0;
        state.upscaleCooldown = 180;
        if (state.renderScale > 0.45) {
          state.renderScale = Math.max(0.45, state.renderScale * 0.85);
        } else {
          const tierIndex = STEP_TIERS.indexOf(state.stepCount);
          if (tierIndex >= 0 && tierIndex < STEP_TIERS.length - 1) {
            state.stepCount = STEP_TIERS[tierIndex + 1];
            uniforms.uStepCount.value = state.stepCount;
          }
        }
        applyRenderSize();
        state.renderSamples = [];
      } else if (
        average <= budget * 1.05 &&
        state.upscaleCooldown <= 0 &&
        (state.renderScale < 1 || state.stepCount < STEP_TIERS[0])
      ) {
        state.fastFrames += 1;
        if (state.fastFrames >= 90) {
          state.renderScale = Math.min(1, state.renderScale * 1.1);
          if (state.renderScale >= 1 && state.stepCount < STEP_TIERS[0]) {
            const tierIndex = STEP_TIERS.indexOf(state.stepCount);
            state.stepCount = STEP_TIERS[Math.max(0, tierIndex - 1)];
            uniforms.uStepCount.value = state.stepCount;
          }
          applyRenderSize();
          state.fastFrames = 0;
          state.renderSamples = [];
        }
      } else {
        state.fastFrames = 0;
      }
    }

    function render(now) {
      if (document.hidden) {
        state.raf = 0;
        return;
      }

      const rawFrameMs = state.lastFrameTime ? now - state.lastFrameTime : 1000 / 60;
      const frameMs = clamp(rawFrameMs, 0, 100);
      const dt = Math.min(frameMs / 1000, 0.05);
      state.lastFrameTime = now;

      if (!state.paused && !reducedMotion) {
        state.simTime += dt;
      }

      updateCamera(now, dt);
      updateReadouts();

      uniforms.uTime.value = reducedMotion ? 0 : state.simTime;
      uniforms.uFrame.value = state.frame;
      uniforms.uStepCount.value = state.stepCount;

      composer.render();
      updatePerf(frameMs, now);

      if (reducedMotion) {
        state.raf = 0;
      } else {
        state.raf = requestAnimationFrame(render);
      }
    }

    function requestRender() {
      if (!reducedMotion || state.raf || document.hidden) return;
      state.raf = requestAnimationFrame(render);
    }

    function startLoop() {
      if (state.raf || document.hidden) return;
      state.lastFrameTime = 0;
      state.raf = requestAnimationFrame(render);
    }

    function stopLoop() {
      if (!state.raf) return;
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    }

    applyQualityMode();
    updateReadouts();
    if (reducedMotion) requestRender();
    else startLoop();
  }

  const VERTEX_SHADER = `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;

    varying vec2 vUv;

    uniform vec2 uResolution;
    uniform float uTime;
    uniform float uFrame;
    uniform vec3 uCamPos;
    uniform vec3 uCamRight;
    uniform vec3 uCamUp;
    uniform vec3 uCamForward;
    uniform float uFov;
    uniform int uStepCount;
    uniform float uExposure;

    const int MAX_STEPS = 220;

    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float hash13(vec3 p3) {
      p3 = fract(p3 * 0.1031);
      p3 += dot(p3, p3.zyx + 31.32);
      return fract((p3.x + p3.y) * p3.z);
    }

    vec2 hash22(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    float noise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = hash12(i + vec2(0.0, 0.0));
      float b = hash12(i + vec2(1.0, 0.0));
      float c = hash12(i + vec2(0.0, 1.0));
      float d = hash12(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float noise3(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      float n000 = hash13(i + vec3(0.0, 0.0, 0.0));
      float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
      float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
      float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
      float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
      float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
      float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
      float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
      float nx00 = mix(n000, n100, u.x);
      float nx10 = mix(n010, n110, u.x);
      float nx01 = mix(n001, n101, u.x);
      float nx11 = mix(n011, n111, u.x);
      float nxy0 = mix(nx00, nx10, u.y);
      float nxy1 = mix(nx01, nx11, u.y);
      return mix(nxy0, nxy1, u.z);
    }

    float fbm2(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      mat2 rot = mat2(0.80, -0.60, 0.60, 0.80);
      for (int i = 0; i < 5; i++) {
        value += amplitude * noise2(p);
        p = rot * p * 2.04 + vec2(17.13, 9.71);
        amplitude *= 0.5;
      }
      return value;
    }

    float fbm3(vec3 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 4; i++) {
        value += amplitude * noise3(p);
        p = p * 2.03 + vec3(11.7, 19.1, 5.6);
        amplitude *= 0.5;
      }
      return value;
    }

    vec2 signNotZero(vec2 v) {
      return vec2(v.x >= 0.0 ? 1.0 : -1.0, v.y >= 0.0 ? 1.0 : -1.0);
    }

    vec2 octahedral(vec3 n) {
      n /= abs(n.x) + abs(n.y) + abs(n.z);
      vec2 p = n.xy;
      if (n.z < 0.0) {
        p = (1.0 - abs(p.yx)) * signNotZero(p);
      }
      return p * 0.5 + 0.5;
    }

    vec3 starLayer(vec3 dir, float scale, float density, float seed) {
      vec2 uv = octahedral(dir);
      vec2 grid = uv * scale;
      vec2 cell = floor(grid);
      vec2 local = fract(grid);
      float present = 1.0 - step(density, hash12(cell + seed));
      vec2 starPos = hash22(cell + seed * 3.17);
      float dist = length(local - starPos);
      float starSize = mix(0.028, 0.010, hash12(cell + seed + 4.0));
      float core = pow(max(0.0, 1.0 - dist / starSize), 18.0);
      float brightness = 0.35 + pow(hash12(cell + seed + 8.0), 9.0) * 2.5;
      float twinkle = 0.94 + 0.06 * sin(uTime * 1.7 + hash12(cell + seed + 12.0) * 20.0);
      vec3 tint = mix(vec3(1.0, 0.76, 0.55), vec3(0.74, 0.84, 1.0), hash12(cell + seed + 16.0));
      return tint * present * core * brightness * twinkle;
    }

    vec3 background(vec3 dir) {
      vec3 color = vec3(0.0235, 0.0275, 0.0588);
      color += starLayer(dir, 28.0, 0.08, 2.0);
      color += starLayer(dir, 64.0, 0.08, 17.0);
      color += starLayer(dir, 120.0, 0.08, 41.0);

      vec3 bandNormal = normalize(vec3(0.25, 0.82, 0.50));
      float band = exp(-pow(dot(dir, bandNormal), 2.0) * 34.0);
      float cloud = fbm3(dir * 3.0 + vec3(0.0, uTime * 0.002, 0.0));
      float dust = smoothstep(0.54, 0.90, fbm3(dir * 22.0 + vec3(4.0, 0.0, 8.0)));
      vec3 milky = vec3(0.22, 0.19, 0.29) * band * (0.10 + 0.38 * cloud) * (1.0 - 0.62 * dust);
      color += min(milky, vec3(0.30));
      return color;
    }

    vec4 diskEmission(vec3 hit, vec3 photonDir) {
      float rd = length(hit.xz);
      float innerEdge = smoothstep(3.0, 3.6, rd);
      float outerEdge = 1.0 - smoothstep(7.2, 9.0, rd);
      float edge = innerEdge * outerEdge;
      if (edge <= 0.0) return vec4(0.0);

      float phi = atan(hit.z, hit.x);
      float omega = 0.7 * pow(rd, -1.5);
      float angle = phi - uTime * omega;
      vec2 flow = vec2(rd * 1.8 - uTime * 0.03, angle * 3.0);
      float turbulence = fbm2(flow);
      float fine = fbm2(flow * vec2(1.35, 4.8) + vec2(7.1, -2.6));
      float streaks = smoothstep(0.28, 0.86, turbulence) * 0.72 + fine * 0.28;
      float density = edge * (0.36 + 1.08 * streaks);

      vec3 innerColor = vec3(1.0, 0.96, 0.88);
      vec3 midColor = vec3(1.0, 0.62, 0.25);
      vec3 outerColor = vec3(0.55, 0.18, 0.06);
      float radialT = smoothstep(3.0, 9.0, rd);
      vec3 diskColor = mix(innerColor, midColor, smoothstep(0.00, 0.55, radialT));
      diskColor = mix(diskColor, outerColor, smoothstep(0.48, 1.00, radialT));

      float beta = sqrt(0.5 / rd);
      vec3 tangent = normalize(vec3(-hit.z, 0.0, hit.x));
      vec3 towardCamera = -normalize(photonDir);
      float doppler = 1.0 / max(0.16, 1.0 - beta * dot(tangent, towardCamera));
      doppler = clamp(doppler, 0.42, 2.05);
      float beam = pow(doppler, 3.0);
      float blueShift = smoothstep(1.02, 1.70, doppler);
      float redShift = 1.0 - smoothstep(0.58, 1.02, doppler);
      diskColor = mix(diskColor, diskColor * vec3(1.16, 1.18, 1.27), blueShift * 0.58);
      diskColor = mix(diskColor, diskColor * vec3(0.92, 0.58, 0.38), redShift * 0.48);

      float g2 = max(0.0, 1.0 - 1.0 / rd);
      diskColor *= mix(vec3(1.0, 0.66, 0.46), vec3(1.0), g2);
      float radialBrightness = pow(3.5 / rd, 2.0);
      float brightness = density * radialBrightness * beam * g2 * 4.6;
      float alpha = clamp(density * (0.22 + radialBrightness * 0.42), 0.0, 0.72);
      return vec4(diskColor * brightness, alpha);
    }

    void main() {
      vec2 ndc = vUv * 2.0 - 1.0;
      float aspect = uResolution.x / max(1.0, uResolution.y);
      ndc.x *= aspect;
      float lens = tan(uFov * 0.5);
      vec3 rayDir = normalize(uCamForward + ndc.x * lens * uCamRight + ndc.y * lens * uCamUp);

      vec3 p = uCamPos;
      vec3 v = rayDir;
      vec3 angularMomentum = cross(p, v);
      float h2 = dot(angularMomentum, angularMomentum);
      vec3 accumulated = vec3(0.0);
      float transmittance = 1.0;
      float rMin = 1000.0;
      bool captured = false;

      for (int i = 0; i < MAX_STEPS; i++) {
        if (i >= uStepCount) break;
        float r = length(p);
        rMin = min(rMin, r);
        if (r < 1.0) {
          captured = true;
          break;
        }
        if (r > 40.0 && dot(p, v) > 0.0) {
          break;
        }

        float dt = clamp(0.12 * r, 0.035, 0.9);
        vec3 acceleration = -1.5 * h2 * p / pow(r, 5.0);
        vec3 pPrev = p;
        v += acceleration * dt;
        p += v * dt;

        if (p.y * pPrev.y < 0.0) {
          float crossT = clamp(pPrev.y / (pPrev.y - p.y), 0.0, 1.0);
          vec3 hit = mix(pPrev, p, crossT);
          float rd = length(hit.xz);
          if (rd > 3.0 && rd < 9.0) {
            vec4 disk = diskEmission(hit, v);
            accumulated += transmittance * disk.rgb * disk.a;
            transmittance *= 1.0 - disk.a;
            if (transmittance < 0.02) break;
          }
        }
      }

      vec3 escapeColor = captured ? vec3(0.0) : background(normalize(v));
      float photonRing = smoothstep(0.30, 0.0, abs(rMin - 1.5));
      vec3 color = accumulated + transmittance * escapeColor;
      color += transmittance * photonRing * vec3(1.0, 0.82, 0.60) * 0.34;
      color *= uExposure;

      float dither = (hash12(gl_FragCoord.xy + uFrame * 13.17) - 0.5) * (2.0 / 255.0);
      color += vec3(dither);
      gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    }
  `;

  loadRenderer();
})();
