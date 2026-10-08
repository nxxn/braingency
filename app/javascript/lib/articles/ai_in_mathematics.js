// "358 years vs 88 hours" (app/views/articles/ai_in_mathematics.html.erb).
//
// The server renders every figure in every state, so the article reads in
// full without JavaScript. This module only reveals the controls and moves
// between states that are already in the page; the one thing it adds is the
// reader poll, which it posts to PollVotesController.

export default function aiInMathematics() {
  const root = document.querySelector("[data-aim]");
  if (!root) return;

  root.querySelectorAll(".aim-js-only").forEach((el) => el.removeAttribute("hidden"));

  switches(root);
  tabs(root.querySelector("[data-aim-timeline]"), "[data-aim-step]", "[data-aim-step-panel]");
  tabs(root.querySelector("[data-aim-debate]"), "[data-aim-claim]", "[data-aim-claim-panel]", (figure) => {
    // A new concern always opens on what the mathematicians said.
    setSwitch(figure, "side", "m");
  });
  budget(root.querySelector("[data-aim-budget]"));
  poll(root.querySelector("[data-aim-poll]"));
}

// --- Switches --------------------------------------------------------------
// Buttons carry data-aim-set="key:value"; the nearest [data-aim-switch]
// stores data-key="value" and CSS shows the matching data-when-key children.

function setSwitch(figure, key, value) {
  figure.dataset[key] = value;
  figure.querySelectorAll(`[data-aim-set^="${key}:"]`).forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.aimSet === `${key}:${value}`));
  });
}

function switches(root) {
  root.querySelectorAll("[data-aim-set]").forEach((button) => {
    button.addEventListener("click", () => {
      const [key, value] = button.dataset.aimSet.split(":");
      const figure = button.closest("[data-aim-switch]");
      setSwitch(figure, key, value);
      // Collapsed filter results should not leave an open story behind.
      if (key === "filter") figure.querySelectorAll("details[open]").forEach((d) => { d.open = false; });
    });
  });
}

// --- Tabs (timeline, claims) ----------------------------------------------

function tabs(figure, tabSelector, panelSelector, onChange) {
  if (!figure) return;
  const list = [...figure.querySelectorAll(tabSelector)];
  const panels = [...figure.querySelectorAll(panelSelector)];
  const prev = figure.querySelector("[data-aim-prev]");
  const next = figure.querySelector("[data-aim-next]");
  let current = 0;

  const go = (i, focus = false) => {
    current = i;
    list.forEach((tab, j) => {
      tab.setAttribute("aria-selected", String(j === i));
      tab.tabIndex = j === i ? 0 : -1;
    });
    panels.forEach((panel, j) => panel.classList.toggle("is-current", j === i));
    if (prev) prev.disabled = i === 0;
    if (next) next.disabled = i === list.length - 1;
    if (focus) list[i].focus();
    onChange?.(figure);
  };

  list.forEach((tab, i) => {
    tab.addEventListener("click", () => go(i));
    tab.addEventListener("keydown", (e) => {
      const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      go((current + step + list.length) % list.length, true);
    });
  });
  prev?.addEventListener("click", () => current > 0 && go(current - 1));
  next?.addEventListener("click", () => current < list.length - 1 && go(current + 1));
  go(0);
}

// --- fig. 07: research budget ---------------------------------------------

function budget(figure) {
  if (!figure) return;
  const BUDGET = Number(figure.dataset.budget);
  const verdicts = JSON.parse(figure.dataset.verdicts);
  const tasks = [...figure.querySelectorAll("[data-aim-task]")];
  const out = (name) => figure.querySelector(`[data-aim-${name}]`);
  const picked = new Set();

  const draw = () => {
    let used = 0, progress = 0, insight = 0;
    picked.forEach((i) => {
      used += Number(tasks[i].dataset.cost);
      progress += Number(tasks[i].dataset.progress);
      insight += Number(tasks[i].dataset.insight);
    });

    tasks.forEach((task, i) => {
      const on = picked.has(i);
      const fits = on || used + Number(task.dataset.cost) <= BUDGET;
      task.setAttribute("aria-pressed", String(on));
      if (fits) task.removeAttribute("aria-disabled");
      else task.setAttribute("aria-disabled", "true");
    });

    const score = progress + insight;
    out("score").textContent = score;
    out("used").textContent = `${used} / ${BUDGET}`;
    out("used-bar").style.width = `${used}%`;
    out("insight").textContent = insight;
    out("insight-bar").style.width = `${Math.min(100, (insight / 85) * 100)}%`;

    // Task 0 is the brute-force headline, task 5 the pile of lemma variants.
    let verdict = "mixed";
    if (used === 0) verdict = "idle";
    else if (picked.has(0) && insight < 20) verdict = "headline";
    else if (picked.has(5) && insight < 25) verdict = "volume";
    else if (score >= 125) verdict = "strong";
    out("verdict").textContent = verdicts[verdict];
  };

  tasks.forEach((task, i) => {
    task.addEventListener("click", () => {
      if (task.getAttribute("aria-disabled") === "true") return;
      if (picked.has(i)) picked.delete(i);
      else picked.add(i);
      draw();
    });
  });
  out("reset").addEventListener("click", () => { picked.clear(); draw(); });
  draw();
}

