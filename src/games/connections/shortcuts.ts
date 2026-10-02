import { clickButton } from "../../core/dom";
import type { ShortcutDefinition } from "../../core/types";
import { selectors } from "./selectors";

export const shortcuts: readonly ShortcutDefinition[] = [
  {
    id: "connections.shuffle",
    title: "Shuffle",
    defaultCombo: "Alt+KeyS", // S for Shuffle (⌥S on macOS, Alt+S on Windows)
    unsafeDefaultOverride: "User's explicit choice; S is only a browser shortcut behind Ctrl/⌘, not Alt.",
    run(ctx) {
      clickButton(selectors.shuffle, { log: ctx.log, textFallback: /^shuffle$/i, within: selectors.actionBar });
    },
  },
  {
    id: "connections.deselectAll",
    title: "Deselect all",
    defaultCombo: "Alt+KeyD", // D for Deselect (⌥D on macOS, Alt+D on Windows)
    unsafeDefaultOverride:
      "User's explicit choice. Alt+D focuses Chrome's address bar on Windows, but our capture-phase listener sees the key first and swallows it.",
    run(ctx) {
      clickButton(selectors.deselect, { log: ctx.log, textFallback: /^deselect all$/i, within: selectors.actionBar });
    },
  },
];
