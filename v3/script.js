(() => {
  "use strict";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(hover: none), (pointer: coarse)").matches;
  const poster = document.querySelector(".poster");

  if (poster && !coarse && !reduced) {
    poster.addEventListener("pointermove", (event) => {
      const rect = poster.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      poster.style.setProperty("--mx", `${x.toFixed(2)}%`);
      poster.style.setProperty("--my", `${y.toFixed(2)}%`);
    });
  }

  const cursor = document.querySelector(".cursor");
  const dot = cursor?.querySelector(".cursor-dot");
  const ring = cursor?.querySelector(".cursor-ring");

  if (cursor && !coarse && !reduced) {
    const target = { x: innerWidth / 2, y: innerHeight / 2 };
    const dotPos = { ...target };
    const ringPos = { ...target };

    addEventListener("mousemove", (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
    }, { passive: true });

    document.addEventListener("mouseover", (event) => {
      if (event.target.closest("a, [data-magnetic]")) cursor.classList.add("is-pointer");
    });
    document.addEventListener("mouseout", (event) => {
      if (!event.relatedTarget || !event.relatedTarget.closest?.("a, [data-magnetic]")) {
        cursor.classList.remove("is-pointer");
      }
    });

    const tick = () => {
      dotPos.x += (target.x - dotPos.x) * 0.54;
      dotPos.y += (target.y - dotPos.y) * 0.54;
      ringPos.x += (target.x - ringPos.x) * 0.18;
      ringPos.y += (target.y - ringPos.y) * 0.18;
      if (dot) dot.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;
      if (ring) ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  if (!coarse && !reduced) {
    document.querySelectorAll("[data-magnetic]").forEach((element) => {
      element.addEventListener("mousemove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        element.style.transform = `translate3d(${x * 0.22}px, ${y * 0.22}px, 0)`;
      });
      element.addEventListener("mouseleave", () => {
        element.style.transform = "translate3d(0, 0, 0)";
      });
    });
  }
})();
