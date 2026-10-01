import { observeOnce, reducedMotion } from "../env";

// Score distributions for repaid and defaulted loans (synthetic normals) and
// a movable approval threshold. Readouts are computed from the same
// distributions, so moving the line shows the real trade-off: fewer defaults
// cost approvals, and good applicants get declined.

const REPAID = { mean: 0.7, sd: 0.12, color: "#7f9f2e" };
const DEFAULTED = { mean: 0.43, sd: 0.14, color: "#8f7ae0" };
const DEFAULT_SHARE = 0.08;

// Abramowitz–Stegun erf; plenty for a readout to one decimal.
function erf(x) {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return s * y;
}
const cdf = (x, { mean, sd }) => 0.5 * (1 + erf((x - mean) / (sd * Math.SQRT2)));
const pdf = (x, { mean, sd }) => Math.exp(-(((x - mean) / sd) ** 2) / 2);

export default function thresholdVisual() {
  const root = document.querySelector("[data-threshold-visual]");
  if (!root) return;

  const SVG = "http://www.w3.org/2000/svg";
  const svg = root.querySelector("[data-threshold-svg]");
  const input = root.querySelector("[data-threshold-input]");
  const output = root.querySelector("[data-threshold-value]");
  const out = (k) => root.querySelector(`[data-threshold-out="${k}"]`);
  const lang = document.documentElement.lang || "en";
  const pct = new Intl.NumberFormat(lang, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const W = 600, H = 200, L = 8, R = 8, T = 22, B = 24;
  const x = (s) => L + s * (W - L - R);
  const y = (d) => T + (1 - d) * (H - T - B);
  const el = (name, attrs) => {
    const n = document.createElementNS(SVG, name);
    for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
    return n;
  };

  // --- Static layers --------------------------------------------------------
  const curve = (dist) => {
    const pts = [];
    for (let i = 0; i <= 120; i++) {
      const s = i / 120;
      pts.push(`${x(s).toFixed(1)},${y(pdf(s, dist)).toFixed(1)}`);
    }
    return pts;
  };

  const clipId = `thr-${Math.random().toString(36).slice(2, 7)}`;
  const clip = el("clipPath", { id: clipId });
  const clipRect = el("rect", { x: x(0.62), y: 0, width: W, height: H });
  clip.appendChild(clipRect);
  const defs = el("defs", {});
  defs.appendChild(clip);
  svg.appendChild(defs);

  // Baseline and score ticks.
  svg.appendChild(el("line", { x1: L, x2: W - R, y1: y(0), y2: y(0), stroke: "var(--color-line-strong)" }));
  [0, 0.25, 0.5, 0.75, 1].forEach((s) => {
    const t = el("text", { x: x(s), y: H - 6, "text-anchor": s === 0 ? "start" : s === 1 ? "end" : "middle", class: "chart-tick" });
    t.textContent = s.toFixed(2);
    svg.appendChild(t);
  });

  const layers = [DEFAULTED, REPAID].map((dist) => {
    const pts = curve(dist);
    const area = `M${x(0)},${y(0)} L${pts.join(" L")} L${x(1)},${y(0)} Z`;
    const g = el("g", { class: "thr-series" });
    // Dim everywhere, full strength on the approved side of the line.
    g.appendChild(el("path", { d: area, fill: dist.color, "fill-opacity": 0.1 }));
    g.appendChild(el("path", { d: area, fill: dist.color, "fill-opacity": 0.32, "clip-path": `url(#${clipId})` }));
    g.appendChild(el("path", { d: `M${pts.join(" L")}`, fill: "none", stroke: dist.color, "stroke-width": 2, class: "thr-line", pathLength: 1 }));
    svg.appendChild(g);
    return g;
  });

  // Direct labels at each peak.
  [[DEFAULTED, root.dataset.labelDefaulted], [REPAID, root.dataset.labelRepaid]].forEach(([d, text]) => {
    const t = el("text", { x: x(d.mean), y: y(1) - 8, "text-anchor": "middle", class: "chart-value" });
    t.textContent = text;
    svg.appendChild(t);
  });

  const rule = el("line", { y1: T - 10, y2: y(0), class: "thr-rule" });
  const knob = el("circle", { r: 5, cy: T - 10, class: "thr-knob" });
  svg.append(rule, knob);

  // --- Update ---------------------------------------------------------------
  const set = (t) => {
    const px = x(t);
    rule.setAttribute("x1", px);
    rule.setAttribute("x2", px);
    knob.setAttribute("cx", px);
    clipRect.setAttribute("x", px);
    output.textContent = t.toFixed(2);

    const goodIn = (1 - DEFAULT_SHARE) * (1 - cdf(t, REPAID));
    const badIn = DEFAULT_SHARE * (1 - cdf(t, DEFAULTED));
    const approved = goodIn + badIn;
    out("approved").textContent = pct.format(approved);
    out("default_rate").textContent = approved > 0 ? pct.format(badIn / approved) : "—";
    out("declined_good").textContent = pct.format(cdf(t, REPAID));
  };

  input.addEventListener("input", () => set(Number(input.value)));

  // Drag directly on the chart too.
  let dragging = false;
  const fromPointer = (e) => {
    const box = svg.getBoundingClientRect();
    const s = ((e.clientX - box.left) / box.width) * W;
    const t = Math.min(0.9, Math.max(0.2, (s - L) / (W - L - R)));
    input.value = t.toFixed(2);
    set(Number(input.value));
  };
  svg.addEventListener("pointerdown", (e) => { dragging = true; svg.setPointerCapture(e.pointerId); fromPointer(e); });
  svg.addEventListener("pointermove", (e) => dragging && fromPointer(e));
  svg.addEventListener("pointerup", () => { dragging = false; });
  svg.style.touchAction = "pan-y";
  svg.style.cursor = "ew-resize";

  set(Number(input.value));
  if (reducedMotion()) return;

  // Entrance: curves draw, then the threshold sweeps from lenient to strict
  // and settles, so the reader sees the readouts respond before touching it.
  root.classList.add("is-armed");
  observeOnce([root], () => {
    root.classList.add("is-shown");
    const from = 0.3, to = 0.62;
    const start = performance.now() + 700;
    const step = (now) => {
      const k = Math.min(Math.max((now - start) / 1800, 0), 1);
      const e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;
      const t = from + (to - from) * e;
      input.value = t.toFixed(2);
      set(t);
      if (k < 1 && !dragging) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.4 });
}
