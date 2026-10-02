import { shell } from "../../core/shell";
import type { GameModule } from "../../core/types";
import { controls } from "./controls";
import { selectors } from "./selectors";
import { shortcuts } from "./shortcuts";

export const connections: GameModule = {
  id: "connections",
  name: "Connections",
  matches: ["https://www.nytimes.com/games/connections*"],
  readySelector: selectors.board,
  selectors,
  darkMode: "css",
  shortcuts,
  controls,
  options: [],
  // #js-hook-game-wrapper (toolbar + game) fills the window; the toggle is the last item of the
  // (right-aligned) toolbar row, so it sits at the far right like on every game.
  fullscreen: { target: shell.wrapper, toolbar: { mount: selectors.toolbar, placement: "end" } },
  settingsMount: { kind: "gear", mount: selectors.toolbar, placement: "start" },
};
