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

// A clock for looping illustrations that only runs while `root` is on screen
// and the tab is visible. `await wait(ms)` counts only visible time, so
// scrolling away freezes a sequence exactly where it is and scrolling back
// resumes it; `whenVisible()` resolves the next time it can be seen.
export function visibleClock(root, threshold = 0.25) {
  let visible = false;
  const waiters = [];

  const canRun = () => visible && !document.hidden;
  const flush = () => { if (canRun()) waiters.splice(0).forEach((w) => w()); };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    flush();
  }, { threshold }).observe(root);
  document.addEventListener("visibilitychange", flush);

  const whenVisible = () => (canRun() ? Promise.resolve() : new Promise((r) => waiters.push(r)));

  const wait = async (ms) => {
    let left = ms;
    while (left > 0) {
      await whenVisible();
      const step = Math.min(left, 100);
      await new Promise((r) => setTimeout(r, step));
      left -= step;
    }
  };

  return { wait, whenVisible, isVisible: canRun };
}

// Types `text` into `el` one character at a time on the given clock.
export async function typeInto(el, text, wait, { min = 22, jitter = 30 } = {}) {
  el.textContent = "";
  el.classList.add("is-typing");
  for (let i = 1; i <= text.length; i++) {
    el.textContent = text.slice(0, i);
    await wait(min + Math.random() * jitter);
  }
  el.classList.remove("is-typing");
}
