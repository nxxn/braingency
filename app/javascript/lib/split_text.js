import { observeOnce, reducedMotion } from "./env";

const lift = (el) => {
  el.querySelectorAll(":scope > span > span").forEach((inner, i) => {
    inner.animate(
      [{ transform: "translateY(130%)" }, { transform: "translateY(0)" }],
      {
        duration: 850,
        delay: 60 + i * 42,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
        fill: "both"
      }
    );
  });
};

// Splits [data-split] headings into word-level masks and lifts them into place.
// The original text stays in the DOM as the accessible name via aria-label, so
// screen readers never hear a stream of disconnected words.
//
// Headings on screen at load lift straight away; the rest wait until they are
// scrolled into view, so section headings get the same entrance as the hero.
export default function splitText() {
  const targets = document.querySelectorAll("[data-split]");
  if (!targets.length) return;

  const later = [];

  targets.forEach((el) => {
    const text = el.textContent.trim();
    el.setAttribute("aria-label", text);

    if (reducedMotion()) return;

    const frag = document.createDocumentFragment();

    text.split(/(\s+)/).forEach((token) => {
      if (!token.trim()) {
        frag.appendChild(document.createTextNode(" "));
        return;
      }

      const mask = document.createElement("span");
      // The padding/negative-margin pair extends the clip box below the
      // baseline so descenders survive at tight display line-heights,
      // without changing where the line sits.
      mask.className = "inline-block overflow-hidden align-bottom pb-[0.2em] -mb-[0.2em]";

      const inner = document.createElement("span");
      inner.className = "inline-block will-change-transform";
      inner.style.transform = "translateY(130%)";
      inner.textContent = token;

      mask.appendChild(inner);
      frag.appendChild(mask);
    });

    el.replaceChildren(frag);
    el.setAttribute("aria-hidden", "false");

    if (el.getBoundingClientRect().top < window.innerHeight) lift(el);
    else later.push(el);
  });

  observeOnce(later, lift, { threshold: 0.4 });
}
