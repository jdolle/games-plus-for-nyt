import { shell } from "../../core/shell";
import type { GameModule } from "../../core/types";
import { controls } from "./controls";
import { selectors } from "./selectors";
import { shortcuts } from "./shortcuts";

export const spellingBee: GameModule = {
  id: "spelling-bee",
  name: "Spelling Bee",
  matches: ["https://www.nytimes.com/puzzles/spelling-bee*"],
  readySelector: selectors.hive,
  selectors,
  darkMode: "css",
  shortcuts,
  controls,
  options: [],
  // #js-hook-game-wrapper (toolbar + game) fills the window; the toggle goes after NYT's right-hand
  // buttons, so it sits at the far right like on every game.
  fullscreen: { target: shell.wrapper, toolbar: { mount: selectors.toolbarRight, placement: "end" } },
  settingsMount: { kind: "gear", mount: selectors.toolbar, placement: "start" },
};
