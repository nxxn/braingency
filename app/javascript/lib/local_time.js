// [data-local-time] shows the current time in Riga, e.g. "14:32 · UTC+3".
// The server renders the zone name alone, so without JS nothing stale shows.
export default function localTime() {
  const targets = document.querySelectorAll("[data-local-time]");
  if (!targets.length) return;

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Riga", hour: "2-digit", minute: "2-digit", hour12: false
  });
  const zone = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Riga", timeZoneName: "shortOffset" });

  const tick = () => {
    const now = new Date();
    const offset = zone.formatToParts(now).find((p) => p.type === "timeZoneName")?.value.replace("GMT", "UTC") || "";
    targets.forEach((el) => (el.textContent = `${time.format(now)} · ${offset}`));
  };

  tick();
  // Realign to the top of each minute so the display never lags a clock.
  setTimeout(() => { tick(); setInterval(tick, 60_000); }, 60_000 - (Date.now() % 60_000));
}
