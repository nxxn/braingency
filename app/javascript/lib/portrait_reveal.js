import { observeOnce, reducedMotion } from "./env";

// [data-portrait-reveal]: a team photo that "converges" into view. The canvas
// over the <img> starts as the placeholder's 6×6 lime cell grid, sampled from
// the photo itself, then doubles its resolution step by step while the lime
// tint drains out — a model sharpening its estimate — and finally fades to
// reveal the real image underneath.
//
// The <img> is always the source of truth: with JS off, motion reduced or the
// image failing to decode, the canvas simply never paints.

// [columns, rows] per step; the first matches the placeholder's grid.
const STEPS = [[6, 6], [12, 15], [24, 30], [48, 60], [96, 120]];
const STEP_MS = 260;
const LIME = "203, 255, 77";

export default function portraitReveal() {
  const figures = [...document.querySelectorAll("[data-portrait-reveal]")];
  if (!figures.length || reducedMotion()) return;

  figures.forEach((figure) => {
    const img = figure.querySelector("img");
    const canvas = figure.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    if (!img || !ctx) return;

    const small = document.createElement("canvas");
    const sctx = small.getContext("2d", { willReadFrequently: false });

    // Cover-fit crop of the source, the same framing object-cover gives <img>.
    const crop = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const target = canvas.width / canvas.height;
      const source = iw / ih;
      if (source > target) {
        const w = ih * target;
        return [(iw - w) / 2, 0, w, ih];
      }
      const h = iw / target;
      return [0, (ih - h) / 2, iw, h];
    };

    const size = () => {
      const r = figure.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
    };

    // One frame of the reveal: the photo at cols×rows, greyscale, washed with
    // lime by `tint` (1 → 0), with the cell grid drawn while cells are large.
    const paint = ([cols, rows], tint) => {
      small.width = cols;
      small.height = rows;
      sctx.filter = "grayscale(1) contrast(1.15)";
      sctx.drawImage(img, ...crop(), 0, 0, cols, rows);

      ctx.imageSmoothingEnabled = false;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "#0c0e10";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(small, 0, 0, canvas.width, canvas.height);

      if (tint > 0) {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(${LIME}, ${tint})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
      }

      if (cols <= 24) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let c = 1; c < cols; c++) {
          const x = Math.round((c * canvas.width) / cols) + 0.5;
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
        }
        for (let r = 1; r < rows; r++) {
          const y = Math.round((r * canvas.height) / rows) + 0.5;
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
        }
        ctx.stroke();
      }
    };

    const ready = img.complete && img.naturalWidth
      ? Promise.resolve()
      : new Promise((resolve, reject) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", reject, { once: true });
        });

    // Paint the first step as soon as the photo is decoded, so the slot shows
    // the cell grid (not the finished photo) until the reveal plays.
    img.loading = "eager";
    ready.then(() => {
      size();
      paint(STEPS[0], 0.85);
      figure.classList.add("is-armed");

      observeOnce([figure], () => {
        STEPS.forEach((step, i) => {
          setTimeout(() => paint(step, 0.85 * (1 - i / (STEPS.length - 1)) ** 1.5), 300 + i * STEP_MS);
        });
        setTimeout(() => figure.classList.add("is-revealed"), 300 + STEPS.length * STEP_MS);
      }, { threshold: 0.4 });
    }).catch(() => {});
  });
}
