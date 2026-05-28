(() => {
  "use strict";

  const root = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ===========================================================
   * 1. Header reveal on load
   * =========================================================== */
  const header = document.querySelector(".site-header");
  if (header) {
    requestAnimationFrame(() => header.classList.add("is-ready"));
  }

  /* ===========================================================
   * 2. Custom cursor (lerp follow)
   * =========================================================== */
  const cursor = document.querySelector(".cursor");
  const cursorDot = cursor?.querySelector(".cursor-dot");
  const cursorRing = cursor?.querySelector(".cursor-ring");

  if (cursor && !coarse && !reduced) {
    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const dot = { x: target.x, y: target.y };
    const ring = { x: target.x, y: target.y };

    window.addEventListener("mousemove", (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    }, { passive: true });

    window.addEventListener("mousedown", () => cursor.classList.add("is-active"));
    window.addEventListener("mouseup", () => cursor.classList.remove("is-active"));

    const pointerSel = "a, button, [data-magnetic], [data-tilt], .stat-grid article, .gallery-track figure";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(pointerSel)) cursor.classList.add("is-pointer");
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest?.(pointerSel)) {
        cursor.classList.remove("is-pointer");
      }
    });

    const tick = () => {
      dot.x += (target.x - dot.x) * 0.55;
      dot.y += (target.y - dot.y) * 0.55;
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
      if (cursorDot) cursorDot.style.transform = `translate3d(${dot.x}px, ${dot.y}px, 0)`;
      if (cursorRing) cursorRing.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ===========================================================
   * 3. Magnetic buttons / interactive elements
   * =========================================================== */
  if (!coarse && !reduced) {
    const magnets = document.querySelectorAll("[data-magnetic]");
    magnets.forEach((el) => {
      const strength = 0.32;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate3d(0,0,0)";
      });
    });
  }

  /* ===========================================================
   * 4. 3D tilt on [data-tilt]
   * =========================================================== */
  if (!coarse && !reduced) {
    const tilts = document.querySelectorAll("[data-tilt]");
    tilts.forEach((el) => {
      const max = el.classList.contains("hero-panel") ? 6 : 8;
      el.addEventListener("mousemove", (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rotX = (0.5 - py) * max;
        const rotY = (px - 0.5) * max;
        el.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
      });
    });
  }

  /* ===========================================================
   * 5. Scroll-reveal
   * =========================================================== */
  const revealItems = document.querySelectorAll("[data-reveal], [data-reveal-stagger]");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    revealItems.forEach((el) => revealObserver.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add("is-revealed"));
  }

  /* ===========================================================
   * 6. Section motion + active nav
   * =========================================================== */
  const hero = document.querySelector(".hero");
  const motionContexts = [...document.querySelectorAll(".motion-context")];
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const updateScrollMotion = () => {
    if (hero) {
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(-bounds.top, 0), bounds.height);
      root.style.setProperty("--scroll-y", progress.toFixed(1));
    }

    motionContexts.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const range = window.innerHeight + rect.height;
      const raw = (window.innerHeight - rect.top) / range;
      const progress = Math.min(Math.max(raw, 0), 1);
      section.style.setProperty("--context-motion", progress.toFixed(3));
    });
  };

  const setActiveLink = () => {
    const current = sections.reduce((active, section) => {
      const rect = section.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.45 ? section.id : active;
    }, "");

    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${current}`);
    });
  };

  if ("IntersectionObserver" in window) {
    const contextObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-inview", entry.isIntersecting);
        });
      },
      { rootMargin: "-12% 0px -18%", threshold: 0.18 }
    );
    motionContexts.forEach((section) => contextObserver.observe(section));
  } else {
    motionContexts.forEach((section) => section.classList.add("is-inview"));
  }

  const onScroll = () => {
    updateScrollMotion();
    setActiveLink();
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ===========================================================
   * 7. Draggable gallery
   * =========================================================== */
  const gallery = document.getElementById("gallery");
  if (gallery) {
    let isDown = false;
    let startX = 0;
    let scrollStart = 0;
    let velocity = 0;
    let lastX = 0;
    let lastT = 0;
    let momentumId = null;

    const setDown = (clientX) => {
      isDown = true;
      gallery.classList.add("is-dragging");
      startX = clientX;
      scrollStart = gallery.scrollLeft;
      lastX = clientX;
      lastT = performance.now();
      cancelAnimationFrame(momentumId);
    };

    const onMove = (clientX) => {
      if (!isDown) return;
      const dx = clientX - startX;
      gallery.scrollLeft = scrollStart - dx;
      const now = performance.now();
      velocity = (clientX - lastX) / Math.max(now - lastT, 1);
      lastX = clientX;
      lastT = now;
    };

    const setUp = () => {
      if (!isDown) return;
      isDown = false;
      gallery.classList.remove("is-dragging");
      const step = () => {
        velocity *= 0.94;
        gallery.scrollLeft -= velocity * 16;
        if (Math.abs(velocity) > 0.05) momentumId = requestAnimationFrame(step);
      };
      momentumId = requestAnimationFrame(step);
    };

    gallery.addEventListener("mousedown", (e) => { e.preventDefault(); setDown(e.clientX); });
    window.addEventListener("mousemove", (e) => onMove(e.clientX));
    window.addEventListener("mouseup", setUp);

    gallery.addEventListener("touchstart", (e) => setDown(e.touches[0].clientX), { passive: true });
    window.addEventListener("touchmove", (e) => onMove(e.touches[0].clientX), { passive: true });
    window.addEventListener("touchend", setUp);

    // Wheel scroll: convert vertical wheel into horizontal
    gallery.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        gallery.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });
  }

  /* ===========================================================
   * 8. Background particle field (canvas)
   * =========================================================== */
  const canvas = document.getElementById("bg-particles");
  if (canvas && !reduced) {
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    const particles = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const resize = () => {
      w = canvas.width = window.innerWidth * DPR;
      h = canvas.height = window.innerHeight * DPR;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
    };
    resize();
    window.addEventListener("resize", resize);

    const COUNT = window.innerWidth < 720 ? 38 : 76;
    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * DPR,
        vy: (Math.random() - 0.5) * 0.25 * DPR,
        r: (Math.random() * 1.6 + 0.4) * DPR,
        hue: Math.random() < 0.7 ? 24 : 36,
        a: Math.random() * 0.5 + 0.3,
      });
    }

    window.addEventListener("mousemove", (e) => {
      mouse.x = e.clientX * DPR;
      mouse.y = e.clientY * DPR;
      mouse.active = true;
    });
    window.addEventListener("mouseleave", () => { mouse.active = false; });

    const tick = () => {
      ctx.clearRect(0, 0, w, h);

      // Draw connections first
      ctx.lineWidth = DPR * 0.5;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = dx * dx + dy * dy;
          const maxD = 130 * DPR * 130 * DPR;
          if (dist < maxD) {
            const alpha = (1 - dist / maxD) * 0.18;
            ctx.strokeStyle = `rgba(255, 140, 40, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles
      particles.forEach((p) => {
        // Mouse attraction
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const d2 = dx * dx + dy * dy;
          const range = 160 * DPR;
          if (d2 < range * range) {
            const f = (1 - Math.sqrt(d2) / range) * 0.06;
            p.vx += dx * f * 0.01;
            p.vy += dy * f * 0.01;
          }
        }
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        ctx.fillStyle = `hsla(${p.hue}, 90%, 60%, ${p.a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ===========================================================
   * 9. Ambient sound toggle (Web Audio drone)
   * =========================================================== */
  const soundBtn = document.getElementById("sound-toggle");
  if (soundBtn) {
    let audioCtx = null;
    let mainGain = null;
    let nodes = [];
    let isOn = false;

    const buildDrone = () => {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      mainGain = audioCtx.createGain();
      mainGain.gain.value = 0;
      mainGain.connect(audioCtx.destination);

      const freqs = [55, 82.5, 110, 165];
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.value = f;

        // Slow LFO drift
        const lfo = audioCtx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.06 + i * 0.03;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 1.2;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        const oscGain = audioCtx.createGain();
        oscGain.gain.value = 0.08;
        osc.connect(oscGain);
        oscGain.connect(mainGain);

        const filter = audioCtx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 420;
        oscGain.disconnect();
        oscGain.connect(filter);
        filter.connect(mainGain);

        osc.start();
        lfo.start();
        nodes.push(osc, lfo);
      });
    };

    const setOn = (on) => {
      isOn = on;
      soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
      if (!audioCtx && on) buildDrone();
      if (audioCtx) {
        if (audioCtx.state === "suspended") audioCtx.resume();
        const now = audioCtx.currentTime;
        mainGain.gain.cancelScheduledValues(now);
        mainGain.gain.linearRampToValueAtTime(on ? 0.22 : 0, now + 1.2);
      }
    };

    soundBtn.addEventListener("click", () => setOn(!isOn));
  }

  /* ===========================================================
   * 10. Smooth scroll for in-page anchors
   * =========================================================== */
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
