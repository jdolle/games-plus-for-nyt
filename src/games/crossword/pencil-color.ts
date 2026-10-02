import { ensurePageStyle } from "../../core/dom";
import { setHtmlGate } from "../../core/html-gate";
import { isGameActive, resolveOption } from "../../core/settings";
import type { GameContext, ToggleOption } from "../../core/types";

/** Pencil (tentative) letters in red instead of gray — in both themes. */
export const RED_PENCIL_OPTION: ToggleOption = {
  id: "redPencil",
  title: "Red pencil",
  description: "Show penciled letters in red, in both themes.",
  default: false,
};

/** Gate on <html>; absent while the option is off. Independent of the theme gate. */
export const PENCIL_COLOR_ATTR = "data-nyte-pencil";
const STYLE_ID = "nyte-pencil-color-style";

/**
 * Page-level rules. A red that reads on each theme's cells: a deep red on NYT's white squares (and
 * its bright yellow cursor cell), a lighter red on our dark squares, and a dark red on our muted
 * yellow cursor cell — the letter stays red while the cell is selected
 * (g.xwd__cell[aria-selected="true"], data-testid "cell-g"). The doubled attribute selector outranks
 * the theme stylesheet's own `!important` gray and black.
 */
export function pencilColorCss(): string {
  const penciled = `#xwd-board g.xwd__cell:has(> .xwd__cell--penciled)`;
  const cursor = `#xwd-board g.xwd__cell[aria-selected="true"]:has(> .xwd__cell--penciled)`;
  const gate = `html[${PENCIL_COLOR_ATTR}="red"][${PENCIL_COLOR_ATTR}]`;
  const light = `${gate}:not([data-nyte-theme="dark"])`;
  const dark = `${gate}[data-nyte-theme="dark"]`;
  return [
    `${light} ${penciled} text, ${light} ${penciled} tspan { fill: #b71c1c !important; }`,
    `${dark} ${penciled} text, ${dark} ${penciled} tspan { fill: #ff7b7b !important; }`,
    `${dark} ${cursor} text, ${dark} ${cursor} tspan { fill: #6e0b0b !important; }`,
  ].join("\n");
}

export function applyPencilColor(red: boolean, doc: Document = document): boolean {
  return setHtmlGate(PENCIL_COLOR_ATTR, red ? "red" : null, doc);
}

/** Applies the option from the live settings (gray while the game is off). */
export function syncPencilColor(ctx: GameContext): void {
  ensurePageStyle(STYLE_ID, pencilColorCss(), ctx.root);
  const red = isGameActive(ctx.settings, ctx.module.id) && resolveOption(ctx.settings, ctx.module.id, RED_PENCIL_OPTION);
  if (applyPencilColor(red, ctx.root)) ctx.log.debug("pencil colour:", red ? "red" : "gray");
}
