import { clickButton, findFirst, isWidgetTarget } from "../../core/dom";
import { defineNativeControls, dispatchNativeKey } from "../../core/native-keys";
import { parseCombo } from "../../core/keys";
import type { ControlDefinition, GameContext } from "../../core/types";
import { selectors } from "./selectors";

/**
 * Whether NYT's board would handle a key right now: its React onKeyDown lives on
 * `<main tabindex=0>` and ignores keys while a modal is open; the rebus <input> stops every key
 * itself; and a focused widget inside <main> (toolbar buttons, clue-list controls) keeps its own
 * Space/Enter/Tab. The pencil shortcut (bare Space) uses the same guard.
 */
export function boardHasKeys(_ctx: GameContext, ev: KeyboardEvent): boolean {
  const target = ev.target;
  if (!(target instanceof Element)) return false;
  const main = findFirst<HTMLElement>(selectors.boardMain);
  if (!main || !main.contains(target)) return false;
  if (target.closest(selectors.rebusInput.join(", "))) return false;
  if (isWidgetTarget(target)) return false;
  return findFirst(selectors.modalOpen) === null;
}

const pauseModalOpen = (): boolean => findFirst(selectors.pauseModal) !== null;

/**
 * NYT's desktop crossword keys (from its public bundle; key names only). Re-dispatched on <main>,
 * where NYT listens. Letters are typing and are not controls. Where the extension used to add its
 * own shortcut for the same action (rebus, pause) there is one entry here, on the site's key.
 */
export const controls: readonly ControlDefinition[] = defineNativeControls(
  [
    { id: "crossword.control.rebus", title: "Enter a rebus (multi-letter square)", key: "Escape", aliases: ["Insert"], description: "Also Insert." },
    {
      id: "crossword.control.pause",
      title: "Pause / resume the timer",
      key: "Shift+Escape",
      description: "Also resumes from the pause screen.",
      // Works from the board like NYT's key, but also from the pause screen (resume) and when focus is
      // not on the board: press the timer's pause button, or Continue while paused.
      when: (_ctx, ev) => pauseModalOpen() || boardHasKeys(_ctx, ev) || !isWidgetTarget(ev.target),
      perform: (ctx) => {
        if (pauseModalOpen()) {
          clickButton(selectors.pauseContinue, { log: ctx.log, textFallback: /^continue$/i, within: selectors.pauseModal });
          return;
        }
        if (clickButton(selectors.timerPause, { log: ctx.log })) return;
        const main = findFirst<HTMLElement>(selectors.boardMain);
        if (main) dispatchNativeKey(main, parseCombo("Shift+Escape")!);
      },
    },
    { id: "crossword.control.nextClue", title: "Next clue", key: "Tab", aliases: ["Enter", "NumpadEnter"], description: "Also Enter." },
    { id: "crossword.control.previousClue", title: "Previous clue", key: "Shift+Tab", aliases: ["Shift+Enter", "Shift+NumpadEnter"], description: "Also Shift+Enter." },
    {
      id: "crossword.control.spacebar",
      title: "Spacebar action",
      key: "Space",
      aliases: ["Shift+Space"],
      description: "Switches direction or clears the square, per NYT's spacebar setting. Also Shift+Space.",
    },
    { id: "crossword.control.wordStart", title: "Start of word", key: "Home" },
    { id: "crossword.control.wordEnd", title: "End of word", key: "End" },
    { id: "crossword.control.moveLeft", title: "Move left", key: "ArrowLeft", description: "Shift+arrow jumps to the previous/next clue or word." },
    { id: "crossword.control.moveRight", title: "Move right", key: "ArrowRight" },
    { id: "crossword.control.moveUp", title: "Move up", key: "ArrowUp" },
    { id: "crossword.control.moveDown", title: "Move down", key: "ArrowDown" },
    { id: "crossword.control.deleteLetter", title: "Delete letter", key: "Backspace", description: "Clears the square, or steps back when it is empty." },
    { id: "crossword.control.clearSquare", title: "Clear square", key: "Delete", description: "Clears the square without moving." },
  ],
  {
    when: boardHasKeys,
    target: () => findFirst<HTMLElement>(selectors.boardMain),
  },
);
