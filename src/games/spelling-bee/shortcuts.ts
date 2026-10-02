import { clickButton } from "../../core/dom";
import type { ShortcutDefinition } from "../../core/types";
import { selectors } from "./selectors";

// NYT's own play keys (Enter submits, Backspace deletes, Space shuffles) are listed in controls.ts; a–z types.
export const shortcuts: readonly ShortcutDefinition[] = [
  {
    id: "spellingBee.yesterdaysAnswers",
    title: "Show yesterday's answers",
    defaultCombo: "Alt+KeyK", // K for answer Key
    run(ctx) {
      clickButton(selectors.yesterday, { log: ctx.log, textFallback: /yesterday/i, within: selectors.toolbar });
    },
  },
  {
    id: "spellingBee.hints",
    title: "Open today's hints",
    defaultCombo: "Alt+KeyG", // G for Guide
    run(ctx) {
      clickButton(selectors.hints, { log: ctx.log, textFallback: /^hints/i, within: selectors.toolbar });
    },
  },
];
