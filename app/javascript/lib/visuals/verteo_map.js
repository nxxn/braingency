import { coarsePointer, observeOnce, reducedMotion, visibleClock } from "../env";

// Verteo on the ML Lab page: Latvia as a hex field of estimated €/m².
//
// The outline is a hand-simplified border (good to a few km, which is all a
// hex this size can show). The value field is synthetic — a rural floor plus
// a falloff around each town, shaped to read like the market without being
// market data. The figure's header says so.
//
// Colour is one hue in five classes, dim to bright (sequential, never a
// rainbow). The city table is the way to read values without hovering.

const OUTLINE = [
  [21.05, 56.07], [21.0, 56.3], [21.0, 56.52], [21.05, 56.75], [21.2, 56.9], [21.4, 57.15],
  [21.55, 57.4], [21.75, 57.55], [22.1, 57.65], [22.6, 57.76], [22.75, 57.6], [22.85, 57.45],
  [23.1, 57.35], [23.25, 57.12], [23.45, 57.0], [23.65, 56.97], [23.9, 57.0], [24.05, 57.05],
  [24.3, 57.15], [24.4, 57.3], [24.37, 57.5], [24.35, 57.7], [24.36, 57.87], [24.8, 57.97],
  [25.3, 58.05], [25.7, 57.95], [26.05, 57.8], [26.5, 57.55], [27.0, 57.55], [27.35, 57.55],
  [27.7, 57.3], [27.8, 57.0], [27.7, 56.85], [28.0, 56.7], [28.15, 56.45], [28.22, 56.25],
  [27.9, 56.05], [27.6, 55.8], [27.1, 55.83], [26.6, 55.67], [26.2, 55.95], [25.7, 56.12],
  [25.0, 56.25], [24.5, 56.3], [24.0, 56.37], [23.6, 56.35], [23.1, 56.3], [22.6, 56.4],
  [22.1, 56.42], [21.6, 56.3], [21.2, 56.1]
];

// [name, lon, lat, peak €/m² above the rural floor, falloff radius km, in table]
const TOWNS = [
  ["Rīga",       24.105, 56.949, 1380, 11, true],
  ["Jūrmala",    23.77,  56.968, 1250,  7, true],
  ["Sigulda",    24.85,  57.153,  620,  7, false],
  ["Ogre",       24.605, 56.816,  480,  6, false],
  ["Jelgava",    23.72,  56.65,   560,  8, true],
  ["Liepāja",    21.01,  56.51,   640,  8, true],
  ["Ventspils",  21.57,  57.39,   600,  7, true],
  ["Valmiera",   25.42,  57.54,   580,  7, true],
  ["Cēsis",      25.27,  57.31,   520,  6, false],
  ["Daugavpils", 26.53,  55.87,   430,  9, true],
  ["Rēzekne",    27.33,  56.51,   300,  7, false],
  ["Jēkabpils",  25.86,  56.5,    260,  6, false],
  ["Kuldīga",    21.97,  56.97,   320,  5, false],
  ["Tukums",     23.16,  56.97,   330,  5, false],
  ["Saulkrasti", 24.41,  57.26,   420,  5, false]
];
// Riga's commuter belt lifts everything around it.
const BELT = [24.1, 56.95, 520, 32];
const RURAL = 210;

const CLASSES = [0, 400, 700, 1000, 1500];
const COLORS = ["#262e18", "#3f521d", "#617f25", "#93c334", "#cbff4d"];

const KM_LAT = 111.2;
const KM_LON = 111.2 * Math.cos((57 * Math.PI) / 180);
const S = 195;
const project = ([lon, lat]) => [17 + (lon - 20.95) * 0.545 * S, 6 + (58.1 - lat) * S];

function field(lon, lat) {
  const g = (x, y, peak, r) => {
    const d2 = ((lon - x) * KM_LON) ** 2 + ((lat - y) * KM_LAT) ** 2;
    return peak * Math.exp(-d2 / (2 * r * r));
  };
  let v = RURAL + g(...BELT);
  for (const [, x, y, peak, r] of TOWNS) v += g(x, y, peak, r);
  // A little deterministic texture so neighbouring rural cells differ.
  v += Math.sin(lon * 13.1 + lat * 7.7) * 18 + Math.cos(lon * 5.3 - lat * 11.9) * 14;
  return Math.max(120, v);
}

