import { clickButton } from "../../core/dom";
import type { ShortcutDefinition } from "../../core/types";
import { selectors } from "./selectors";

export const shortcuts: readonly ShortcutDefinition[] = [
  {
    id: "my-game.openStats",
    title: "Open statistics",
    defaultCombo: "Alt+KeyB", // see unsafeDefaultReason() in core/platform.ts for the rules
    run(ctx) {
      clickButton(selectors.stats, { log: ctx.log, textFallback: /statistics/i });
    },
  },
];
