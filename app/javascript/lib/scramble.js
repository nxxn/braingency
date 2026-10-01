import { observeOnce, reducedMotion } from "./env";

// [data-scramble] mono labels decode into place the first time they are seen:
// each character cycles through glyphs and locks in left to right, like a
// terminal resolving a value. The real text sits in a visually hidden span, so
// assistive tech reads it once and never hears the noise.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>+=";

function run(el) {
  const text = el.textContent;
  const chars = [...text];

  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = text;

  const shown = document.createElement("span");
  shown.setAttribute("aria-hidden", "true");

  el.replaceChildren(sr, shown);

  const PER_CHAR = 28;
  const SETTLE = 260;
  const duration = SETTLE + chars.length * PER_CHAR;
  const start = performance.now();
  let lastSwap = 0;

  const step = (now) => {
    const t = now - start;

    // Swapping glyphs every frame reads as flicker, not decoding.
    if (now - lastSwap > 45 || t >= duration) {
      lastSwap = now;
      shown.textContent = chars
        .map((ch, i) => {
          if (/\s/.test(ch) || t >= SETTLE + i * PER_CHAR) return ch;
          return GLYPHS[(Math.random() * GLYPHS.length) | 0];
        })
        .join("");
    }

    if (t < duration) {
      requestAnimationFrame(step);
    } else {
      el.textContent = text;
    }
  };

  requestAnimationFrame(step);
}

export default function scramble() {
  const targets = [...document.querySelectorAll("[data-scramble]")];
  if (!targets.length || reducedMotion()) return;

  // Match reveal.js: whatever is on screen at load plays now, the rest waits.
  const later = [];
  for (const el of targets) {
    if (el.getBoundingClientRect().top < window.innerHeight) run(el);
    else later.push(el);
  }
  observeOnce(later, run, { threshold: 0.6 });
}
