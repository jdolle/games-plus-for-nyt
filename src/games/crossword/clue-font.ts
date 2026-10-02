import { ensurePageStyle } from "../../core/dom";
import { setHtmlGate } from "../../core/html-gate";
import { isGameActive, resolveOption } from "../../core/settings";
import type { ChoiceOption, GameContext } from "../../core/types";
import { selectors } from "./selectors";

/** The value that leaves NYT's own clue size untouched. */
export const NYT_CLUE_FONT = "default";

/** Font size of the Across / Down clue lists. A dropdown in the settings; NYT's size by default. */
export const CLUE_FONT_OPTION: ChoiceOption = {
  kind: "choice",
  id: "clueFontSize",
  title: "Clue font size",
  description: "Text size of the clue lists and the clue bar.",
  choices: [
    { value: NYT_CLUE_FONT, label: "Default" },
    { value: "large", label: "Large" },
    { value: "x-large", label: "X-Large" },
  ],
  default: NYT_CLUE_FONT,
};

/** Gate on <html>; absent for the NYT value. The values double as the CSS font-size keywords. */
export const CLUE_FONT_ATTR = "data-nyte-cluefont";
const STYLE_ID = "nyte-clue-font-style";

/**
 * Page-level rules (theme-independent): each clue row (li.xwd__clue--li; number and text inherit)
 * and the clue bar (NYT sizes it 1.2em; its "long" text variant stays .9em relative to the bar).
 */
export function clueFontCss(): string {
  const items = [...selectors.clueItems, ...selectors.clueBar].join(", ");
  return CLUE_FONT_OPTION.choices
    .filter((c) => c.value !== NYT_CLUE_FONT)
    .map((c) => `html[${CLUE_FONT_ATTR}="${c.value}"] :is(${items}) { font-size: ${c.value} !important; }`)
    .join("\n");
}

/** Sets or clears the gate; writes only when the value changes and returns whether it did. */
export function applyClueFontSize(value: string, doc: Document = document): boolean {
  return setHtmlGate(CLUE_FONT_ATTR, value === NYT_CLUE_FONT ? null : value, doc);
}

/** Applies the option from the live settings (NYT's size while the extension or the game is off). */
export function syncClueFont(ctx: GameContext): void {
  ensurePageStyle(STYLE_ID, clueFontCss(), ctx.root);
  const value = isGameActive(ctx.settings, ctx.module.id) ? resolveOption(ctx.settings, ctx.module.id, CLUE_FONT_OPTION) : NYT_CLUE_FONT;
  if (applyClueFontSize(value, ctx.root)) ctx.log.debug("clue font size:", value);
}
