import { shell } from "../../core/shell";

/** Spelling Bee hooks: stable sb-* / hive-* class families plus data-testids. */
export const selectors = {
  hive: ['div.sb-hive[data-testid="hive"]', ".sb-hive"],
  /** aria-label = the letter; .center / .outer */
  cells: ['button.hive-cell[data-testid^="hive-cell-"]', "button.hive-cell"],
  /** div.hive-action.sb-touch-button[role=button][data-testid="touch-button"] with onClick */
  submit: [".hive-action__submit"],
  delete: [".hive-action__delete"],
  shuffle: [".hive-action__shuffle", '[aria-label="Shuffle"]'],
  yesterday: ["button.pz-toolbar-button__yesterday"],
  answers: ["button.pz-toolbar-button__answers"],
  stats: ["button.pz-toolbar-button__stats", ...shell.statsButton],
  hints: ["a.pz-toolbar-button__hints", 'a[aria-label^="Hints"]'],
  wordList: [".sb-wordlist-box"],
  /** Our gear goes at the far left of the toolbar row: NYT renders an empty div.pz-toolbar-left before
   * .pz-toolbar-right (the text buttons) inline on desktop; #portal-game-toolbar is only the mobile-web row. */
  toolbar: [".pz-toolbar-left", 'section[data-testid="toolbar"]', "#portal-game-toolbar"],
  /** The right-hand group of NYT's text buttons; our fullscreen toggle is appended after them. */
  toolbarRight: [".pz-toolbar-right", 'section[data-testid="toolbar"]', "#portal-game-toolbar"],
} as const satisfies Record<string, readonly string[]>;
