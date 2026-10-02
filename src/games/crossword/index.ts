import { shell } from "../../core/shell";
import type { GameModule } from "../../core/types";
import { CLUE_BAR_OPTION, NYT_CLUE_BAR, applyClueBarLocation, syncClueBar } from "./clue-bar";
import { CLUE_FONT_OPTION, NYT_CLUE_FONT, applyClueFontSize, syncClueFont } from "./clue-font";
import { RED_PENCIL_OPTION, applyPencilColor, syncPencilColor } from "./pencil-color";
import { controls } from "./controls";
import { selectors } from "./selectors";
import { shortcuts } from "./shortcuts";

/**
 * While our section is in the puzzle settings modal, let the whole modal scroll: NYT's modal body
 * is a flex row with a max-height whose column child would otherwise clamp and scroll the inner
 * settings form instead of the modal.
 */
const SETTINGS_MODAL_CSS = `
[data-testid="modal-body"]:has([data-nyte-mounted]) { display: block; overflow-y: auto; }
[data-testid="modal-body"]:has([data-nyte-mounted]) > article.xwd__modal--content { height: auto; min-height: 0; }
[data-testid="modal-body"]:has([data-nyte-mounted]) .xwd__settings-modal--form { overflow-y: visible; max-height: none; }
`;

/**
 * Fullscreen: the board SVG (preserveAspectRatio "meet") fills the smaller of its box's width and
 * height, and NYT caps the board-and-clues row at 1132px wide (board = 48% of it), so growing the
 * row's height alone does not enlarge the grid; the width cap goes too. #puzzle's bottom padding
 * would otherwise push the row below the window and make the wrapper scroll, and the clue lists
 * (capped at 625px by NYT on wide screens) may reach the bottom of the row.
 */
const FULLSCREEN_CSS = `
html[data-nyte-fullscreen="on"] #puzzle { padding-bottom: 0 !important; max-width: 100% !important; }
html[data-nyte-fullscreen="on"] .xwd__layout_puzzle--desktop { max-width: none !important; }
html[data-nyte-fullscreen="on"] .xwd__layout--cluelists { max-height: none !important; }
`;

/** All crossword games: The Crossword (daily), The Mini and The Midi share this one NYT app. */
export const crossword: GameModule = {
  id: "crossword",
  name: "Crossword",
  matches: ["https://www.nytimes.com/crosswords/game/*"],
  readySelector: selectors.board,
  selectors,
  darkMode: "css",
  shortcuts,
  controls,
  options: [RED_PENCIL_OPTION, CLUE_BAR_OPTION, CLUE_FONT_OPTION],
  // The toggle is an NYT-styled tool cell at the end of the puzzle toolbar; the board-and-clues row
  // grows to the window height while fullscreen.
  fullscreen: {
    target: shell.wrapper,
    toolbar: { mount: selectors.toolbarTools, placement: "end", itemWrapper: { tag: "li", className: "xwd__tool--button" } },
    fit: selectors.puzzleArea,
    css: FULLSCREEN_CSS,
  },
  settingsMount: {
    kind: "native-menu",
    trigger: selectors.settingsMenuButton,
    marker: selectors.settingsMarker,
    container: selectors.settingsContainer,
    css: SETTINGS_MODAL_CSS,
    heading: { className: "pz-moment__title medium" },
  },
  init(ctx) {
    syncClueBar(ctx);
    syncClueFont(ctx);
    syncPencilColor(ctx);
  },
  onSettingsChanged(ctx) {
    syncClueBar(ctx);
    syncClueFont(ctx);
    syncPencilColor(ctx);
  },
  teardown(ctx) {
    applyClueBarLocation(NYT_CLUE_BAR, ctx.root);
    applyClueFontSize(NYT_CLUE_FONT, ctx.root);
    applyPencilColor(false, ctx.root);
  },
};
