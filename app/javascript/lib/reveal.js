import { observeOnce, reducedMotion } from "./env";

// Elements carrying [data-reveal] start hidden (see application.css) and are
// released as they enter the viewport. Children of [data-reveal-group] are
// staggered automatically so views don't have to hand-write delays.
export default function reveal() {
  if (reducedMotion()) {
    document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-revealed"));
    return;
  }

  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    const step = Number(group.dataset.revealGroup) || 90;
    [...group.children].forEach((child, i) => {
      child.setAttribute("data-reveal", "");
      child.style.setProperty("--reveal-delay", `${i * step}ms`);
    });
  });

  observeOnce([...document.querySelectorAll("[data-reveal]")], (el) => {
    el.classList.add("is-revealed");
  });
}
