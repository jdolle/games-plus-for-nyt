import { GLOBAL_SHORTCUTS } from "../global-shortcuts";
import type { GameModule, ShortcutScope } from "../types";

/** A game's keys as one editor/conflict scope: our shortcuts first, then the game's own (native) keys. */
export function keyScope(module: GameModule): ShortcutScope {
  return { id: module.id, name: module.name, shortcuts: [...module.shortcuts, ...(module.controls ?? [])] };
}

/** Every scope that binds keys on a game page, in dispatcher precedence order. */
export function pageScopes(module: GameModule): ShortcutScope[] {
  return [GLOBAL_SHORTCUTS, keyScope(module)];
}
