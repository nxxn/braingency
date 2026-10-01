import { coarsePointer, observeOnce, reducedMotion } from "../env";

// The Verteo property card: draws the market index in when it is first seen,
// counts the estimate up, and adds a crosshair that snaps to the nearest month
// and reads out the value (and the 90% range on forecast months).

export default function verteoVisual() {
  const root = document.querySelector("[data-verteo-visual]");
  if (!root) return;

  const chart = root.querySelector("[data-verteo-chart]");
  const svg = chart.querySelector("svg");
  const cross = root.querySelector("[data-verteo-cross]");
  const dot = root.querySelector("[data-verteo-dot]");
  const tip = root.querySelector("[data-verteo-tip]");
  const points = JSON.parse(root.dataset.points || "[]");
  const lang = document.documentElement.lang || "en";
  const month = new Intl.DateTimeFormat(lang, { month: "short", year: "numeric" });
  const num = new Intl.NumberFormat(lang);

  // Same geometry as the partial.
  const W = 600, H = 230, L = 44, R = 14, T = 14, B = 30, YMIN = 1600, YMAX = 2000;
  const x = (i) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v) => T + ((YMAX - v) * (H - T - B)) / (YMAX - YMIN);

  // --- Crosshair ------------------------------------------------------------
  const show = (i) => {
    const p = points[i];
    cross.setAttribute("x1", x(i));
    cross.setAttribute("x2", x(i));
    dot.setAttribute("cx", x(i));
    dot.setAttribute("cy", y(p.v));
    root.classList.add("is-crossing");

    const [yy, mm] = p.m.split("-").map(Number);
    tip.replaceChildren();
    const value = document.createElement("strong");
    value.textContent = `${num.format(p.v)} €/m²`;
    const when = document.createElement("span");
    when.textContent = month.format(new Date(yy, mm - 1, 1)) + (p.lo ? ` · ${root.dataset.labelForecast}` : "");
    tip.append(value, when);
    if (p.lo) {
      const range = document.createElement("span");
      range.textContent = `${root.dataset.labelRange} ${num.format(p.lo)}–${num.format(p.hi)}`;
      tip.append(range);
    }
    tip.hidden = false;

    // Keep the readout inside the chart.
    const box = chart.getBoundingClientRect();
    const px = (x(i) / W) * box.width;
    const flip = px > box.width * 0.62;
    tip.style.left = `${flip ? px - 12 : px + 12}px`;
    tip.style.transform = flip ? "translateX(-100%)" : "none";
    tip.style.top = `${Math.max(0, (y(p.v) / H) * box.height - 60)}px`;
  };

  const hide = () => {
    tip.hidden = true;
    root.classList.remove("is-crossing");
  };

  const nearest = (clientX) => {
    const box = svg.getBoundingClientRect();
    const vx = ((clientX - box.left) / box.width) * W;
    return Math.max(0, Math.min(points.length - 1, Math.round(((vx - L) / (W - L - R)) * (points.length - 1))));
  };

  // Pointer anywhere over the plot snaps to a month; touch works via the same
  // pointer events, so a tap-and-drag reads values on phones too.
  chart.addEventListener("pointermove", (e) => show(nearest(e.clientX)));
  chart.addEventListener("pointerdown", (e) => show(nearest(e.clientX)));
  chart.addEventListener("pointerleave", hide);
  if (coarsePointer()) chart.addEventListener("pointerup", () => setTimeout(hide, 1600));

  // Keyboard: the chart is focusable and arrows step through months.
  chart.tabIndex = 0;
  let focusIndex = 23;
  chart.addEventListener("focus", () => show(focusIndex));
  chart.addEventListener("blur", hide);
  chart.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    focusIndex = Math.max(0, Math.min(points.length - 1, focusIndex + (e.key === "ArrowRight" ? 1 : -1)));
    show(focusIndex);
  });

  if (reducedMotion()) return;

  // --- Entrance -------------------------------------------------------------
  const estimate = root.querySelector("[data-verteo-estimate]");
  const target = Number(estimate.dataset.value);
  const eur = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

  root.classList.add("is-armed");
  observeOnce([root], () => {
    root.classList.add("is-playing");
    const start = performance.now();
    const step = (now) => {
      const t = Math.min((now - start) / 1600, 1);
      const e = 1 - Math.pow(1 - t, 4);
      estimate.textContent = eur.format(Math.round((target * e) / 100) * 100);
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.35 });
}
