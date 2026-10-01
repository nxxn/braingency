import { observeOnce, reducedMotion } from "./env";

// Highlights the Ruby listing in [data-code-typing] and types it in once, the
// first time it scrolls into view. The listing's full text is laid out from
// the start (the untyped remainder is just transparent), so the window never
// changes size while it types.

const KEYWORDS = new Set([
  "module", "class", "def", "end", "do", "if", "else", "elsif", "unless",
  "return", "then", "self", "nil", "true", "false", "and", "or", "not", "yield"
]);

// Order matters: the first alternative that matches at a position wins.
const TOKEN = new RegExp(
  [
    "(#.*)",                           // 1 comment
    "(\"(?:[^\"\\\\]|\\\\.)*\")",      // 2 string
    "(:[a-z_]\\w*[?!]?)",              // 3 symbol
    "([a-z_]\\w*:)(?!:)",              // 4 keyword argument / hash key
    "(\\b[A-Z]\\w*)",                  // 5 constant
    "(\\b\\d[\\d_.]*\\b)",             // 6 number
    "(\\.[a-z_]\\w*[?!]?)",            // 7 method call
    "(\\b[a-z_]\\w*[?!]?)",            // 8 identifier (keyword or not)
  ].join("|"),
  "g"
);

function tokenize(source) {
  const tokens = [];
  let last = 0;
  for (const m of source.matchAll(TOKEN)) {
    if (m.index > last) tokens.push({ cls: null, text: source.slice(last, m.index) });
    const [text] = m;
    let cls = null;
    if (m[1]) cls = "tok-comment";
    else if (m[2]) cls = "tok-string";
    else if (m[3]) cls = "tok-symbol";
    else if (m[4]) cls = "tok-symbol";
    else if (m[5]) cls = "tok-const";
    else if (m[6]) cls = "tok-number";
    else if (m[7]) cls = "tok-method";
    else if (m[8] && KEYWORDS.has(text)) cls = "tok-keyword";
    tokens.push({ cls, text });
    last = m.index + text.length;
  }
  if (last < source.length) tokens.push({ cls: null, text: source.slice(last) });
  return tokens;
}

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Renders the first `count` characters as highlighted, visible code; the rest
// stays in the flow but invisible.
function render(tokens, count, caret) {
  let html = "";
  let left = count;
  let rest = "";

  for (const { cls, text } of tokens) {
    if (left <= 0) {
      rest += escape(text);
      continue;
    }
    const shown = text.slice(0, left);
    const hidden = text.slice(shown.length);
    html += cls ? `<span class="${cls}">${escape(shown)}</span>` : escape(shown);
    rest += escape(hidden);
    left -= shown.length;
  }

  return html + (caret ? '<span class="code-caret" aria-hidden="true"></span>' : "") +
    (rest ? `<span class="code-rest">${rest}</span>` : "");
}

export default function codeWindow() {
  document.querySelectorAll("[data-code-typing]").forEach((code) => {
    const source = code.textContent;
    const tokens = tokenize(source);

    if (reducedMotion()) {
      code.innerHTML = render(tokens, source.length, false);
      return;
    }

    // Park the listing fully laid out but untyped until it is seen.
    code.innerHTML = render(tokens, 0, true);

    observeOnce([code], () => {
      let count = 0;

      const step = () => {
        // Two characters a frame (~120/s), with whitespace (the indentation)
        // swallowed in one go so it reads as typing, not a slow reveal.
        count = Math.min(count + 2, source.length);
        while (count < source.length && /[ \n]/.test(source[count])) count += 1;
        code.innerHTML = render(tokens, count, true);

        if (count < source.length) {
          requestAnimationFrame(step);
        } else {
          code.innerHTML = render(tokens, source.length, true);
          code.closest(".code-window")?.classList.add("is-typed");
        }
      };

      setTimeout(() => requestAnimationFrame(step), 400);
    }, { threshold: 0.35 });
  });
}
