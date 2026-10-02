import type { GameModule } from "./core/types";
import { ALL_GAMES } from "./games/index";
import { ALL_PAGES } from "./pages/index";

/** Every module with a content script: games first, then pages. Used by the popup and the manifest test. */
export const ALL_MODULES: readonly GameModule[] = [...ALL_GAMES, ...ALL_PAGES];

/** Output directory of a module's bundle ("games" or "pages"). */
export function moduleDir(module: GameModule): "games" | "pages" {
  return ALL_PAGES.includes(module) ? "pages" : "games";
}
