import type { GameModule } from "../../core/types";
import { selectors } from "./selectors";
import { shortcuts } from "./shortcuts";

export const myGame: GameModule = {
  id: "my-game",
  name: "My Game",
  matches: ["https://www.nytimes.com/games/my-game*"],
  readySelector: selectors.board,
  selectors,
  darkMode: "css",
  shortcuts,
  // NYT's own keys for the game go in a `controls` list (see games/spelling-bee/controls.ts): they are
  // documented under "Controls" and rebindable; at their native key the extension does nothing.
  options: [
    // Game-specific toggles appear in the page panel and the popup; read them with resolveOption().
    { id: "exampleToggle", title: "Example toggle", description: "Documents how options work.", default: false },
  ],
  settingsMount: { kind: "gear", mount: selectors.toolbar, placement: "start" },
  init(ctx) {
    ctx.log.debug("ready");
  },
};
