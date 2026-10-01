import { coarsePointer, reducedMotion } from "./env";

// Two cursor-driven effects, both no-ops on touch and under reduced motion:
//   [data-magnetic] — buttons drift a few pixels toward the pointer
//   .card           — feeds --mx/--my so the CSS spotlight can follow
//   [data-grid-glow] — lights the hero grid in a soft circle around the pointer
export default function pointerFx() {
  if (coarsePointer() || reducedMotion()) return;

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const STRENGTH = 0.28;
    let raf = null;
    let x = 0, y = 0, tx = 0, ty = 0;

    const tick = () => {
      x += (tx - x) * 0.16;
      y += (ty - y) * 0.16;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;

      if (Math.abs(tx - x) > 0.05 || Math.abs(ty - y) > 0.05) {
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
        if (tx === 0 && ty === 0) el.style.transform = "";
      }
    };

    const start = () => { if (raf === null) raf = requestAnimationFrame(tick); };

    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      tx = (event.clientX - rect.left - rect.width / 2) * STRENGTH;
      ty = (event.clientY - rect.top - rect.height / 2) * STRENGTH;
      start();
    });

    el.addEventListener("pointerleave", () => { tx = 0; ty = 0; start(); });
  });

  document.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }, { passive: true });
  });

  document.querySelectorAll("[data-grid-glow]").forEach((glow) => {
    const area = glow.parentElement;
    let raf = null;
    let x = 0, y = 0;

    const paint = () => {
      raf = null;
      glow.style.setProperty("--gx", `${x}px`);
      glow.style.setProperty("--gy", `${y}px`);
    };

    area.addEventListener("pointermove", (event) => {
      const rect = area.getBoundingClientRect();
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
      glow.dataset.active = "true";
      if (raf === null) raf = requestAnimationFrame(paint);
    }, { passive: true });

    area.addEventListener("pointerleave", () => { glow.dataset.active = "false"; });
  });
}
