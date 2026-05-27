(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(hover: none), (pointer: coarse)").matches;

  /* ------------------------------------------------------------
   * 1. Header reveal
   * ------------------------------------------------------------ */
  const header = document.querySelector(".site-header");
  if (header) requestAnimationFrame(() => header.classList.add("is-ready"));

  /* ------------------------------------------------------------
   * 2. Sumi cursor — single ink dot, lerp follow
   * ------------------------------------------------------------ */
  const cursor = document.querySelector(".cursor");
  const cursorDot = cursor?.querySelector(".cursor-dot");

  if (cursor && cursorDot && !coarse && !reduced) {
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const pos = { x: target.x, y: target.y };

    addEventListener("mousemove", (e) => {
      target.x = e.clientX;
      target.y = e.clientY;
    }, { passive: true });

    const pointerSel = "a, button, [data-magnetic], [data-tilt], .work-card, .timeline-node, .skill-row, .interest-list li";
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest(pointerSel)) cursor.classList.add("is-pointer");
    });
    document.addEventListener("mouseout", (e) => {
      if (!e.relatedTarget || !e.relatedTarget.closest?.(pointerSel)) {
        cursor.classList.remove("is-pointer");
      }
    });

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.42;
      pos.y += (target.y - pos.y) * 0.42;
      cursorDot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------
   * 3. Magnetic effect
   * ------------------------------------------------------------ */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.22;
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

  /* ------------------------------------------------------------
   * 4. Subtle 3D tilt for work-cards & [data-tilt]
   * ------------------------------------------------------------ */
  if (!coarse && !reduced) {
    document.querySelectorAll("[data-tilt]").forEach((el) => {
      const max = 4;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        const rx = (0.5 - py) * max;
        const ry = (px - 0.5) * max;
        el.style.transform = `perspective(900px) translateY(-4px) rotateX(${rx}deg) rotateY(${ry}deg)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "perspective(900px) translateY(0) rotateX(0) rotateY(0)";
      });
    });
  }

  /* ------------------------------------------------------------
   * 5. Scroll reveal — hairline draw + content fade
   * ------------------------------------------------------------ */
  if ("IntersectionObserver" in window) {
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          reveal.unobserve(entry.target);
        }
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach((el) => reveal.observe(el));

    const sectionInview = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("is-inview", entry.isIntersecting);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".section, .contact-section").forEach((el) => sectionInview.observe(el));
  } else {
    document.querySelectorAll("[data-reveal], [data-reveal-stagger]").forEach((el) => el.classList.add("is-revealed"));
    document.querySelectorAll(".section, .contact-section").forEach((el) => el.classList.add("is-inview"));
  }

  /* ------------------------------------------------------------
   * 6. Active nav link
   * ------------------------------------------------------------ */
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const onScroll = () => {
    let active = "";
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top < innerHeight * 0.42) active = s.id;
    });
    navLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${active}`);
    });
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();
