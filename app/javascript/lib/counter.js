import { observeOnce, reducedMotion } from "./env";

// [data-count="25"] counts up once, in view. The element's markup already
// contains the final value, so with JS off or motion reduced it just reads.
export default function counter() {
  const targets = [...document.querySelectorAll("[data-count]")];
  if (!targets.length || reducedMotion()) return;

  observeOnce(targets, (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return;

    const duration = 1400;
    const start = performance.now();
    const format = new Intl.NumberFormat(document.documentElement.lang);

    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      el.textContent = format.format(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };

    el.textContent = format.format(0);
    requestAnimationFrame(step);
  }, { threshold: 0.6 });
}
