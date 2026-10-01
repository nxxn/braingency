import codeWindow from "./lib/code_window";
import commandPalette from "./lib/command_palette";
import counter from "./lib/counter";
import heroShader from "./lib/hero_shader";
import integrationGraph from "./lib/integration_graph";
import localTime from "./lib/local_time";
import nav from "./lib/nav";
import pipeline from "./lib/pipeline";
import pointerFx from "./lib/pointer_fx";
import portraitReveal from "./lib/portrait_reveal";
import reveal from "./lib/reveal";
import scoringDemo from "./lib/scoring_demo";
import scramble from "./lib/scramble";
import splitText from "./lib/split_text";
import assistantVisual from "./lib/visuals/assistant";
import learningVisual from "./lib/visuals/learning";
import lendingVisual from "./lib/visuals/lending";
import thresholdVisual from "./lib/visuals/threshold";
import verteoVisual from "./lib/visuals/verteo";
import verteoMap from "./lib/visuals/verteo_map";

// Each module is independent and guards its own preconditions, so one throwing
// can never take the rest of the page down with it.
const boot = () => {
  for (const init of [
    nav, reveal, splitText, scramble, counter, pointerFx, pipeline,
    scoringDemo, codeWindow, integrationGraph, commandPalette, localTime,
    lendingVisual, learningVisual, assistantVisual, verteoVisual, verteoMap, thresholdVisual, portraitReveal,
    heroShader
  ]) {
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