// --- fig. 08–09: reader poll ----------------------------------------------

function poll(el) {
  if (!el) return;
  const gauges = JSON.parse(el.dataset.gauges);
  const voteForms = JSON.parse(el.dataset.votes);
  const msg = JSON.parse(el.dataset.messages);
  let counts = JSON.parse(el.dataset.counts);
  let mine = JSON.parse(el.dataset.mine);
  let busy = false;

  const slider = el.querySelector("[data-aim-slider]");
  const positions = [...el.querySelectorAll("[data-aim-position]")];
  const button = el.querySelector("[data-aim-vote]");
  const status = el.querySelector("[data-aim-status]");
  const rules = new Intl.PluralRules(document.documentElement.lang || "en");
  const votesText = (n) => (voteForms[rules.select(n)] ?? voteForms.other).replace("%{count}", n);

  const syncButton = () => {
    const v = Number(slider.value);
    button.textContent = mine === null ? msg.vote : mine === v ? msg.current : msg.change;
    button.disabled = busy || mine === v;
  };

  const showPosition = () => {
    const v = Number(slider.value);
    positions.forEach((p, i) => p.classList.toggle("is-current", i === v));
    gauges[v].forEach((value, i) => {
      el.querySelector(`[data-aim-gauge="${i}"]`).style.width = `${value}%`;
    });
    syncButton();
  };

  const drawResults = () => {
    const total = counts.reduce((a, b) => a + b, 0);
    const top = Math.max(...counts);
    const pcts = counts.map((c) => (total ? (c / total) * 100 : 0));

    el.querySelector("[data-aim-total]").textContent = total ? votesText(total) : msg.none;
    el.querySelector("[data-aim-first]").hidden = total > 0;

    const segments = [...el.querySelectorAll("[data-aim-dist] > div:not(.aim-dist-empty)")];
    segments.forEach((seg, i) => {
      seg.hidden = pcts[i] === 0;
      seg.style.flexGrow = pcts[i].toFixed(2);
      seg.firstElementChild.textContent = pcts[i] >= 9 ? `${Math.round(pcts[i])}%` : "";
    });
    el.querySelector(".aim-dist-empty").hidden = total > 0;

    el.querySelectorAll("[data-aim-result]").forEach((row, i) => {
      row.classList.toggle("is-mine", mine === i);
      row.classList.toggle("is-lead", total > 0 && counts[i] === top);
      row.querySelector("[data-aim-bar]").style.width = `${pcts[i].toFixed(2)}%`;
      row.querySelector("[data-aim-pct]").textContent = `${Math.round(pcts[i])}%`;
      row.querySelector("[data-aim-count]").textContent = counts[i];
    });
  };

  button.addEventListener("click", async () => {
    if (busy) return;
    busy = true;
    syncButton();
    status.textContent = msg.saving;
    try {
      const response = await fetch(el.dataset.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]')?.content ?? ""
        },
        credentials: "same-origin",
        body: JSON.stringify({ choice: Number(slider.value) })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      ({ counts, mine } = await response.json());
      status.textContent = msg.thanks;
      drawResults();
    } catch (error) {
      console.warn("[braingency] vote failed:", error);
      status.textContent = msg.error;
    } finally {
      busy = false;
      syncButton();
    }
  });

  slider.addEventListener("input", () => {
    showPosition();
    if (mine !== null && status.textContent !== msg.saving) status.textContent = msg.voted;
  });
  showPosition();
}
