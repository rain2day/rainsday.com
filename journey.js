(() => {
  "use strict";

  const canvas = document.querySelector("[data-journey-canvas]");
  const body = document.body;
  const story = document.querySelector("[data-journey-story]");
  const menuButton = document.querySelector("[data-menu-open]");
  const menuOverlay = document.querySelector("[data-menu-overlay]");
  const menuClose = document.querySelector("[data-menu-close]");
  const scrollHint = document.querySelector("[data-scroll-hint]");
  const distanceReadout = document.querySelector("[data-hud-distance]");
  const dilationReadout = document.querySelector("[data-hud-dilation]");
  const velocityReadout = document.querySelector("[data-hud-velocity]");
  const actReadout = document.querySelector("[data-hud-act]");
  const progressBar = document.querySelector("[data-hud-progress]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = matchMedia("(pointer: coarse)").matches;
  const saveData = navigator.connection?.saveData === true;
  const FALLBACK_KEY = "journey-fallback";
  const RS_KM = 1.27e7;
  const STEP_TIERS = [220, 150, 96];
  const DEFAULT_ACT_SPANS = [120, 160, 540, 140, 160, 140];
  const DEFAULT_ACT_NAMES = ["DEPARTURE", "THE APPROACH", "IN ORBIT", "TIME DILATION", "EVENT HORIZON", "ESCAPE"];
  const actElements = [...document.querySelectorAll("[data-act]")].sort((a, b) => {
    return (Number(a.dataset.act) || 0) - (Number(b.dataset.act) || 0);
  });
  const ACT_SPANS = actElements.length
    ? actElements.map((el, index) => readActSpan(el, DEFAULT_ACT_SPANS[index] || 100))
    : DEFAULT_ACT_SPANS;
  const TOTAL_SPAN = ACT_SPANS.reduce((sum, value) => sum + value, 0);
  const ACTS = ACT_SPANS.map((span, index) => {
    const startSpan = ACT_SPANS.slice(0, index).reduce((sum, value) => sum + value, 0);
    const endSpan = ACT_SPANS.slice(0, index + 1).reduce((sum, value) => sum + value, 0);
    const actIndex = Number(actElements[index]?.dataset.act);
    const name = actElements[index]?.dataset.actName || DEFAULT_ACT_NAMES[index] || `ACT ${index}`;
    return {
      index: Number.isFinite(actIndex) ? actIndex : index,
      order: index,
      span,
      startSpan,
      endSpan,
      start: startSpan / TOTAL_SPAN,
      end: endSpan / TOTAL_SPAN,
      name,
    };
  });
  const actBoundary = (index, edge) => ACTS[index]?.[edge] ?? (edge === "start" ? 0 : 1);
  const actLocalP = (index, t) => {
    const act = ACTS[index];
    if (!act) return 0;
    return act.start + (act.end - act.start) * t;
  };
  const CAMERA_KEYFRAMES = [
    { p: actBoundary(0, "start"), r: 34.0, polar: 78, azimuth: 0, offsetX: 0.00, offsetY: 0.12, diskScale: 0.04, steps: 96, exposure: 1.00 },
    { p: actBoundary(0, "end"), r: 30.0, polar: 78, azimuth: 6, offsetX: 0.10, offsetY: 0.12, diskScale: 0.25, steps: 96, exposure: 1.00 },
    { p: actBoundary(1, "end"), r: 14.0, polar: 80, azimuth: 40, offsetX: 0.22, offsetY: 0.10, diskScale: 1.00, steps: 150, exposure: 1.05 },
    { p: actLocalP(2, 0.33), r: 13.0, polar: 81, azimuth: 87, offsetX: -0.12, offsetY: 0.09, diskScale: 1.05, steps: 150, exposure: 1.05 },
    { p: actLocalP(2, 0.66), r: 13.4, polar: 82, azimuth: 133, offsetX: -0.04, offsetY: 0.07, diskScale: 1.10, steps: 150, exposure: 1.05 },
    { p: actBoundary(2, "end"), r: 14.0, polar: 84, azimuth: 180, offsetX: 0.18, offsetY: 0.06, diskScale: 1.10, steps: 150, exposure: 1.05 },
    { p: actBoundary(3, "end"), r: 6.5, polar: 84, azimuth: 205, offsetX: 0.18, offsetY: 0.06, diskScale: 1.10, steps: 220, exposure: 1.10 },
    { p: actBoundary(4, "end"), r: 4.6, polar: 86, azimuth: 215, offsetX: 0.22, offsetY: 0.08, diskScale: 1.00, steps: 220, exposure: 1.12 },
    { p: actBoundary(5, "end"), r: 38.0, polar: 76, azimuth: 395, offsetX: -0.38, offsetY: -0.18, diskScale: 0.55, steps: 96, exposure: 0.95 },
  ];

  const stickyFallback = (() => {
    try {
      return sessionStorage.getItem(FALLBACK_KEY) === "1";
    } catch {
      return false;
    }
  })();

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const lerp = (from, to, t) => from + (to - from) * t;
  const inverseLerp = (from, to, value) => clamp((value - from) / Math.max(0.000001, to - from), 0, 1);
  const smoothstep = (edge0, edge1, value) => {
    const t = inverseLerp(edge0, edge1, value);
    return t * t * (3 - 2 * t);
  };
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeInCubic = (t) => Math.pow(clamp(t, 0, 1), 3);
  const degToRad = (degrees) => (degrees * Math.PI) / 180;

  function readActSpan(el, fallback) {
    const raw = el.style.getPropertyValue("--span") || getComputedStyle(el).getPropertyValue("--span");
    const value = Number.parseFloat(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  const actNodes = ACTS.map((act) => {
    const el = actElements[act.order] || document.querySelector(`[data-act="${act.index}"]`);
    return {
      ...act,
      el,
      copy: el?.querySelector("[data-act-copy]") || null,
    };
  });
  const orbitCards = [...document.querySelectorAll("[data-orbit-card]")];
  const orbitIntro = document.querySelector(".orbit-intro");
  const fieldRuleItems = [...document.querySelectorAll("[data-field-rule]")];

  initMenu();
  initHoverMotion();
  initScrollHint();

  if (!canvas || !story || reducedMotion || saveData || stickyFallback) {
    activateStatic();
    return;
  }

  loadRenderer();

  function setStickyFallback() {
    try {
      sessionStorage.setItem(FALLBACK_KEY, "1");
    } catch {
      // Session storage can be blocked; this page view still falls back.
    }
  }

  function activateStatic() {
    body.classList.add("journey-static");
    if (canvas) canvas.hidden = true;
    updateActContent(1);
    updateOrbitCard(0);
  }

  function initMenu() {
    if (!menuButton || !menuOverlay) return;

    let lastFocus = null;
    const focusableSelector = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

    const getFocusable = () => [...menuOverlay.querySelectorAll(focusableSelector)]
      .filter((node) => !node.hasAttribute("hidden") && node.offsetParent !== null);

    const openMenu = () => {
      lastFocus = document.activeElement;
      menuOverlay.hidden = false;
      body.classList.add("is-menu-open");
      menuButton.setAttribute("aria-expanded", "true");
      window.setTimeout(() => getFocusable()[0]?.focus({ preventScroll: true }), 0);
    };

    const closeMenu = () => {
      menuOverlay.hidden = true;
      body.classList.remove("is-menu-open");
      menuButton.setAttribute("aria-expanded", "false");
      if (lastFocus instanceof HTMLElement) lastFocus.focus({ preventScroll: true });
    };

    menuButton.addEventListener("click", openMenu);
    menuClose?.addEventListener("click", closeMenu);
    menuOverlay.addEventListener("click", (event) => {
      if (event.target === menuOverlay || event.target.classList.contains("menu-shell")) closeMenu();
    });
    menuOverlay.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
      if (menuOverlay.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
  }

  function initHoverMotion() {
    if (reducedMotion) return;

    orbitCards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / Math.max(1, rect.width) - 0.5) * 2;
        card.style.setProperty("--tilt", `${clamp(x * 4, -4, 4).toFixed(2)}deg`);
      }, { passive: true });
      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt", "0deg");
      });
    });

    document.querySelectorAll("[data-magnetic]").forEach((node) => {
      node.addEventListener("pointermove", (event) => {
        const rect = node.getBoundingClientRect();
        const x = clamp(event.clientX - (rect.left + rect.width / 2), -6, 6);
        const y = clamp(event.clientY - (rect.top + rect.height / 2), -6, 6);
        node.style.setProperty("--magnetic-x", `${x.toFixed(1)}px`);
        node.style.setProperty("--magnetic-y", `${y.toFixed(1)}px`);
      }, { passive: true });
      node.addEventListener("pointerleave", () => {
        node.style.setProperty("--magnetic-x", "0px");
        node.style.setProperty("--magnetic-y", "0px");
      });
    });
  }

  function initScrollHint() {
    if (!scrollHint) return;
    const mute = () => {
      if (window.scrollY > 8) scrollHint.classList.add("is-muted");
    };
    window.addEventListener("scroll", mute, { passive: true });
    mute();
  }

  async function loadRenderer() {
    try {
      const THREE = await import("three");
      initJourneyRenderer(THREE);
    } catch (error) {
      console.warn("Journey renderer failed to load", error);
      setStickyFallback();
      activateStatic();
    }
  }

  function initJourneyRenderer(THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: false,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("Journey WebGL failed", error);
      setStickyFallback();
      activateStatic();
      return;
    }

    renderer.setClearColor(0x06070f, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 2);
    camera.position.z = 1;

    const uniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uFrame: { value: 0 },
      uCamPos: { value: new THREE.Vector3(0, 0, 34) },
      uCamRight: { value: new THREE.Vector3(1, 0, 0) },
      uCamUp: { value: new THREE.Vector3(0, 1, 0) },
      uCamForward: { value: new THREE.Vector3(0, 0, -1) },
      uFov: { value: THREE.MathUtils.degToRad(60) },
      uStepCount: { value: 96 },
      uExposure: { value: 1.0 },
      uDiskScale: { value: 0.04 },
      uCenterOffset: { value: new THREE.Vector2(0, 0.12) },
      uWarp: { value: 0 },
      uWarpCenter: { value: new THREE.Vector2(0, 0.12) },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      depthWrite: false,
      depthTest: false,
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.frustumCulled = false;
    scene.add(plane);

    const worldUp = new THREE.Vector3(0, 1, 0);
    const camPos = new THREE.Vector3();
    const camForward = new THREE.Vector3();
    const camRight = new THREE.Vector3();
    const camUp = new THREE.Vector3();
    const ACTIVE_FRAME_MS = 16.2;
    const IDLE_FRAME_MS = 33.3;
    const INTERACTION_GRACE_MS = 1500;

    const state = {
      width: 1,
      height: 1,
      baseDpr: 1,
      renderScale: 1,
      stepTier: STEP_TIERS[0],
      frame: 0,
      raf: 0,
      lastFrameTime: 0,
      lastRenderTime: 0,
      lastInteractionTime: Number.NEGATIVE_INFINITY,
      renderAccumulator: 0,
      simTime: 0,
      targetP: 0,
      displayP: 0,
      renderSamples: [],
      slowSamples: [],
      fastFrames: 0,
      upscaleCooldown: 0,
      dead: false,
    };

    const applyRenderSize = () => {
      state.baseDpr = coarsePointer ? Math.min(window.devicePixelRatio || 1, 1.25) : Math.min(window.devicePixelRatio || 1, 1.6);
      const pixelRatio = state.baseDpr * state.renderScale;
      state.width = Math.max(1, window.innerWidth || canvas.clientWidth || 1);
      state.height = Math.max(1, window.innerHeight || canvas.clientHeight || 1);
      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(state.width, state.height, false);
      uniforms.uResolution.value.set(
        Math.max(1, Math.round(state.width * pixelRatio)),
        Math.max(1, Math.round(state.height * pixelRatio))
      );
    };

    const teardown = (sticky) => {
      if (sticky) setStickyFallback();
      state.dead = true;
      if (state.raf) cancelAnimationFrame(state.raf);
      state.raf = 0;
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", markInteraction);
      window.removeEventListener("wheel", markInteraction);
      window.removeEventListener("touchstart", markInteraction);
      window.removeEventListener("touchmove", markInteraction);
      window.removeEventListener("keydown", markInteraction);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      activateStatic();
    };

    const updatePerf = (frameMs, budget) => {
      state.frame += 1;
      if (state.upscaleCooldown > 0) state.upscaleCooldown -= 1;
      state.renderSamples.push(frameMs);
      if (state.renderSamples.length > 30) state.renderSamples.shift();

      const atFloor = state.renderScale <= 0.45 && state.stepTier === STEP_TIERS[2];
      if (atFloor) {
        state.slowSamples.push(frameMs);
        if (state.slowSamples.length > 120) state.slowSamples.shift();
        if (state.slowSamples.length === 120) {
          const slowAverage = state.slowSamples.reduce((sum, value) => sum + value, 0) / state.slowSamples.length;
          if (slowAverage > Math.max(40, budget * 1.3)) {
            teardown(true);
            return;
          }
        }
      } else {
        state.slowSamples = [];
      }

      if (state.renderSamples.length < 30) return;
      const average = state.renderSamples.reduce((sum, value) => sum + value, 0) / state.renderSamples.length;

      if (average > budget * 1.3) {
        state.fastFrames = 0;
        state.upscaleCooldown = 180;
        if (state.renderScale > 0.45) {
          state.renderScale = Math.max(0.45, state.renderScale * 0.85);
        } else {
          const tierIndex = STEP_TIERS.indexOf(state.stepTier);
          if (tierIndex >= 0 && tierIndex < STEP_TIERS.length - 1) state.stepTier = STEP_TIERS[tierIndex + 1];
        }
        applyRenderSize();
        state.renderSamples = [];
      } else if (
        average <= budget * 1.05 &&
        state.upscaleCooldown <= 0 &&
        (state.renderScale < 1 || state.stepTier < STEP_TIERS[0])
      ) {
        state.fastFrames += 1;
        if (state.fastFrames >= 90) {
          state.renderScale = Math.min(1, state.renderScale * 1.1);
          if (state.renderScale >= 1 && state.stepTier < STEP_TIERS[0]) {
            const tierIndex = STEP_TIERS.indexOf(state.stepTier);
            state.stepTier = STEP_TIERS[Math.max(0, tierIndex - 1)];
          }
          applyRenderSize();
          state.fastFrames = 0;
          state.renderSamples = [];
        }
      } else {
        state.fastFrames = 0;
      }
    };

    const updateCameraUniforms = (cameraState) => {
      const sinPolar = Math.sin(cameraState.polar);
      camPos.set(
        cameraState.r * sinPolar * Math.sin(cameraState.azimuth),
        cameraState.r * Math.cos(cameraState.polar),
        cameraState.r * sinPolar * Math.cos(cameraState.azimuth)
      );

      camForward.copy(camPos).multiplyScalar(-1).normalize();
      camRight.crossVectors(camForward, worldUp).normalize();
      camUp.crossVectors(camRight, camForward).normalize();

      uniforms.uCamPos.value.copy(camPos);
      uniforms.uCamForward.value.copy(camForward);
      uniforms.uCamRight.value.copy(camRight);
      uniforms.uCamUp.value.copy(camUp);
      uniforms.uStepCount.value = Math.max(1, Math.min(Math.round(cameraState.steps), state.stepTier));
      uniforms.uExposure.value = cameraState.exposure;
      uniforms.uDiskScale.value = cameraState.diskScale;
      uniforms.uCenterOffset.value.set(cameraState.offsetX, cameraState.offsetY);
      uniforms.uWarpCenter.value.set(cameraState.offsetX, cameraState.offsetY);
    };

    function markInteraction(event) {
      state.lastInteractionTime = event.timeStamp || performance.now();
    }

    const getInteractionActive = (now) => {
      if (typeof document.hasFocus === "function" && !document.hasFocus()) return false;
      const isSettling = Math.abs(state.targetP - state.displayP) > 0.0006;
      const recentInput = now - state.lastInteractionTime < INTERACTION_GRACE_MS;
      const introRunning = state.simTime < 3;
      const menuOpen = menuOverlay ? !menuOverlay.hidden : false;
      return isSettling || recentInput || introRunning || menuOpen;
    };

    const render = (now) => {
      if (document.hidden || state.dead) {
        state.raf = 0;
        return;
      }

      const rawFrameMs = state.lastFrameTime ? now - state.lastFrameTime : ACTIVE_FRAME_MS;
      const frameMs = Math.max(0, rawFrameMs);
      state.lastFrameTime = now;
      state.simTime += frameMs / 1000;

      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      state.targetP = clamp(window.scrollY / maxScroll, 0, 1);
      state.displayP += (state.targetP - state.displayP) * 0.07;
      if (Math.abs(state.targetP - state.displayP) < 0.00005) state.displayP = state.targetP;
      state.renderAccumulator += frameMs;

      const interactionActive = getInteractionActive(now);
      const targetInterval = interactionActive ? ACTIVE_FRAME_MS : IDLE_FRAME_MS;

      if (state.renderAccumulator < targetInterval) {
        state.raf = requestAnimationFrame(render);
        return;
      }

      const aspect = state.width / Math.max(1, state.height);
      const cameraState = computeCameraState(state.displayP, aspect);
      const velocityWarp = clamp(Math.abs(state.targetP - state.displayP) * 9.5, 0, 0.62);
      const escapeWarp = computeEscapeWarp(state.displayP);
      uniforms.uWarp.value = clamp(velocityWarp + escapeWarp, 0, 0.92);

      updateCameraUniforms(cameraState);
      updateHud(state.displayP, cameraState);
      updateActContent(state.displayP);
      updateOrbitFromProgress(state.displayP);

      uniforms.uTime.value = state.simTime;
      uniforms.uFrame.value = state.frame;
      renderer.render(scene, camera);
      const renderFrameMs = state.lastRenderTime ? now - state.lastRenderTime : targetInterval;
      state.lastRenderTime = now;
      state.renderAccumulator %= targetInterval;
      updatePerf(renderFrameMs, targetInterval);

      if (!state.dead) state.raf = requestAnimationFrame(render);
    };

    const startLoop = () => {
      if (state.raf || state.dead || document.hidden) return;
      state.lastFrameTime = 0;
      state.lastRenderTime = 0;
      state.renderAccumulator = ACTIVE_FRAME_MS;
      state.raf = requestAnimationFrame(render);
    };

    const stopLoop = () => {
      if (!state.raf) return;
      cancelAnimationFrame(state.raf);
      state.raf = 0;
    };

    function onResize() {
      applyRenderSize();
    }

    function onVisibilityChange() {
      if (document.hidden) stopLoop();
      else startLoop();
    }

    canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      teardown(true);
    });
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("pointermove", markInteraction, { passive: true });
    window.addEventListener("wheel", markInteraction, { passive: true });
    window.addEventListener("touchstart", markInteraction, { passive: true });
    window.addEventListener("touchmove", markInteraction, { passive: true });
    window.addEventListener("keydown", markInteraction);
    document.addEventListener("visibilitychange", onVisibilityChange);

    applyRenderSize();
    startLoop();
  }

  function computeCameraState(p, aspect) {
    const keyframes = CAMERA_KEYFRAMES;

    let from = keyframes[0];
    let to = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i += 1) {
      if (p >= keyframes[i].p && p <= keyframes[i + 1].p) {
        from = keyframes[i];
        to = keyframes[i + 1];
        break;
      }
    }

    const t = smoothstep(0, 1, inverseLerp(from.p, to.p, p));
    const state = {
      r: lerp(from.r, to.r, t),
      polar: degToRad(lerp(from.polar, to.polar, t)),
      azimuth: degToRad(lerp(from.azimuth, to.azimuth, t)),
      offsetX: lerp(from.offsetX, to.offsetX, t),
      offsetY: lerp(from.offsetY, to.offsetY, t),
      diskScale: lerp(from.diskScale, to.diskScale, t),
      steps: Math.round(lerp(from.steps, to.steps, t)),
      exposure: lerp(from.exposure, to.exposure, t),
    };

    if (p >= ACTS[5].start) {
      const local = inverseLerp(ACTS[5].start, ACTS[5].end, p);
      state.r = lerp(4.6, 38, easeOutExpo(local));
    }

    if (aspect < 1) {
      state.offsetX *= 0.45;
      state.offsetY += 0.10;
    }

    return state;
  }

  function computeEscapeWarp(p) {
    if (p < ACTS[5].start) return 0;
    const local = inverseLerp(ACTS[5].start, ACTS[5].end, p);
    const peak = 0.9 * Math.exp(-Math.pow((local - 0.27) / 0.40, 2));
    const floor = 0.15 * smoothstep(0.62, 1, local);
    return Math.max(peak, floor);
  }

  function updateHud(p, cameraState) {
    const active = getActiveAct(p);
    const km = cameraState.r * RS_KM;
    const dilation = 1 / Math.sqrt(Math.max(0.0001, 1 - 1 / cameraState.r));
    const escapeVelocity = Math.sqrt(1 / cameraState.r);

    if (distanceReadout) distanceReadout.textContent = `${formatScientific(km)} km`;
    if (dilationReadout) dilationReadout.textContent = `×${dilation.toFixed(3)}`;
    if (velocityReadout) {
      velocityReadout.textContent = active.index === 5 && cameraState.r > 20
        ? "0.99 c — ESCAPE"
        : `${escapeVelocity.toFixed(2)} c`;
    }
    if (actReadout) actReadout.textContent = `ACT ${String(active.index).padStart(2, "0")} — ${active.name}`;
    if (progressBar) progressBar.style.transform = `scaleX(${p.toFixed(4)})`;
  }

  function updateActContent(p) {
    actNodes.forEach((act) => {
      if (!act.el || !act.copy) return;
      const t = inverseLerp(act.start, act.end, p);
      const isDeparture = act.index === 0;
      const enter = isDeparture ? 1 : smoothstep(0, 0.15, t);
      const exit = isDeparture ? 1 - smoothstep(0.80, 1, t) : 1 - smoothstep(0.85, 1, t);
      const alpha = clamp(enter * exit, 0, 1);
      const y = (1 - enter) * 24 + (1 - exit) * -24;
      act.copy.style.setProperty("--act-alpha", alpha.toFixed(3));
      act.copy.style.setProperty("--act-y", `${y.toFixed(1)}px`);
      act.el.classList.toggle("is-active", alpha > 0.03);

      if (act.index === 3) updateFieldRules(t);
    });
  }

  function updateOrbitFromProgress(p) {
    if (!orbitCards.length) return;
    const local = inverseLerp(ACTS[2].start, ACTS[2].end, p);
    updateOrbitIntro(local);
    updateOrbitCards(local);
  }

  function updateOrbitIntro(local) {
    if (!orbitIntro) return;
    const beatSpan = 1 / getOrbitBeatCount();
    const fadeStart = beatSpan;
    const fadeEnd = fadeStart + beatSpan * 0.30;
    const alpha = 1 - smoothstep(fadeStart, fadeEnd, local);
    orbitIntro.style.setProperty("--orbit-intro-alpha", alpha.toFixed(3));
    orbitIntro.style.setProperty("--orbit-intro-y", `${((1 - alpha) * -16).toFixed(1)}px`);
  }

  function updateOrbitCard(index) {
    orbitCards.forEach((card, cardIndex) => {
      card.classList.toggle("is-active", cardIndex === index);
      card.style.setProperty("--card-alpha", cardIndex === index ? "1.000" : "0.000");
      card.style.setProperty("--card-y", cardIndex === index ? "0.0px" : "28.0px");
      card.style.setProperty("--card-scale", cardIndex === index ? "1.000" : "0.970");
    });
  }

  function updateOrbitCards(local) {
    const beatCount = getOrbitBeatCount();
    const activeIndex = clamp(Math.floor(Math.min(beatCount - 0.001, local * beatCount)), 0, beatCount - 1);

    orbitCards.forEach((card, index) => {
      const beatStart = index / beatCount;
      const beatEnd = (index + 1) / beatCount;
      const beatLocal = inverseLerp(beatStart, beatEnd, local);
      const envelope = orbitEnvelope(beatLocal);
      card.classList.toggle("is-active", index === activeIndex && envelope.alpha > 0.03);
      card.style.setProperty("--card-alpha", envelope.alpha.toFixed(3));
      card.style.setProperty("--card-y", `${envelope.y.toFixed(1)}px`);
      card.style.setProperty("--card-scale", envelope.scale.toFixed(3));
    });
  }

  function orbitEnvelope(t) {
    if (t <= 0 || t >= 1) return { alpha: 0, y: t >= 1 ? -28 : 28, scale: t >= 1 ? 1 : 0.97 };
    if (t < 0.18) {
      const enter = easeOutCubic(t / 0.18);
      return { alpha: enter, y: lerp(28, 0, enter), scale: lerp(0.97, 1, enter) };
    }
    if (t <= 0.82) return { alpha: 1, y: 0, scale: 1 };
    const exit = easeInCubic((t - 0.82) / 0.18);
    return { alpha: 1 - exit, y: lerp(0, -28, exit), scale: 1 };
  }

  function updateFieldRules(local) {
    if (!fieldRuleItems.length) return;
    fieldRuleItems.forEach((item, index) => {
      const start = 0.30 + index * 0.10;
      const alpha = smoothstep(start, start + 0.10, local);
      item.style.setProperty("--rule-alpha", alpha.toFixed(3));
      item.style.setProperty("--rule-y", `${((1 - alpha) * 12).toFixed(1)}px`);
    });
  }

  function getOrbitBeatCount() {
    return Math.max(1, orbitCards.length);
  }

  function getActiveAct(p) {
    return ACTS.find((act, index) => p >= act.start && (p < act.end || index === ACTS.length - 1)) || ACTS[ACTS.length - 1];
  }

  function formatScientific(value) {
    if (value <= 0) return "0";
    const exponent = Math.floor(Math.log10(value));
    const mantissa = value / Math.pow(10, exponent);
    return `${mantissa.toFixed(1)}×10${toSuperscript(exponent)}`;
  }

  function toSuperscript(value) {
    const map = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(value).split("").map((char) => map[char] || char).join("");
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
    uniform float uDiskScale;
    uniform float uWarp;
    uniform vec2 uCenterOffset;
    uniform vec2 uWarpCenter;

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

    float bhLuma(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    vec3 capLuminance(vec3 color, float cap) {
      float luma = bhLuma(color);
      return color * min(1.0, cap / max(luma, 0.0001));
    }

    float directedSmoothstep(float edge0, float edge1, float value) {
      float t = clamp((value - edge0) / (edge1 - edge0), 0.0, 1.0);
      return t * t * (3.0 - 2.0 * t);
    }

    vec3 starLayer(vec3 dir, vec3 centerDir, float scale, float density, float seed) {
      float warp = clamp(uWarp, 0.0, 0.92);
      vec2 uv = octahedral(dir);
      vec2 centerUv = octahedral(centerDir);
      vec2 rdLayer = uv - centerUv;
      float rdLength = length(rdLayer);
      rdLayer = rdLength > 0.0001 ? rdLayer / rdLength : vec2(0.0, 1.0);
      vec2 grid = uv * scale;
      vec2 cell = floor(grid);
      vec2 local = fract(grid);
      float present = 1.0 - step(density, hash12(cell + seed));
      vec2 starPos = hash22(cell + seed * 3.17);
      vec2 q = local - starPos;
      q -= rdLayer * dot(q, rdLayer) * warp;
      float dist = length(q);
      float starSize = mix(0.034, 0.012, hash12(cell + seed + 4.0));
      float brightness = 0.50 + pow(hash12(cell + seed + 8.0), 7.0) * 3.50;
      float core = pow(max(0.0, 1.0 - dist / starSize), 18.0);
      float spike = step(1.6, brightness)
        * pow(max(0.0, 1.0 - (abs(q.x) + abs(q.y)) / (starSize * 7.0)), 3.0)
        * 0.60;
      core += spike;
      float twinkle = 0.94 + 0.06 * sin(uTime * 1.7 + hash12(cell + seed + 12.0) * 20.0);
      vec3 tint = mix(vec3(1.0, 0.76, 0.55), vec3(0.74, 0.84, 1.0), hash12(cell + seed + 16.0));
      return tint * present * core * brightness * twinkle;
    }

    vec3 microStarLayer(vec3 dir, float scale, float density, float seed) {
      vec2 uv = octahedral(dir);
      vec2 grid = uv * scale;
      vec2 cell = floor(grid);
      vec2 local = fract(grid);
      float h = hash12(cell + seed);
      float present = 1.0 - step(density, h);
      vec2 starPos = fract(vec2(h * 37.23, h * 91.71));
      vec2 q = local - starPos;
      float dist = length(q);
      float starSize = mix(0.006, 0.012, fract(h * 19.31));
      float core = pow(max(0.0, 1.0 - dist / starSize), 16.0);
      float brightness = mix(0.10, 0.25, fract(h * 53.37));
      return vec3(0.82, 0.88, 1.0) * present * core * brightness;
    }

    vec3 nebulaPatch(vec3 dir, vec3 anchor, float radius, vec3 tint, float seed) {
      float spread = length(dir - anchor);
      float falloff = 1.0 - smoothstep(radius * 0.25, radius, spread);
      float cloud = fbm3(dir * 3.4 + anchor * seed);
      vec3 glow = tint * falloff * (0.42 + 0.58 * cloud);
      return capLuminance(glow, 0.12);
    }

    vec3 background(vec3 dir, vec3 centerDir) {
      float warp = clamp(uWarp, 0.0, 0.92);
      vec3 color = vec3(0.0235, 0.0275, 0.0588);
      color += nebulaPatch(dir, normalize(vec3(0.60, 0.20, -0.40)), 0.72, vec3(0.10, 0.06, 0.18), 5.1);
      color += nebulaPatch(dir, normalize(vec3(-0.35, -0.16, -0.72)), 0.64, vec3(0.16, 0.08, 0.05), 8.4);
      color += nebulaPatch(dir, normalize(vec3(-0.70, 0.32, 0.22)), 0.58, vec3(0.08, 0.05, 0.16), 11.6);

      vec3 bandNormal = normalize(vec3(0.25, 0.82, 0.50));
      float bandAxis = abs(dot(dir, bandNormal));
      float band = exp(-pow(bandAxis, 2.0) * 34.0);
      band *= 1.0 + warp * 0.4;
      float bandCore = smoothstep(0.28, 0.94, band);
      float cloud = fbm3(dir * 3.0 + vec3(0.0, uTime * 0.002, 0.0));
      float dust = smoothstep(0.54, 0.90, fbm3(dir * 22.0 + vec3(4.0, 0.0, 8.0)));
      float ridge = 1.0 - abs(2.0 * fbm3(dir * 13.0 + vec3(2.0, 6.0, 9.0)) - 1.0);
      float lanes = smoothstep(0.48, 0.88, ridge) * bandCore;
      vec3 coolTint = vec3(0.18, 0.20, 0.30);
      vec3 warmTint = vec3(0.32, 0.27, 0.30);
      vec3 bandTint = mix(coolTint, warmTint, bandCore);
      vec3 milky = bandTint * band * (0.12 + 0.54 * cloud);
      milky *= 1.0 - 0.62 * dust;
      milky *= 1.0 - 0.56 * lanes;
      color += capLuminance(milky, 0.55);

      color += starLayer(dir, centerDir, 28.0, 0.15, 2.0);
      color += starLayer(dir, centerDir, 64.0, 0.15, 17.0);
      color += starLayer(dir, centerDir, 120.0, 0.15, 41.0);
      color += microStarLayer(dir, 200.0, 0.10, 73.0);
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
      float brightness = density * radialBrightness * beam * g2 * 4.6 * uDiskScale;
      float alpha = clamp(density * (0.22 + radialBrightness * 0.42) * min(1.0, uDiskScale), 0.0, 0.72);
      return vec4(diskColor * brightness, alpha);
    }

    void main() {
      vec2 ndcOriginal = vUv * 2.0 - 1.0;
      vec2 ndc = ndcOriginal - uCenterOffset;
      float aspect = uResolution.x / max(1.0, uResolution.y);
      ndc.x *= aspect;
      vec2 centerNdc = uWarpCenter - uCenterOffset;
      centerNdc.x *= aspect;
      float lens = tan(uFov * 0.5);
      vec3 rayDir = normalize(uCamForward + ndc.x * lens * uCamRight + ndc.y * lens * uCamUp);
      vec3 centerDir = normalize(uCamForward + centerNdc.x * lens * uCamRight + centerNdc.y * lens * uCamUp);

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

      vec3 escapeColor = captured ? vec3(0.0) : background(normalize(v), centerDir);
      if (!captured) {
        float mag = 1.0 + 2.2 * directedSmoothstep(3.5, 1.6, rMin);
        escapeColor *= mag;
      }
      float photonRing = directedSmoothstep(0.30, 0.0, abs(rMin - 1.5));
      vec3 color = accumulated + transmittance * escapeColor;
      color += transmittance * photonRing * vec3(1.0, 0.86, 0.68) * 0.45;
      color *= uExposure;

      float dither = (hash12(gl_FragCoord.xy + uFrame * 13.17) - 0.5) * (2.0 / 255.0);
      color += vec3(dither);
      gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
    }
  `;
})();
