(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse  = matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ------------------------------------------------------------
   * 1. Custom cursor (dot + lerp ring)
   * ------------------------------------------------------------ */
  const cursor = document.querySelector(".cursor");
  const cursorDot = cursor?.querySelector(".cursor-dot");
  const cursorRing = cursor?.querySelector(".cursor-ring");

  if (cursor && !coarse && !reduced) {
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const dot    = { x: target.x, y: target.y };
    const ring   = { x: target.x, y: target.y };

    addEventListener("mousemove", (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    }, { passive: true });

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
      dot.x  += (target.x - dot.x)  * 0.55;
      dot.y  += (target.y - dot.y)  * 0.55;
      ring.x += (target.x - ring.x) * 0.18;
      ring.y += (target.y - ring.y) * 0.18;
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
   * 4. Scroll reveal — [data-reveal], [data-reveal-stagger]
   * ------------------------------------------------------------ */
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
   * 5. Hero bento pixel field — generative
   * ------------------------------------------------------------ */
  const field = document.querySelector("[data-bento-field]");
  if (field) buildBentoField(field, reduced);

  function buildBentoField(host, reduced) {
    const rect = () => ({ w: host.clientWidth, h: host.clientHeight });
    const rng = (a, b) => a + Math.random() * (b - a);
    const irng = (a, b) => Math.floor(rng(a, b + 1));

    // Grid step: pixels snap to 16px increments so they feel mosaic-like
    const STEP = 16;
    const COUNT = 110;
    const palette = [
      { cls: "",        weight: 70 },  // lime (default)
      { cls: "is-ink",  weight: 20 },  // ink
      { cls: "is-paper",weight: 10 },  // paper outlined
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
    const squares = [];
    for (let i = 0; i < COUNT; i++) {
      const px = document.createElement("span");
      px.className = "px " + pickColor();

      // Edge-weighted distribution — leave the centre mostly clear so
      // the portrait reads, push pixels toward the corners/edges.
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

      if (Math.random() < 0.08) px.classList.add("is-pulse");

      host.appendChild(px);
      squares.push(px);
    }

    // Stagger pop-in
    if (reduced) {
      squares.forEach((s) => s.classList.add("is-in"));
    } else {
      squares.forEach((s, i) => {
        const delay = Math.random() * 1500;
        setTimeout(() => s.classList.add("is-in"), delay);
      });
    }

    // Mouse parallax — small drift on whole field
    if (!coarse && !reduced) {
      host.parentElement.addEventListener("mousemove", (e) => {
        const r = host.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width;
        const y = (e.clientY - r.top  - r.height / 2) / r.height;
        host.style.transform = `translate3d(${x * -12}px, ${y * -12}px, 0)`;
      });
    }

    // Re-shuffle gently — occasionally reposition a random pixel
    if (!reduced) {
      setInterval(() => {
        const target = squares[Math.floor(Math.random() * squares.length)];
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
          target.classList.add("is-in");
        }, 320);
      }, 1800);
    }
  }

  /* ------------------------------------------------------------
   * 6. Topbar hamburger — visual only (no menu panel yet)
   * ------------------------------------------------------------ */
  const menuBtn = document.querySelector(".topbar-menu");
  if (menuBtn) {
    menuBtn.addEventListener("click", () => {
      const open = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!open));
    });
  }

  /* ------------------------------------------------------------
   * 7. Smooth scroll for in-page anchors
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
