import { shell } from "../../core/shell";

export const selectors = {
  board: ['[data-testid="my-game-board"]'],
  stats: shell.statsButton,
  /** Toolbar row for our gear (see core/shell.ts `toolbar`). */
  toolbar: shell.toolbar,
} as const satisfies Record<string, readonly string[]>;
