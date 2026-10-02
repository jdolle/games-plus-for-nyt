import { ensurePageStyle } from "../../core/dom";
import { setHtmlGate } from "../../core/html-gate";
import { isGameActive, resolveOption } from "../../core/settings";
import type { ChoiceOption, GameContext } from "../../core/types";
import { selectors } from "./selectors";

/** The value that leaves NYT's own layout untouched (distinct from the option's default). */
export const NYT_CLUE_BAR = "default";

/** Where the desktop clue bar (the current clue) sits. A dropdown in the settings; "Above clue list" by default. */
export const CLUE_BAR_OPTION: ChoiceOption = {
  kind: "choice",
  id: "clueBarLocation",
  title: "Clue bar location",
  description: "The bar showing the current clue.",
  choices: [
    { value: NYT_CLUE_BAR, label: "NYT Default (Above board)" },
    { value: "hidden", label: "Hidden" },
    { value: "above-clues", label: "Above clue list" },
  ],
  default: "above-clues",
};

/** Gate on <html>; absent for the NYT value so its layout is untouched. */
export const CLUE_BAR_ATTR = "data-nyte-cluebar";
const STYLE_ID = "nyte-clue-bar-style";

/**
 * Page-level rules (theme-independent). NYT's desktop layout is article#puzzle (a flex row) holding
 * section.xwd__layout_clueBarAndBoard (a flex column: the clue bar, then section.xwd__board) and
 * section.xwd__layout--cluelists. React owns those nodes, so "above the clue list" never moves them:
 * the row becomes a two-column grid, the bar-and-board section dissolves (display: contents) and
 * the bar is placed in the clue-list column's first row, the board spanning both rows beside it.
 */
export function clueBarCss(): string {
  const bar = selectors.clueBar.join(", ");
  const row = selectors.puzzleArea.join(", ");
  const barAndBoard = selectors.clueBarAndBoard.join(", ");
  const lists = selectors.clueLists.join(", ");
  const hidden = `html[${CLUE_BAR_ATTR}="hidden"]`;
  const above = `html[${CLUE_BAR_ATTR}="above-clues"]`;
  return [
    `${hidden} :is(${bar}) { display: none !important; }`,
    `${above} :is(${row}) { display: grid !important; grid-template-columns: 48% 47%; grid-template-rows: auto minmax(0, 1fr); justify-content: space-around; align-items: stretch; }`,
    `${above} :is(${row}) > * { width: auto; height: auto; min-height: 0; }`,
    `${above} :is(${barAndBoard}) { display: contents; }`,
    `${above} :is(${barAndBoard}) > .xwd__board { grid-column: 1; grid-row: 1 / span 2; height: 100%; }`,
    `${above} :is(${barAndBoard}) > :not(.xwd__board) { grid-column: 2; grid-row: 1; }`,
    `${above} :is(${lists}) { grid-column: 2; grid-row: 2; height: 100%; min-height: 0; }`,
  ].join("\n");
}

/** Sets or clears the gate; writes only when the value changes and returns whether it did. */
export function applyClueBarLocation(value: string, doc: Document = document): boolean {
  return setHtmlGate(CLUE_BAR_ATTR, value === NYT_CLUE_BAR ? null : value, doc);
}

/** Applies the option from the live settings (NYT default while the extension or the game is off). */
export function syncClueBar(ctx: GameContext): void {
  ensurePageStyle(STYLE_ID, clueBarCss(), ctx.root);
  const value = isGameActive(ctx.settings, ctx.module.id) ? resolveOption(ctx.settings, ctx.module.id, CLUE_BAR_OPTION) : NYT_CLUE_BAR;
  if (applyClueBarLocation(value, ctx.root)) ctx.log.debug("desktop clue bar:", value);
}
