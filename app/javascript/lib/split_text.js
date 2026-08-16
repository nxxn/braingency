import { reducedMotion } from "./env";

// Splits [data-split] headings into word-level masks and lifts them into place.
// The original text stays in the DOM as the accessible name via aria-label, so
// screen readers never hear a stream of disconnected words.
export default function splitText() {
  const targets = document.querySelectorAll("[data-split]");
  if (!targets.length) return;

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
      mask.className = "inline-block overflow-hidden align-bottom [clip-path:inset(-0.15em_-0.1em_-0.15em_-0.1em)]";

      const inner = document.createElement("span");
      inner.className = "inline-block will-change-transform";
      inner.style.transform = "translateY(105%)";
      inner.textContent = token;

      mask.appendChild(inner);
      frag.appendChild(mask);
    });

    el.replaceChildren(frag);
    el.setAttribute("aria-hidden", "false");
    el.querySelectorAll(":scope > span > span").forEach((inner, i) => {
      inner.animate(
        [{ transform: "translateY(105%)" }, { transform: "translateY(0)" }],
        {
          duration: 1100,
          delay: 120 + i * 65,
          easing: "cubic-bezier(0.16, 1, 0.3, 1)",
          fill: "both"
        }
      );
    });
  });
}
