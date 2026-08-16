import counter from "./lib/counter";
import heroShader from "./lib/hero_shader";
import nav from "./lib/nav";
import pipeline from "./lib/pipeline";
import pointerFx from "./lib/pointer_fx";
import reveal from "./lib/reveal";
import splitText from "./lib/split_text";

// Each module is independent and guards its own preconditions, so one throwing
// can never take the rest of the page down with it.
const boot = () => {
  for (const init of [nav, reveal, splitText, counter, pointerFx, pipeline, heroShader]) {
    try {
      init();
    } catch (error) {
      console.warn(`[braingency] ${init.name} failed:`, error);
    }
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
