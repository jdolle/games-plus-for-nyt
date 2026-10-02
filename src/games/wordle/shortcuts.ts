import { clickButton } from "../../core/dom";
import type { ShortcutDefinition } from "../../core/types";
import { selectors } from "./selectors";

export const shortcuts: readonly ShortcutDefinition[] = [
  {
    id: "wordle.openStats",
    title: "Open statistics",
    defaultCombo: "Alt+KeyB", // B for the Bar chart
    run(ctx) {
      clickButton(selectors.stats, { log: ctx.log, textFallback: /statistics/i });
    },
  },
];
