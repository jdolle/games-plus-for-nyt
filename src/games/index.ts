import type { GameModule } from "../core/types";
import { connections } from "./connections/index";
import { crossword } from "./crossword/index";
import { spellingBee } from "./spelling-bee/index";
import { wordle } from "./wordle/index";

/** Every built game. Adding a game: see src/games/_template/README.md. */
export const ALL_GAMES: readonly GameModule[] = [crossword, connections, spellingBee, wordle];
