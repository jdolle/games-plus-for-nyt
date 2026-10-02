import { toggleFullscreen } from "./fullscreen";
import { updateSettings } from "./storage";
import type { ShortcutDefinition, ShortcutScope } from "./types";

/**
 * Shortcuts that exist on every game page. Bindings are stored like a game's, under the pseudo
 * game id "global" (`settings.games.global.shortcuts`), so the editor and settings code work
 * unchanged; the dispatcher matches these before the game's own shortcuts.
 */
export const GLOBAL_SCOPE_ID = "global";

export const TOGGLE_FULLSCREEN_SHORTCUT: ShortcutDefinition = {
  id: "global.toggleFullscreen",
  title: "Toggle fullscreen mode",
  defaultCombo: "Alt+KeyF", // F for Fullscreen (⌥F on macOS, Alt+F on Windows)
  unsafeDefaultOverride:
    "User's explicit choice (replacing a bare Escape, which the crossword also maps to rebus). Alt+F opens Chrome's menu on Windows, but the capture-phase listener cancels the key first.",
  // Only on pages with something to stretch; elsewhere the key passes through untouched.
  when: (ctx) => ctx.module.fullscreen !== undefined,
  run(ctx) {
    ctx.log.debug("toggle fullscreen mode");
    void updateSettings((s) => toggleFullscreen(s));
  },
};

export const GLOBAL_SHORTCUTS: ShortcutScope = {
  id: GLOBAL_SCOPE_ID,
  name: "All games",
  shortcuts: [TOGGLE_FULLSCREEN_SHORTCUT],
};
