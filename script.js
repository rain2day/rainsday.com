(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse  = matchMedia("(hover: none), (pointer: coarse)").matches;

  (() => {
    const progress = document.querySelector(".scroll-progress");
    const supportsScrollTimeline =
      typeof CSS !== "undefined" &&
      (CSS.supports?.("animation-timeline: scroll()") || CSS.supports?.("animation-timeline: scroll(root block)"));
    if (!progress || supportsScrollTimeline) return;

    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const ratio = max > 0 ? scrollY / max : 0;
      progress.style.transform = `scaleX(${Math.max(0, Math.min(1, ratio))})`;
    };
    addEventListener("scroll", updateProgress, { passive: true });
    addEventListener("resize", updateProgress, { passive: true });
    updateProgress();
  })();

  // Pause any autoplaying video under reduced-motion (poster still shows).
  if (reduced) {
    document.querySelectorAll("video[autoplay]").forEach((v) => {
      v.removeAttribute("autoplay");
      v.pause();
    });
  }

  /* ------------------------------------------------------------
   * Hero video sequence. cycles through [data-hero-sequence] srcs
   * in order on each `ended` event. Loops back to the first.
   * ------------------------------------------------------------ */
  (() => {
    const v = document.querySelector("video[data-hero-sequence]");
    if (!v || reduced) return;
    let srcs;
    try { srcs = JSON.parse(v.dataset.heroSequence); }
    catch { return; }
    if (!Array.isArray(srcs) || srcs.length < 2) return;

    let i = 0;
    v.addEventListener("ended", () => {
      i = (i + 1) % srcs.length;
      v.src = srcs[i];
      v.load();
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    });
  })();

  /* ------------------------------------------------------------
   * 1. Custom cursor (dot + lerp ring)
   * ------------------------------------------------------------ */
  const cursor = document.querySelector(".cursor");
  const cursorDot = cursor?.querySelector(".cursor-dot");
  const cursorRing = cursor?.querySelector(".cursor-ring");

  // Module-scope cursor target. shared with fish + pixel proximity layers.
  const mouse = {
    x: innerWidth / 2, y: innerHeight / 2,
    nx: 0.5, ny: 0.5,
    active: false,
  };

  addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.nx = e.clientX / innerWidth;
    mouse.ny = e.clientY / innerHeight;
    mouse.active = true;
  }, { passive: true });
  addEventListener("mouseleave", () => { mouse.active = false; });

  if (cursor && !coarse && !reduced) {
    const dot  = { x: mouse.x, y: mouse.y };
    const ring = { x: mouse.x, y: mouse.y };

    const pointerSel = "a, button, [data-magnetic], [data-tilt], .project-card, .news-row, .partner-cell, .people-tag";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(pointerSel)) cursor.classList.add("is-pointer");
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest?.(pointerSel)) {
        cursor.classList.remove("is-pointer");
      }
    });

    const loop = () => {
      dot.x  += (mouse.x - dot.x)  * 0.55;
      dot.y  += (mouse.y - dot.y)  * 0.55;
      ring.x += (mouse.x - ring.x) * 0.18;
      ring.y += (mouse.y - ring.y) * 0.18;
      cursorDot.style.transform  = `translate3d(${dot.x}px, ${dot.y}px, 0)`;
      cursorRing.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------
   * 2. Magnetic CTAs
   * ------------------------------------------------------------ */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const k = 0.28;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top  - r.height / 2;
        el.style.transform = `translate3d(${x * k}px, ${y * k}px, 0)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate3d(0,0,0)";
      });
    });
  }

  /* ------------------------------------------------------------
   * 3. 3D tilt on cards / portrait
   * ------------------------------------------------------------ */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      // Fish container handles its own yaw, skip the generic tilt.
      if (el.hasAttribute("data-fish")) return;
      const max = el.classList.contains("project-card") ? 4 : 6;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top)  / r.height;
        const rx = (0.5 - py) * max;
        const ry = (px - 0.5) * max;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ------------------------------------------------------------
   * 4. Scroll reveal. [data-reveal], [data-reveal-stagger]
   *    Plus: per-letter reveal on [data-letters] containers.
   * ------------------------------------------------------------ */
  // Split [data-letters] contents into per-character spans BEFORE
  // the observer runs, so the staggered CSS transition has elements to animate.
  document.querySelectorAll("[data-letters]").forEach((el) => {
    const raw = el.textContent.trim();
    el.textContent = "";
    [...raw].forEach((char, i) => {
      const span = document.createElement("span");
      if (char === " ") {
        span.className = "ch space";
        span.innerHTML = "&nbsp;";
      } else {
        span.className = "ch";
        span.textContent = char;
      }
      span.style.transitionDelay = (i * 14) + "ms";
      el.appendChild(span);
    });
  });

  const reveals = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    reveals.forEach((el) => obs.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-revealed"));
  }

  /* ------------------------------------------------------------
   * 5. Hero scramble headline (load-once)
   *    Justification: storytelling. signals arrival.
   * ------------------------------------------------------------ */
  const scrambleHost = document.querySelector("[data-scramble]");
  if (scrambleHost && !reduced) {
    const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@*+/<>".split("");
    const lines = scrambleHost.querySelectorAll(".scramble-text");

    lines.forEach((line, lineIdx) => {
      const final = line.textContent;
      line.textContent = "";
      const chars = [];
      [...final].forEach((ch) => {
        const span = document.createElement("span");
        span.className = "ch";
        span.dataset.final = ch;
        span.textContent = ch === " " ? " " : ch;
        line.appendChild(span);
        chars.push(span);
      });

      const startDelay = 180 + lineIdx * 110;
      const perLetterDuration = 380;
      const stepInterval = 30;

      chars.forEach((span, i) => {
        const finalChar = span.dataset.final;
        if (!finalChar || finalChar === " ") return;
        const charStart = startDelay + i * 22;

        // Preview a random glyph until the staggered scramble actually starts.
        span.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];

        setTimeout(() => {
          let elapsed = 0;
          const tick = setInterval(() => {
            if (elapsed >= perLetterDuration) {
              span.textContent = finalChar;
              clearInterval(tick);
              return;
            }
            span.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            elapsed += stepInterval;
          }, stepInterval);
        }, charStart);
      });
    });
  }

  /* ------------------------------------------------------------
   * 6. Hero pixel field. bento stagger + cursor proximity glow.
   * ------------------------------------------------------------ */
  const field = document.querySelector("[data-bento-field]");
  const fieldSquares = [];
  if (field) buildBentoField(field, reduced);

  function buildBentoField(host, reduced) {
    const rect = () => ({ w: host.clientWidth, h: host.clientHeight });
    const rng = (a, b) => a + Math.random() * (b - a);
    const irng = (a, b) => Math.floor(rng(a, b + 1));

    const STEP = 16;
    const COUNT = 110;
    const palette = [
      { cls: "",         weight: 70 },
      { cls: "is-ink",   weight: 20 },
      { cls: "is-paper", weight: 10 },
    ];
    function pickColor() {
      const total = palette.reduce((s, p) => s + p.weight, 0);
      let r = Math.random() * total;
      for (const p of palette) {
        if (r < p.weight) return p.cls;
        r -= p.weight;
      }
      return "";
    }

    const { w, h } = rect();
    for (let i = 0; i < COUNT; i++) {
      const px = document.createElement("span");
      px.className = "px " + pickColor();

      const cx = w / 2, cy = h / 2;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.pow(Math.random(), 0.6) * Math.min(w, h) * 0.55;
      const x = Math.round((cx + Math.cos(ang) * r) / STEP) * STEP;
      const y = Math.round((cy + Math.sin(ang) * r) / STEP) * STEP;
      const size = STEP * irng(1, 3);

      px.style.left = x + "px";
      px.style.top  = y + "px";
      px.style.width  = size + "px";
      px.style.height = size + "px";
      px.dataset.x = x + size / 2;
      px.dataset.y = y + size / 2;

      if (Math.random() < 0.08) px.classList.add("is-pulse");

      host.appendChild(px);
      fieldSquares.push(px);
    }

    if (reduced) {
      fieldSquares.forEach((s) => s.classList.add("is-in"));
    } else {
      fieldSquares.forEach((s) => {
        const delay = Math.random() * 1500;
        setTimeout(() => s.classList.add("is-in"), delay);
      });
    }

    // Mouse parallax. drifts the WHOLE field gently.
    if (!coarse && !reduced) {
      host.parentElement.addEventListener("mousemove", (e) => {
        const r = host.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top  - r.height / 2) / r.height;
        host.style.transform = `translate3d(${x * -12}px, ${y * -12}px, 0)`;
      });
    }

    // Gentle reshuffle. occasional pixel reposition.
    if (!reduced) {
      setInterval(() => {
        const target = fieldSquares[Math.floor(Math.random() * fieldSquares.length)];
        const { w, h } = rect();
        const cx = w / 2, cy = h / 2;
        const ang = Math.random() * Math.PI * 2;
        const r = Math.pow(Math.random(), 0.6) * Math.min(w, h) * 0.55;
        const x = Math.round((cx + Math.cos(ang) * r) / STEP) * STEP;
        const y = Math.round((cy + Math.sin(ang) * r) / STEP) * STEP;
        target.classList.remove("is-in");
        setTimeout(() => {
          target.style.left = x + "px";
          target.style.top  = y + "px";
          target.dataset.x = x + parseFloat(target.style.width) / 2;
          target.dataset.y = y + parseFloat(target.style.height) / 2;
          target.classList.add("is-in");
        }, 320);
      }, 1800);
    }
  }

  /* ------------------------------------------------------------
   * 7. Pixel proximity glow + fish look-at (shared rAF loop)
   *    No window.addEventListener('scroll'). uses motion values only.
   * ------------------------------------------------------------ */
  const fishHost = document.querySelector("[data-fish]");
  if (!coarse && !reduced && (fieldSquares.length || fishHost)) {
    const fieldEl = field;
    let fieldRect = fieldEl?.getBoundingClientRect();
    let fishRect = fishHost?.getBoundingClientRect();

    // Refresh rects on viewport changes (no scroll listener needed,
    // resize covers reflow cases; rects auto-refresh per frame is too expensive).
    addEventListener("resize", () => {
      fieldRect = fieldEl?.getBoundingClientRect();
      fishRect = fishHost?.getBoundingClientRect();
    });

    // Sample rects every 250ms instead of every frame.
    setInterval(() => {
      fieldRect = fieldEl?.getBoundingClientRect();
      fishRect = fishHost?.getBoundingClientRect();
    }, 250);

    let fishYaw = 0;
    let fishYawTarget = 0;

    const reactLoop = () => {
      // Pixel proximity: pixels within radius scale slightly + glow class.
      if (fieldRect && fieldSquares.length) {
        const localX = mouse.x - fieldRect.left;
        const localY = mouse.y - fieldRect.top;
        const RADIUS = 140;
        const RADIUS_SQ = RADIUS * RADIUS;
        for (let i = 0; i < fieldSquares.length; i++) {
          const s = fieldSquares[i];
          const sx = +s.dataset.x || 0;
          const sy = +s.dataset.y || 0;
          const dx = sx - localX;
          const dy = sy - localY;
          const d2 = dx * dx + dy * dy;
          if (d2 < RADIUS_SQ) {
            const t = 1 - Math.sqrt(d2) / RADIUS;
            s.style.setProperty("--lift", (1 + t * 0.4).toFixed(3));
            s.style.transform = `scale(${1 + t * 0.35})`;
            if (!s.classList.contains("near")) s.classList.add("near");
          } else if (s.classList.contains("near")) {
            s.classList.remove("near");
            s.style.transform = "";
          }
        }
      }

      // Fish look-at: max ±4deg yaw, follows cursor horizontally.
      if (fishRect && fishHost) {
        const cx = fishRect.left + fishRect.width / 2;
        const dx = mouse.x - cx;
        fishYawTarget = Math.max(-4, Math.min(4, dx * 0.012));
        fishYaw += (fishYawTarget - fishYaw) * 0.12;
        fishHost.style.setProperty("--fish-yaw", fishYaw.toFixed(2) + "deg");
      }

      requestAnimationFrame(reactLoop);
    };
    requestAnimationFrame(reactLoop);
  }

  /* ------------------------------------------------------------
   * 8. Project card directional hover sweep
   *    JS sets --sx --sy CSS vars; CSS draws radial gradient.
   * ------------------------------------------------------------ */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-sweep]").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const sx = ((e.clientX - r.left) / r.width  * 100).toFixed(1) + "%";
        const sy = ((e.clientY - r.top)  / r.height * 100).toFixed(1) + "%";
        card.style.setProperty("--sx", sx);
        card.style.setProperty("--sy", sy);
      });
    });
  }

  /* ------------------------------------------------------------
   * 9. Topbar menu
   * ------------------------------------------------------------ */
  const menuBtn = document.querySelector(".topbar-menu");
  if (menuBtn) {
    const menuPanel = document.getElementById(menuBtn.getAttribute("aria-controls"));
    const setMenu = (open) => {
      menuBtn.setAttribute("aria-expanded", String(open));
      if (menuPanel) {
        menuPanel.hidden = !open;
        menuPanel.setAttribute("aria-hidden", String(!open));
      }
      document.body.classList.toggle("menu-open", open);
    };

    menuBtn.addEventListener("click", () => {
      const open = menuBtn.getAttribute("aria-expanded") === "true";
      setMenu(!open);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenu(false);
    });

    document.addEventListener("click", (e) => {
      const open = menuBtn.getAttribute("aria-expanded") === "true";
      if (!open) return;
      if (e.target.closest(".topbar-menu") || e.target.closest(".menu-panel")) return;
      setMenu(false);
    });

    menuPanel?.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setMenu(false));
    });
  }

  /* ------------------------------------------------------------
   * 10. Smooth scroll for in-page anchors
   * ------------------------------------------------------------ */
  document.addEventListener("click", (e) => {
    const link = e.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute("href");
    if (id === "#" || id.length < 2) return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  });
})();
