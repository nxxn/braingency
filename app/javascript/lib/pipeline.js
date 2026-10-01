import { observeOnce, reducedMotion } from "./env";

// The lending-cycle diagram. The track draws itself left to right and each
// stage lights up as the line reaches it. Text lives in the DOM (translatable,
// selectable, readable by assistive tech); only the rules and dots move.
export default function pipeline() {
  const diagrams = [...document.querySelectorAll("[data-pipeline]")];
  if (!diagrams.length) return;

  const settle = (el) => {
    el.querySelectorAll("[data-pipeline-track]").forEach((t) => (t.style.transform = "scaleX(1)"));
    el.classList.add("is-drawn");
    el.querySelectorAll("[data-pipeline-stage]").forEach((s) => s.classList.add("is-lit"));
  };

  if (reducedMotion()) {
    diagrams.forEach(settle);
    return;
  }

  observeOnce(diagrams, (el) => {
    const stages = [...el.querySelectorAll("[data-pipeline-stage]")];
    const duration = 240 * Math.max(stages.length, 1);

    el.querySelectorAll("[data-pipeline-track]").forEach((track) => {
      track.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
        duration,
        easing: "cubic-bezier(0.65, 0, 0.35, 1)",
        fill: "forwards"
      });
    });

    stages.forEach((stage, i) => {
      setTimeout(() => stage.classList.add("is-lit"), 120 + i * 200);
    });

    // Once the line has been drawn, a pulse keeps travelling along it (CSS),
    // so the cycle reads as running rather than as a finished drawing.
    setTimeout(() => el.classList.add("is-running"), duration + 200);
  }, { threshold: 0.3 });
}