function inside([x, y], poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

const classOf = (v) => CLASSES.filter((c) => v >= c).length - 1;

export default function verteoMap() {
  const root = document.querySelector("[data-verteo-map]");
  if (!root) return;

  const SVG = "http://www.w3.org/2000/svg";
  const svg = root.querySelector("[data-map-svg]");
  const stage = root.querySelector("[data-map-stage]");
  const tip = root.querySelector("[data-map-tip]");
  const table = root.querySelector("[data-map-table]");
  const legend = root.querySelector("[data-map-legend]");
  const feed = root.querySelector("[data-map-feed]");
  const labels = root.dataset;
  const lang = document.documentElement.lang || "en";
  const num = new Intl.NumberFormat(lang, { maximumFractionDigits: 0 });
  const townName = (n) => (n === "Rīga" && lang !== "lv" ? "Riga" : n);
  const still = reducedMotion();

  // --- Hex grid -----------------------------------------------------------
  const poly = OUTLINE.map(project);
  const R = 8.6;
  const HW = Math.sqrt(3) * R;
  const riga = project([24.105, 56.949]);
  const cells = [];

  for (let row = 0, y = 6; y < 500; row++, y += 1.5 * R) {
    for (let x = 17 + (row % 2 ? HW / 2 : 0); x < 820; x += HW) {
      if (!inside([x, y], poly)) continue;
      const lon = 20.95 + (x - 17) / (0.545 * S);
      const lat = 58.1 - (y - 6) / S;
      const value = field(lon, lat);
      cells.push({ x, y, lon, lat, value, cls: classOf(value) });
    }
  }

  const hexPoints = (cx, cy, r) =>
    Array.from({ length: 6 }, (_, k) => {
      const a = (Math.PI / 180) * (60 * k - 30);
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");

  const gCells = document.createElementNS(SVG, "g");
  const gPings = document.createElementNS(SVG, "g");
  const gTowns = document.createElementNS(SVG, "g");
  svg.append(gCells, gPings, gTowns);

  cells.forEach((c, i) => {
    const hex = document.createElementNS(SVG, "polygon");
    // A 1.2px gap between cells is the surface showing through (no strokes).
    hex.setAttribute("points", hexPoints(c.x, c.y, R - 0.9));
    hex.setAttribute("fill", COLORS[c.cls]);
    hex.setAttribute("class", "map-cell");
    hex.dataset.i = i;
    const d = Math.hypot(c.x - riga[0], c.y - riga[1]);
    hex.style.setProperty("--d", `${Math.round(d * 2.2)}ms`);
    c.el = hex;
    gCells.appendChild(hex);
  });

  // Town markers and labels for the tabled towns.
  const tabled = TOWNS.filter((t) => t[5]);
  tabled.forEach(([name, lon, lat]) => {
    const [x, y] = project([lon, lat]);
    const dot = document.createElementNS(SVG, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 2.4);
    dot.setAttribute("class", "map-town");
    const text = document.createElementNS(SVG, "text");
    const right = name === "Liepāja" || name === "Ventspils";
    text.setAttribute("x", right ? x + 8 : x - 8);
    text.setAttribute("y", name === "Jūrmala" ? y + 14 : y - 7);
    text.setAttribute("text-anchor", right ? "start" : "end");
    text.setAttribute("class", "map-label");
    text.textContent = townName(name);
    gTowns.append(dot, text);
  });

  // --- Legend -------------------------------------------------------------
  CLASSES.forEach((lo, k) => {
    const li = document.createElement("li");
    li.className = "map-legend-item";
    const sw = document.createElement("span");
    sw.className = "map-swatch";
    sw.style.background = COLORS[k];
    const txt = document.createElement("span");
    txt.textContent = k === CLASSES.length - 1 ? `${num.format(lo)}+` : `${num.format(lo)}–${num.format(CLASSES[k + 1])}`;
    li.append(sw, txt);
    legend.appendChild(li);
  });

  // --- Readouts -----------------------------------------------------------
  // Uncertainty widens where there are fewer comparable sales: roughly with
  // lower prices, which in this field means away from towns.
  const spread = (v) => Math.round(4 + 9 * (1 - Math.min(1, (v - 150) / 1900)));
  const nearestTown = (lon, lat) =>
    TOWNS.reduce((best, t) => {
      const d = Math.hypot((lon - t[1]) * KM_LON, (lat - t[2]) * KM_LAT);
      return d < best.d ? { t, d } : best;
    }, { t: TOWNS[0], d: Infinity }).t;

  const showTip = (x, y, value, place) => {
    tip.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = `${num.format(Math.round(value / 10) * 10)} €/m²`;
    const where = document.createElement("span");
    where.textContent = place;
    const range = document.createElement("span");
    range.textContent = `${labels.labelRange} ±${spread(value)}%`;
    tip.append(strong, where, range);
    tip.hidden = false;
    const box = stage.getBoundingClientRect();
    const px = (x / 820) * box.width;
    const flip = px > box.width * 0.6;
    tip.style.left = `${flip ? px - 14 : px + 14}px`;
    tip.style.transform = flip ? "translateX(-100%)" : "none";
    tip.style.top = `${Math.max(0, (y / 500) * box.height - 56)}px`;
  };

  let highlighted = [];
  const highlight = (list) => {
    highlighted.forEach((c) => c.el.classList.remove("is-hot"));
    highlighted = list;
    highlighted.forEach((c) => c.el.classList.add("is-hot"));
    root.classList.toggle("has-hot", list.length > 0);
  };

  const clear = () => {
    tip.hidden = true;
    highlight([]);
  };

  svg.addEventListener("pointermove", (e) => {
    const i = e.target?.dataset?.i;
    if (i === undefined) return;
    const c = cells[i];
    highlight([c]);
    showTip(c.x, c.y, c.value, labels.labelNear.replace("%{city}", townName(nearestTown(c.lon, c.lat)[0])));
  });
  svg.addEventListener("pointerleave", clear);

  // City table: every value readable without hovering; hovering or focusing
  // a row lights that town's cells on the map.
  tabled
    .map((t) => ({ t, value: field(t[1], t[2]) }))
    .sort((a, b) => b.value - a.value)
    .forEach(({ t, value }) => {
      const [name, lon, lat, , r] = t;
      const tr = document.createElement("tr");
      tr.className = "map-row";
      tr.tabIndex = 0;
      const cName = document.createElement("td");
      const sw = document.createElement("span");
      sw.className = "map-swatch";
      sw.style.background = COLORS[classOf(value)];
      cName.append(sw, document.createTextNode(townName(name)));
      const cVal = document.createElement("td");
      cVal.className = "font-mono text-right text-fg";
      cVal.textContent = num.format(Math.round(value / 10) * 10);
      const cRange = document.createElement("td");
      cRange.className = "font-mono text-right text-fg-faint";
      cRange.textContent = `±${spread(value)}%`;
      tr.append(cName, cVal, cRange);
      table.appendChild(tr);

      const on = () => {
        const near = cells.filter((c) => Math.hypot((c.lon - lon) * KM_LON, (c.lat - lat) * KM_LAT) < r * 1.4);
        highlight(near);
        const [x, y] = project([lon, lat]);
        showTip(x, y, value, townName(name));
      };
      tr.addEventListener("pointerenter", on);
      tr.addEventListener("focus", on);
      tr.addEventListener("pointerleave", clear);
      tr.addEventListener("blur", clear);
    });

  if (still) {
    root.classList.add("is-shown");
    return;
  }

  // --- Entrance and the live feed -----------------------------------------
  root.classList.add("is-armed");
  observeOnce([root], () => root.classList.add("is-shown"), { threshold: 0.2 });

  const { wait } = visibleClock(root);
  // Sales land where the market is: weight cells by value.
  const weights = cells.map((c) => c.value ** 1.6);
  const total = weights.reduce((a, b) => a + b, 0);
  const pick = () => {
    let r = Math.random() * total;
    for (let i = 0; i < cells.length; i++) if ((r -= weights[i]) <= 0) return cells[i];
    return cells[cells.length - 1];
  };
  const eur = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const clock = () => new Date().toTimeString().slice(0, 8);

  const line = (html) => {
    const li = document.createElement("li");
    li.className = "demo-log-line is-new";
    li.innerHTML = html;
    feed.appendChild(li);
    while (feed.children.length > 9) feed.firstElementChild.remove();
  };

  (async () => {
    await wait(2200);
    for (;;) {
      const c = pick();
      const town = townName(nearestTown(c.lon, c.lat)[0]);
      const area = Math.round(38 + Math.random() * 50);
      const price = Math.round((c.value * area * (0.92 + Math.random() * 0.16)) / 100) * 100;

      // Ping at the sale, then the cells around it re-estimate.
      const ping = document.createElementNS(SVG, "circle");
      ping.setAttribute("cx", c.x);
      ping.setAttribute("cy", c.y);
      ping.setAttribute("r", 3);
      ping.setAttribute("class", "map-ping");
      gPings.appendChild(ping);
      setTimeout(() => ping.remove(), 1800);

      const li = document.createElement("span");
      li.textContent = town;
      line(`<span class="text-fg-faint">${clock()}</span> <span class="text-lime">${labels.labelSale}</span> <span class="text-fg">${li.innerHTML}</span> <span class="text-fg-faint">${area} m² · ${eur.format(price)}</span>`);

      await wait(500);
      const around = cells.filter((o) => Math.hypot(o.x - c.x, o.y - c.y) < R * 3.2);
      around.forEach((o) => {
        o.el.classList.remove("is-update");
        void o.el.getBBox();
        o.el.classList.add("is-update");
      });
      line(`<span class="text-fg-faint">${clock()}</span> <span class="text-lime">${labels.labelUpdated}</span> <span class="text-fg-faint">cells=${around.length}</span>`);

      await wait(1400 + Math.random() * 900);
    }
  })();

  if (coarsePointer()) svg.addEventListener("pointerup", () => setTimeout(clear, 1800));
}
