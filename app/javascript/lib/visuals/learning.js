import { reducedMotion, visibleClock } from "../env";

// Replays a learner's week: the current module fills, homework is submitted
// and reviewed, XP ticks up, the streak grows and a badge unlocks. Then the
// week resets and plays again. Sample data only.

export default function learningVisual() {
  const root = document.querySelector("[data-learning-visual]");
  if (!root || reducedMotion()) return;

  const { wait } = visibleClock(root);
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => [...root.querySelectorAll(s)];
  const labels = root.dataset;
  const lang = document.documentElement.lang || "en";
  const num = new Intl.NumberFormat(lang);

  const modules = $$("[data-learning-module]");
  const days = $$("[data-learning-day]");
  const xpEl = $("[data-learning-xp]");
  const pop = $("[data-learning-pop]");
  const ring = $("[data-learning-ring]");
  const hw = $("[data-learning-hw]");
  const hwText = $("[data-learning-hw-text]");
  const badge = $("[data-learning-badge]");
  const streakLabel = $("[data-learning-streak]");
  const streakTemplate = streakLabel.textContent.replace(/\d+/, "%n");

  let xp = 1760;

  const setModule = (i, pct) => {
    const m = modules[i];
    m.querySelector("[data-learning-bar]").style.width = `${pct}%`;
    m.querySelector("[data-learning-pct]").textContent = `${pct}%`;
    m.querySelector("[data-learning-index]").classList.toggle("label-accent", pct === 100);
  };

  const gain = async (amount) => {
    pop.textContent = `+${amount}`;
    pop.classList.remove("is-shown");
    void pop.offsetWidth;
    pop.classList.add("is-shown");
    const from = xp;
    xp += amount;
    for (let s = 1; s <= 10; s++) {
      xpEl.textContent = num.format(Math.round(from + (amount * s) / 10));
      await wait(35);
    }
    // Level ring: 2,000 XP per level in this sample.
    ring.setAttribute("stroke-dasharray", `${Math.min(99.5, ((xp % 2000) / 2000) * 100).toFixed(1)} 100`);
  };

  const setStreak = (n) => {
    days.forEach((d, i) => d.classList.toggle("is-on", i < n));
    streakLabel.textContent = streakTemplate.replace("%n", n);
  };

  const setHomework = (state, text) => {
    hw.className = `hw-state is-${state} shrink-0`;
    hwText.textContent = text;
  };

  const reset = () => {
    [100, 100, 100, 20, 0].forEach((p, i) => setModule(i, p));
    xp = 1760;
    xpEl.textContent = num.format(xp);
    ring.setAttribute("stroke-dasharray", "88 100");
    setStreak(5);
    setHomework("draft", "—");
    badge.classList.remove("is-shown");
  };

  (async () => {
    await wait(400);
    for (;;) {
      reset();
      await wait(900);

      // Work through the current module in a few sittings.
      for (const pct of [38, 57, 81, 100]) {
        setModule(3, pct);
        await gain(pct === 100 ? 60 : 20);
        await wait(700);
      }
      setStreak(6);
      await wait(500);

      // Homework: submitted, reviewed by the course team, graded.
      setHomework("submitted", labels.labelSubmitted);
      await wait(1100);
      setHomework("reviewing", labels.labelReviewing);
      await wait(1400);
      setHomework("reviewed", `${labels.labelReviewed} · 92/100`);
      await gain(40);
      await wait(600);

      // Next day: streak ticks over and the badge lands.
      setStreak(7);
      setModule(4, 12);
      badge.classList.add("is-shown");
      await wait(2800);
      badge.classList.remove("is-shown");
      await wait(1800);
    }
  })();
}
