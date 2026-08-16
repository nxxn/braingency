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
