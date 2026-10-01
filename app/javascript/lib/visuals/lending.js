import { reducedMotion, visibleClock } from "../env";

// Keeps the lending queue moving: new applications arrive at the top, every
// row steps through its lifecycle, the module rail follows the busiest stage
// and the counters drift. Sample data only.

const FLOW = ["received", "scoring", "review", "approved", "signed", "active"];
// Which module in the rail owns each status.
const MODULE = { received: 0, scoring: 1, review: 2, approved: 3, signed: 3, active: 4 };
const PRODUCTS = ["auto", "consumer", "mortgage", "leasing"];
const MAX_ROWS = 5;

export default function lendingVisual() {
  const root = document.querySelector("[data-lending-visual]");
  if (!root || reducedMotion()) return;

  const { wait } = visibleClock(root);
  const statuses = JSON.parse(root.dataset.statuses);
  const products = JSON.parse(root.dataset.products);
  const list = root.querySelector("[data-lending-rows]");
  const modules = [...root.querySelectorAll("[data-lending-module]")];
  const kpi = (k) => root.querySelector(`[data-lending-kpi="${k}"]`);
  const lang = document.documentElement.lang || "en";
  const eur = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const eurM = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 });

  let seq = 31208;
  let book = 48.2e6;
  let collected = 186400;

  const setStatus = (row, status) => {
    row.dataset.status = status;
    const pill = row.querySelector("[data-pill]");
    pill.textContent = statuses[status];
    pill.classList.remove("is-flash");
    void pill.offsetWidth;
    pill.classList.add("is-flash");

    if (status === "scoring") row.querySelector("[data-score]").textContent = "···";
    if (status === "review" || status === "approved") {
      row.querySelector("[data-score]").textContent = row.dataset.scoreValue || "0.80";
    }
  };

  const newRow = () => {
    const product = PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)];
    const amount = {
      auto: 8000 + Math.random() * 22000,
      consumer: 800 + Math.random() * 6000,
      mortgage: 60000 + Math.random() * 140000,
      leasing: 15000 + Math.random() * 45000
    }[product];
    const li = document.createElement("li");
    li.className = "lending-row lending-item is-new";
    li.dataset.status = "received";
    // About one in five goes to manual review; the rest score comfortably.
    const review = Math.random() < 0.2;
    li.dataset.scoreValue = (review ? 0.55 + Math.random() * 0.1 : 0.74 + Math.random() * 0.2).toFixed(2);
    li.dataset.path = review ? "review" : "auto";
    li.innerHTML =
      `<span class="font-mono text-fg">APP-${seq++}</span>` +
      `<span class="truncate text-fg-muted max-sm:hidden"></span>` +
      `<span class="text-right font-mono text-fg">${eur.format(Math.round(amount / 100) * 100)}</span>` +
      `<span><span class="status-pill" data-pill></span></span>` +
      `<span class="text-right font-mono text-fg-muted max-sm:hidden" data-score>—</span>`;
    li.children[1].textContent = products[product];
    li.querySelector("[data-pill]").textContent = statuses.received;
    li.dataset.amount = amount;
    return li;
  };

  // Next status for a row, or null once it has settled.
  const next = (row) => {
    const s = row.dataset.status;
    if (s === "active") return null;
    if (s === "scoring") return row.dataset.path === "review" ? "review" : "approved";
    if (s === "review") return "approved";
    return FLOW[FLOW.indexOf(s) + 1];
  };

  const lightModule = (status) => {
    modules.forEach((m, i) => m.classList.toggle("is-active", i === MODULE[status]));
  };

  (async () => {
    await wait(800);
    for (let tick = 0; ; tick++) {
      // Rows move independently, like a real queue: each unsettled one has an
      // even chance of stepping forward this tick. Manual review is slower.
      const reviewCount = kpi("review");
      for (const row of [...list.children].reverse()) {
        const status = next(row);
        if (!status || Math.random() > (row.dataset.status === "review" ? 0.25 : 0.5)) continue;
        const from = row.dataset.status;
        setStatus(row, status);
        lightModule(status);
        if (status === "review") reviewCount.textContent = String(Number(reviewCount.textContent) + 1);
        if (from === "review") reviewCount.textContent = String(Math.max(0, Number(reviewCount.textContent) - 1));
        if (status === "active") {
          book += Number(row.dataset.amount || 20000);
          kpi("book").textContent = eurM.format(book);
        }
      }

      // Every third tick a new application arrives.
      if (tick % 3 === 0) {
        const row = newRow();
        list.prepend(row);
        lightModule("received");
        while (list.children.length > MAX_ROWS) list.lastElementChild.remove();
      }

      collected += 400 + Math.random() * 2600;
      kpi("collected").textContent = eur.format(Math.round(collected / 10) * 10);

      await wait(1100);
    }
  })();
}
