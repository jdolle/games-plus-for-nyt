import type { GameModule } from "../../core/types";

/** Hooks on the crossword archive pages. Everything else in dark.css keys on NYT's stable `archive_*` class family. */
export const selectors = {
  root: ["#crossword-archive-container"],
} as const satisfies Record<string, readonly string[]>;

/**
 * The crossword archive pages (nytimes.com/crosswords/archive, /archive/mini, /archive/midi and the
 * month views beneath them): the date selector plus the calendar / list of past puzzles. Dark mode
 * only — no shortcuts or options — so there is no in-page settings surface; the enable toggle lives
 * in the popup like every other module's.
 */
export const crosswordsArchive: GameModule = {
  id: "crosswords-archive",
  name: "Crossword archive",
  matches: ["https://www.nytimes.com/crosswords/archive*"],
  readySelector: selectors.root,
  selectors,
  darkMode: "css",
  shortcuts: [],
  options: [],
  settingsMount: { kind: "none" },
};
