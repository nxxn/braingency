import { reducedMotion, typeInto, visibleClock } from "../env";

// Plays sample conversations through the assistant: the customer asks, the
// assistant "thinks", answers from the knowledge base and cites it, and the
// CRM record on the right fills itself in as the conversation happens.
// Scenario copy comes from the locale files via data-scenarios.

export default function assistantVisual() {
  const root = document.querySelector("[data-assistant-visual]");
  if (!root || reducedMotion()) return;

  const scenarios = JSON.parse(root.dataset.scenarios || "[]");
  if (!scenarios.length) return;

  const { wait } = visibleClock(root);
  const chat = root.querySelector("[data-assistant-chat]");
  const crm = (k) => root.querySelector(`[data-crm="${k}"]`);
  const live = root.querySelector("[data-crm-live]");
  const sourceLabel = root.querySelector(".chat-source")?.textContent.split("·")[0].trim() || "";

  const bubble = (cls) => {
    const li = document.createElement("li");
    li.className = `chat-msg ${cls} is-new`;
    chat.appendChild(li);
    return li;
  };

  const clearCrm = () => {
    ["intent", "status", "summary"].forEach((k) => {
      crm(k).textContent = "—";
      crm(k).classList.remove("is-filled");
    });
    crm("tags").replaceChildren();
  };

  const fill = async (key, text) => {
    const el = crm(key);
    el.classList.add("is-filled");
    await typeInto(el, text, wait, { min: 10, jitter: 14 });
  };

  const play = async (s) => {
    chat.replaceChildren();
    clearCrm();
    live.classList.add("is-on");
    await wait(700);

    // Customer types, message lands.
    const q = bubble("is-user");
    await typeInto(q, s.question, wait, { min: 18, jitter: 22 });
    q.classList.remove("is-typing");
    await wait(300);
    await fill("intent", s.intent);

    // Assistant looks it up.
    const thinking = bubble("is-bot is-thinking");
    thinking.innerHTML = '<span class="chat-dots"><span></span><span></span><span></span></span>';
    await wait(1300);
    thinking.remove();

    const a = bubble("is-bot");
    const text = document.createElement("span");
    a.appendChild(text);
    await typeInto(text, s.answer, wait, { min: 8, jitter: 10 });
    const cite = document.createElement("span");
    cite.className = "chat-source is-new";
    cite.textContent = `${sourceLabel} · ${s.source}`;
    a.appendChild(cite);

    await wait(400);
    await fill("status", s.status);
    await fill("summary", s.summary);
    for (const tag of s.tags) {
      const t = document.createElement("span");
      t.className = "crm-tag is-new";
      t.textContent = tag;
      crm("tags").appendChild(t);
      await wait(180);
    }

    live.classList.remove("is-on");
    await wait(3800);
  };

  (async () => {
    await wait(300);
    for (let i = 0; ; i = (i + 1) % scenarios.length) await play(scenarios[i]);
  })();
}
