// Shared capability checks. Every animation module asks here before doing work,
// so the rules for "should this move at all" live in exactly one place.

export const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const coarsePointer = () => window.matchMedia("(pointer: coarse)").matches;

export const smallScreen = () => window.innerWidth < 768;

// Runs `fn` for every match, now and only once per element.
export function each(selector, fn, root = document) {
  root.querySelectorAll(selector).forEach(fn);
}

// IntersectionObserver that fires once per element and then stops watching it.
export function observeOnce(elements, callback, options = {}) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      callback(entry.target);
      io.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15, ...options });

  elements.forEach((el) => io.observe(el));
  return io;
}
