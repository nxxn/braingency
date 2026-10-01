import { reducedMotion, typeInto, visibleClock } from "./env";

// Replays the origination run in [data-scoring-demo]. The server renders the
// finished first scenario, so with JS off or motion reduced the card simply
// reads as a completed run; here we reset it and play scenarios in a loop.
//
// All figures are sample data. The third scenario is deliberately referred to
// an underwriter: a demo where every application sails through would look like
// marketing, not like a lending system.

const SCENARIOS = [
  {
    id: "APP-24817", product: "auto", amount: 18400, term: 48,
    records: 14, collateral: 21300, score: 0.87, decision: "approved"
  },
  {
    id: "APP-24818", product: "consumer", amount: 4500, term: 24,
    records: 9, collateral: null, score: 0.91, decision: "approved"
  },
  {
    id: "APP-24821", product: "mortgage", amount: 126000, term: 300,
    records: 3, collateral: 139500, score: 0.58, decision: "review"
  }
];

const CHECKS = ["kyc", "aml", "bureau", "collateral"];
const MAX_LOG_LINES = 11;

export default function scoringDemo() {
  const root = document.querySelector("[data-scoring-demo]");
  if (!root || reducedMotion()) return;

  const $ = (sel) => root.querySelector(sel);
  const stages = [...root.querySelectorAll("[data-demo-stage]")];
  const field = (key) => $(`[data-demo-field="${key}"]`);
  const check = (key) => $(`[data-demo-check="${key}"]`);
  const gauge = $("[data-demo-gauge]");
  const scoreEl = $("[data-demo-score]");
  const decisionEl = $("[data-demo-decision]");
  const log = $("[data-demo-log]");

  const labels = root.dataset;
  const products = JSON.parse(labels.products || "{}");
  const lang = document.documentElement.lang || "en";
  const money = new Intl.NumberFormat(lang, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const months = (n) => labels.labelMonths.replace("%{count}", n);

  const { wait, whenVisible, isVisible } = visibleClock(root);

  // --- Pieces -------------------------------------------------------------

  let clock = Date.now();
  const stamp = () => {
    clock += 40 + Math.random() * 260;
    const d = new Date(clock);
    const p = (n, l = 2) => String(n).padStart(l, "0");
    return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
  };

  const logLine = (event, detail, tone = "lime") => {
    const li = document.createElement("li");
    li.className = "demo-log-line is-new";
    li.innerHTML =
      `<span class="text-fg-faint">${stamp()}</span> ` +
      `<span class="${tone === "warn" ? "text-fg" : "text-lime"}">${event}</span> ` +
      `<span class="text-fg-faint">${detail}</span>`;
    log.appendChild(li);
    while (log.children.length > MAX_LOG_LINES) log.firstElementChild.remove();
  };

  const setStage = (index, state) => {
    const el = stages[index];
    if (!el) return;
    el.classList.remove("is-active", "is-done");
    if (state) el.classList.add(state);
  };

  const setCheck = (key, state, text) => {
    const el = check(key);
    el.classList.remove("is-pending", "is-pass", "is-na", "is-flag");
    if (state) el.classList.add(state);
    el.querySelector("[data-demo-check-text]").textContent = text;
  };

  const type = (el, text) => typeInto(el, text, wait);

  const runCheck = async (key, detail, ms = 520) => {
    setCheck(key, "is-pending", "···");
    await wait(ms);
    setCheck(key, "is-pass", "OK");
    return detail;
  };

  const animateScore = (target) =>
    new Promise((resolve) => {
      const duration = 1300;
      let elapsed = 0;
      let last = null;
      const frame = (now) => {
        if (!isVisible()) { last = null; requestAnimationFrame(frame); return; }
        if (last !== null) elapsed += now - last;
        last = now;
        const t = Math.min(elapsed / duration, 1);
        const v = target * (1 - Math.pow(1 - t, 3));
        gauge.setAttribute("stroke-dasharray", `${(v * 100).toFixed(2)} 100`);
        scoreEl.textContent = v.toFixed(2);
        t < 1 ? requestAnimationFrame(frame) : resolve();
      };
      requestAnimationFrame(frame);
    });

  const reset = () => {
    stages.forEach((_, i) => setStage(i, null));
    CHECKS.forEach((key) => setCheck(key, null, "—"));
    ["application", "product", "amount", "term"].forEach((key) => (field(key).textContent = "—"));
    gauge.setAttribute("stroke-dasharray", "0 100");
    gauge.classList.remove("is-review");
    scoreEl.textContent = "0.00";
    decisionEl.classList.remove("is-approved", "is-review", "is-shown");
    decisionEl.textContent = " ";
  };

  // --- One run ------------------------------------------------------------

  const play = async (s) => {
    reset();
    await wait(500);

    // 01 Intake
    setStage(0, "is-active");
    logLine("intake.received", `id=${s.id} channel=web`);
    await type(field("application"), s.id);
    await type(field("product"), products[s.product] || s.product);
    await type(field("amount"), money.format(s.amount));
    await type(field("term"), months(s.term));
    logLine("intake.validated", `product=${s.product} rules=ok`);
    setStage(0, "is-done");
    await wait(300);

    // 02 Scoring inputs, then the model
    setStage(1, "is-active");
    logLine("bureau.requested", `id=${s.id}`);
    await runCheck("bureau");
    logLine("bureau.fetched", `records=${s.records}`);

    // Property goes to Verteo, our valuation model; vehicles are priced from
    // registry data. Unsecured credit has no collateral to value.
    if (s.collateral) {
      const verteo = s.product === "mortgage";
      setCheck("collateral", "is-pending", "···");
      logLine(verteo ? "verteo.requested" : "collateral.requested", verteo ? "asset=property" : "source=vehicle_registry");
      await wait(620);
      setCheck("collateral", "is-pass", "OK");
      logLine(verteo ? "verteo.valued" : "collateral.valued", `value=EUR${s.collateral}${verteo ? " ci=±4%" : ""}`);
    } else {
      setCheck("collateral", "is-na", labels.labelNa);
    }

    await wait(250);
    logLine("score.requested", "model=scoring-v7");
    gauge.classList.toggle("is-review", s.decision === "review");
    await animateScore(s.score);
    logLine("score.computed", `model=scoring-v7 score=${s.score.toFixed(2)}`);
    setStage(1, "is-done");
    await wait(300);

    // 03 Compliance
    setStage(2, "is-active");
    await runCheck("kyc", null, 480);
    logLine("kyc.verified", "match=0.99");
    await runCheck("aml", null, 560);
    logLine("aml.screened", "sanctions=0 pep=0");
    setStage(2, "is-done");
    await wait(350);

    // Decision
    if (s.decision === "approved") {
      decisionEl.textContent = labels.labelApproved;
      decisionEl.classList.add("is-approved", "is-shown");
      logLine("decision.approved", `limit=EUR${s.amount}`);
      await wait(600);

      setStage(3, "is-active");
      await wait(700);
      logLine("contract.generated", "esign=sent");
      setStage(3, "is-done");

      setStage(4, "is-active");
      await wait(700);
      logLine("portfolio.booked", `schedule=${s.term}`);
      setStage(4, "is-done");

      setStage(5, "is-active");
      await wait(600);
      logLine("collections.armed", "reminders=on");
      setStage(5, "is-done");
    } else {
      decisionEl.textContent = labels.labelReview;
      decisionEl.classList.add("is-review", "is-shown");
      logLine("decision.referred", "reason=thin_file queue=underwriting", "warn");
    }

    await wait(4200);
  };

  // Start from a clean slate only once someone can see it, so the first thing
  // a visitor watches is the run from the beginning.
  (async () => {
    await whenVisible();
    root.classList.add("is-live");
    log.replaceChildren();
    for (let i = 0; ; i = (i + 1) % SCENARIOS.length) {
      await play(SCENARIOS[i]);
    }
  })();
}
