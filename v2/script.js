(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ---------- Cursor ---------- */
  const cursor = document.querySelector(".cursor");
  const dot = cursor?.querySelector(".cursor-dot");
  const ring = cursor?.querySelector(".cursor-ring");

  if (cursor && !coarse && !reduced) {
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const dotPos = { ...target };
    const ringPos = { ...target };

    addEventListener("mousemove", (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    }, { passive: true });

    const pointerSel = "a, button, [data-magnetic], [data-tilt], .subject, .work-card";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(pointerSel)) cursor.classList.add("is-pointer");
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest?.(pointerSel)) {
        cursor.classList.remove("is-pointer");
      }
    });

    const tick = () => {
      dotPos.x += (target.x - dotPos.x) * 0.55;
      dotPos.y += (target.y - dotPos.y) * 0.55;
      ringPos.x += (target.x - ringPos.x) * 0.18;
      ringPos.y += (target.y - ringPos.y) * 0.18;
      if (dot) dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ---------- Magnetic ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.28;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate3d(${x * strength}px, ${y * strength}px, 0)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "translate3d(0,0,0)";
      });
    });
  }

  /* ---------- 3D tilt on .subject ---------- */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      const max = 6;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max;
        const ry = (px - 0.5) * max;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "perspective(900px) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ---------- Reveal ---------- */
  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach((el) => obs.observe(el));
  } else {
    document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach((el) => el.classList.add("is-revealed"));
  }
})();
