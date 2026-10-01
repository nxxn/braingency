// Header state on scroll + the mobile panel.
export default function nav() {
  const header = document.querySelector("[data-nav]");
  if (!header) return;

  // --- Stuck state ---------------------------------------------------------
  const sentinel = document.createElement("div");
  sentinel.setAttribute("aria-hidden", "true");
  sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
  document.body.prepend(sentinel);

  header.dataset.stuck = "false";
  new IntersectionObserver(([entry]) => {
    header.dataset.stuck = String(!entry.isIntersecting);
  }).observe(sentinel);

  // --- Hide on the way down, return on the way up ------------------------
  // Reading gets the whole viewport; any upward scroll brings the nav back.
  // It never hides while focus is inside it, or a keyboard user would lose it.
  // Scroll events already arrive at most once per frame and the work here is
  // two comparisons, so there is nothing to gain from deferring it to rAF.
  let lastY = window.scrollY;

  const update = () => {
    const y = window.scrollY;
    const delta = y - lastY;
    if (Math.abs(delta) < 6) return;

    const open = header.querySelector("[aria-expanded=true]");
    const hide = delta > 0 && y > 160 && !open && !header.contains(document.activeElement);
    header.dataset.hidden = String(hide);
    lastY = y;
  };

  window.addEventListener("scroll", update, { passive: true });

  header.addEventListener("focusin", () => { header.dataset.hidden = "false"; });

  // --- Mobile panel --------------------------------------------------------
  const toggle = header.querySelector("[data-nav-toggle]");
  const panel = header.querySelector("[data-nav-panel]");
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    panel.hidden = !open;
    document.documentElement.style.overflow = open ? "hidden" : "";
  };

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  panel.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });

  // Leaving the mobile breakpoint with the panel open would trap scroll.
  matchMedia("(min-width: 1024px)").addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}
