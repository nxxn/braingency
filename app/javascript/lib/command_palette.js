// ⌘K / Ctrl+K opens [data-palette]; [data-palette-open] buttons do too.
// Typing filters, arrows move, Enter follows the link or runs the copy action.
export default function commandPalette() {
  const dialog = document.querySelector("[data-palette]");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const input = dialog.querySelector("[data-palette-input]");
  const items = [...dialog.querySelectorAll("[data-palette-item]")];
  const groups = [...dialog.querySelectorAll("[data-palette-group]")];
  const empty = dialog.querySelector("[data-palette-empty]");
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // Show the right modifier on every trigger hint.
  document.querySelectorAll("[data-palette-mod]").forEach((el) => (el.textContent = mac ? "⌘" : "Ctrl"));
  document.querySelectorAll("[data-palette-open]").forEach((btn) => {
    btn.hidden = false;
    btn.addEventListener("click", () => open());
  });

  let active = -1;
  const visible = () => items.filter((el) => !el.hidden);

  const select = (index) => {
    const list = visible();
    items.forEach((el) => el.setAttribute("aria-selected", "false"));
    if (!list.length) { active = -1; return; }
    active = (index + list.length) % list.length;
    const el = list[active];
    el.setAttribute("aria-selected", "true");
    el.id ||= `palette-item-${items.indexOf(el)}`;
    input.setAttribute("aria-activedescendant", el.id);
    el.scrollIntoView({ block: "nearest" });
  };

  const filter = () => {
    const q = input.value.trim().toLocaleLowerCase();
    items.forEach((el) => {
      el.hidden = q !== "" && !el.textContent.toLocaleLowerCase().includes(q);
    });
    // A group label only stays while something under it matches.
    groups.forEach((g) => {
      let n = g.nextElementSibling;
      let any = false;
      while (n && n.hasAttribute("data-palette-item")) {
        if (!n.hidden) any = true;
        n = n.nextElementSibling;
      }
      g.hidden = !any;
    });
    empty.hidden = visible().length > 0;
    select(0);
  };

  const run = async (el) => {
    if (!el) return;
    if (el.dataset.copy) {
      try {
        await navigator.clipboard.writeText(el.dataset.copy);
        const hint = el.querySelector(".palette-hint");
        const before = hint.textContent;
        hint.textContent = el.dataset.copied;
        setTimeout(() => { hint.textContent = before; dialog.close(); }, 700);
      } catch {
        dialog.close();
      }
      return;
    }
    if (el.dataset.href) window.location.href = el.dataset.href;
  };

  const open = () => {
    if (dialog.open) return;
    input.value = "";
    filter();
    dialog.showModal();
    input.focus();
  };

  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      dialog.open ? dialog.close() : open();
    }
  });

  input.addEventListener("input", filter);
  input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") { event.preventDefault(); select(active + 1); }
    else if (event.key === "ArrowUp") { event.preventDefault(); select(active - 1); }
    else if (event.key === "Enter") { event.preventDefault(); run(visible()[active]); }
  });

  items.forEach((el) => {
    el.addEventListener("pointermove", () => {
      const i = visible().indexOf(el);
      if (i !== active) select(i);
    });
    el.addEventListener("click", () => run(el));
  });

  // Clicking the backdrop (the dialog element itself, outside the panel) closes.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}
