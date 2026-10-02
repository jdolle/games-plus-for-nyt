import { clickButton, isWidgetTarget } from "../../core/dom";
import { defineNativeControls } from "../../core/native-keys";
import type { ControlDefinition } from "../../core/types";
import { selectors } from "./selectors";

const isCard = (target: EventTarget | null): target is HTMLInputElement =>
  target instanceof HTMLInputElement && target.matches(selectors.cardInput.join(", "));

/**
 * Connections has no global key handler (from its public bundle): each card is a checkbox whose
 * React onKeyDown toggles it on Space, and Enter on a focused card submits through the browser's
 * implicit form submission. Submit is re-created by pressing NYT's Submit button (a synthetic key
 * cannot trigger implicit submission), so once rebound it also works when no card has focus.
 */
export const controls: readonly ControlDefinition[] = defineNativeControls(
  [
    { id: "connections.control.toggleCard", title: "Select / deselect card", key: "Space", description: "While a card has keyboard focus." },
    {
      id: "connections.control.submit",
      title: "Submit the selected four",
      key: "Enter",
      description: "NYT's Enter works while a card has keyboard focus.",
      when: (_ctx, ev) => isCard(ev.target) || !isWidgetTarget(ev.target),
      perform: (ctx) => {
        clickButton(selectors.submit, { log: ctx.log, textFallback: /^submit$/i, within: selectors.actionBar });
      },
    },
  ],
  {
    when: (_ctx, ev) => isCard(ev.target),
    target: (_ctx, ev) => (isCard(ev.target) ? ev.target : null),
  },
);
