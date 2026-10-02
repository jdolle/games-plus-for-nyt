import { findFirst, isInteractiveTarget } from "../../core/dom";
import { defineNativeControls } from "../../core/native-keys";
import type { ControlDefinition } from "../../core/types";
import { selectors } from "./selectors";

/**
 * NYT's Wordle keys (from its public bundle; key names only): one `window` keydown listener,
 * detached while a dialog is open or the on-screen-keyboard-only setting is on. Re-dispatched on
 * document.body. Letters type and are not controls.
 */
export const controls: readonly ControlDefinition[] = defineNativeControls(
  [
    { id: "wordle.control.submit", title: "Submit guess", key: "Enter" },
    { id: "wordle.control.deleteLetter", title: "Delete letter", key: "Backspace" },
  ],
  {
    when: (_ctx, ev) => findFirst(selectors.openDialog) === null && !isInteractiveTarget(ev.target),
    target: (ctx) => ctx.root.body,
  },
);
