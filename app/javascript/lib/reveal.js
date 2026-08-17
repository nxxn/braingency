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

  const elements = [...document.querySelectorAll("[data-reveal]")];

  // Anything already on screen at load is released immediately. It must not
  // wait on a scroll that may never come: the section under the hero is sized
  // to sit right at the fold, and the observer's bottom margin would otherwise
  // leave it invisible until the visitor scrolled past it.
  const deferred = [];
  for (const el of elements) {
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add("is-revealed");
    } else {
      deferred.push(el);
    }
  }

  observeOnce(deferred, (el) => el.classList.add("is-revealed"));
}
