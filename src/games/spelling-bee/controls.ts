import { isInteractiveTarget } from "../../core/dom";
import { defineNativeControls } from "../../core/native-keys";
import type { ControlDefinition } from "../../core/types";

/**
 * NYT's Spelling Bee keys (from its public bundle; key names only): one `window` keydown listener
 * that skips keys pressed inside a focusable element or with Meta held. Re-dispatched on
 * document.body so the window listener receives them. Letters type and are not controls.
 */
export const controls: readonly ControlDefinition[] = defineNativeControls(
  [
    { id: "spellingBee.control.submit", title: "Submit word", key: "Enter" },
    { id: "spellingBee.control.deleteLetter", title: "Delete letter", key: "Backspace", aliases: ["Delete"], description: "Also Delete." },
    { id: "spellingBee.control.shuffle", title: "Shuffle letters", key: "Space" },
  ],
  {
    when: (_ctx, ev) => !isInteractiveTarget(ev.target),
    target: (ctx) => ctx.root.body,
  },
);
