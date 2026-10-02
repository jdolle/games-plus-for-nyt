import type { GameModule } from "../../core/types";

/** Hooks on the crossword home page. Everything else in dark.css keys on NYT's stable `hub-*` class family. */
export const selectors = {
  root: ["#hub-root"],
} as const satisfies Record<string, readonly string[]>;

/**
 * The crossword home page (nytimes.com/crosswords): the puzzle cards, stats and "more games" hub.
 * Dark mode only — no shortcuts or options — so there is no in-page settings surface; the enable
 * toggle lives in the popup like every other module's.
 */
export const crosswordsHub: GameModule = {
  id: "crosswords-hub",
  name: "Crossword home",
  // The hub page only (with or without a trailing slash or query string); the puzzles themselves are
  // /crosswords/game/* and belong to the crossword module.
  matches: [
    "https://www.nytimes.com/crosswords",
    "https://www.nytimes.com/crosswords/",
    "https://www.nytimes.com/crosswords?*",
    "https://www.nytimes.com/crosswords/?*",
  ],
  readySelector: selectors.root,
  selectors,
  darkMode: "css",
  shortcuts: [],
  options: [],
  settingsMount: { kind: "none" },
};
