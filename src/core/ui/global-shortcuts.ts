import { GLOBAL_SHORTCUTS } from "../global-shortcuts";
import type { ShortcutScope } from "../types";
import { renderShortcutsEditor } from "./shortcuts-editor";
import type { UiBlock, UiDeps } from "./types";

/**
 * The global shortcuts (e.g. "Toggle fullscreen mode"), edited once at the top level of every surface.
 * `scopes` lists every scope the global keys may clash with on that surface (in the page: the current
 * game's; in the popup: every game's).
 */
export function renderGlobalShortcuts(deps: UiDeps, scopes: readonly ShortcutScope[] = [GLOBAL_SHORTCUTS]): UiBlock {
  const block = renderShortcutsEditor(GLOBAL_SHORTCUTS, deps, { heading: "Global shortcuts", scopes });
  block.el.classList.add("nyte-global-shortcuts");
  return block;
}
