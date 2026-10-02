import type { GameModule } from "../types";
import { renderAppearance } from "./appearance";
import { renderFullscreenMode } from "./fullscreen-mode";
import { renderGameSection } from "./game-section";
import { renderGlobalShortcuts } from "./global-shortcuts";
import { pageScopes } from "./scopes";
import type { UiBlock, UiDeps } from "./types";

/**
 * The settings blocks shown on a game page (in our panel or inside the game's own settings menu).
 * Only what applies there: the Theme only on games we theme (Wordle has its own dark mode); Fullscreen
 * mode and the global shortcuts (currently just the fullscreen toggle) only on games that support
 * fullscreen (Wordle already fills the page). The popup lists everything, since it covers every game.
 */
export function pageBlocks(module: GameModule, deps: UiDeps): UiBlock[] {
  const blocks: UiBlock[] = [];
  if (module.darkMode === "css") blocks.push(renderAppearance(deps));
  if (module.fullscreen) blocks.push(renderFullscreenMode(deps), renderGlobalShortcuts(deps, pageScopes(module)));
  blocks.push(renderGameSection(module, deps, { heading: false }));
  return blocks;
}
