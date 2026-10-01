import { coarsePointer, reducedMotion } from "./env";

// Draws the connectors of the integration map and keeps packets moving along
// them. Geometry is measured from the rendered HTML nodes, so the same code
// serves the side-by-side layout on wide screens and the stacked one on
// narrow ones; a ResizeObserver redraws whenever the layout shifts.

const SVG = "http://www.w3.org/2000/svg";
const PACKETS_PER_EDGE = 2;

export default function integrationGraph() {
  const root = document.querySelector("[data-graph]");
  if (!root) return;

  const svg = root.querySelector("[data-graph-svg]");
  const core = root.querySelector("[data-graph-core]");
  const nodes = [...root.querySelectorAll("[data-graph-node]")];
  const still = reducedMotion();

  let edges = [];

  // Where a node's connector leaves it and where it meets the core. Anchors on
  // the core are spread along the facing edge in the same order as the nodes,
  // so lines fan in instead of piling onto one point.
  const geometry = () => {
    const box = root.getBoundingClientRect();
    const c = core.getBoundingClientRect();
    const rel = (r) => ({
      l: r.left - box.left, r: r.right - box.left,
      t: r.top - box.top, b: r.bottom - box.top,
      cx: r.left + r.width / 2 - box.left, cy: r.top + r.height / 2 - box.top
    });
    const k = rel(c);

    return nodes.map((el) => {
      const n = rel(el.getBoundingClientRect());
      let from, to, horizontal;

      if (n.r <= k.l) {
        horizontal = true;
        from = [n.r, n.cy];
        to = [k.l, clamp(n.cy, k.t + 24, k.b - 24)];
      } else if (n.l >= k.r) {
        horizontal = true;
        from = [n.l, n.cy];
        to = [k.r, clamp(n.cy, k.t + 24, k.b - 24)];
      } else if (n.b <= k.t) {
        horizontal = false;
        from = [n.cx, n.b];
        to = [clamp(n.cx, k.l + 20, k.r - 20), k.t];
      } else {
        horizontal = false;
        from = [n.cx, n.t];
        to = [clamp(n.cx, k.l + 20, k.r - 20), k.b];
      }

      const [x1, y1] = from;
      const [x2, y2] = to;
      const d = horizontal
        ? `M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`
        : `M${x1},${y1} C${x1},${(y1 + y2) / 2} ${x2},${(y1 + y2) / 2} ${x2},${y2}`;

      return { el, d, from, to };
    });
  };

  const draw = () => {
    const shapes = geometry();
    svg.replaceChildren();

    edges = shapes.map(({ el, d, from, to }, i) => {
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("d", d);
      path.setAttribute("class", "graph-edge");
      svg.appendChild(path);

      // Terminal ticks where the line meets the node and the core.
      for (const [x, y] of [from, to]) {
        const dot = document.createElementNS(SVG, "circle");
        dot.setAttribute("cx", x);
        dot.setAttribute("cy", y);
        dot.setAttribute("r", 2.5);
        dot.setAttribute("class", "graph-terminal");
        svg.appendChild(dot);
      }

      const length = path.getTotalLength();
      const packets = still ? [] : Array.from({ length: PACKETS_PER_EDGE }, (_, p) => {
        const c = document.createElementNS(SVG, "circle");
        c.setAttribute("r", 2.2);
        c.setAttribute("class", "graph-packet");
        svg.appendChild(c);
        return {
          c,
          // Sources feed the core; the ML node and payments also answer back.
          inbound: p === 0 || !["ml", "payments"].includes(el.dataset.graphNode),
          offset: (i * 0.37 + p * 0.5) % 1,
          speed: 0.00018 + ((i * 7 + p * 3) % 5) * 0.00003
        };
      });

      return { el, path, length, packets };
    });

    edges.forEach((edge) => edge.el.classList.contains("is-hot") && edge.path.classList.add("is-hot"));
  };

  // --- Hover: light a node's route (and every route from the core) --------

  const heat = (predicate) => {
    edges.forEach((e) => {
      const on = predicate(e);
      e.el.classList.toggle("is-hot", on);
      e.path.classList.toggle("is-hot", on);
    });
    root.classList.toggle("has-hot", edges.some(predicate));
  };

  if (!coarsePointer()) {
    nodes.forEach((el) => {
      el.addEventListener("pointerenter", () => heat((e) => e.el === el));
      el.addEventListener("pointerleave", () => heat(() => false));
    });
    core.addEventListener("pointerenter", () => heat(() => true));
    core.addEventListener("pointerleave", () => heat(() => false));
  }

  // --- Layout -------------------------------------------------------------

  let queued = false;
  new ResizeObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; draw(); });
  }).observe(root);

  draw();
  root.classList.add("is-drawn");
  if (still) return;

  // --- Packets ------------------------------------------------------------

  let raf = null;
  let last = performance.now();

  const frame = (now) => {
    const dt = Math.min(now - last, 50);
    last = now;

    for (const edge of edges) {
      const boost = edge.path.classList.contains("is-hot") ? 2.4 : 1;
      for (const p of edge.packets) {
        p.offset = (p.offset + p.speed * dt * boost) % 1;
        const t = p.inbound ? p.offset : 1 - p.offset;
        const pt = edge.path.getPointAtLength(t * edge.length);
        p.c.setAttribute("cx", pt.x.toFixed(1));
        p.c.setAttribute("cy", pt.y.toFixed(1));
        // Fade in and out at the ends so packets never pop.
        p.c.style.opacity = Math.min(1, Math.sin(p.offset * Math.PI) * 2.2).toFixed(2);
      }
    }
    raf = requestAnimationFrame(frame);
  };

  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && raf === null) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!entry.isIntersecting && raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }).observe(root);
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
