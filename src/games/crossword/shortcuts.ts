import { clickButton, findFirst } from "../../core/dom";
import { resolveOption } from "../../core/settings";
import type { ChoiceOption, GameContext, ShortcutDefinition } from "../../core/types";
import { boardHasKeys } from "./controls";
import { selectors } from "./selectors";

/** Shown inline in the "Pencil mode" row. Hold = pencil while the key is down; Toggle = each press flips it. */
export const PENCIL_BEHAVIOR: ChoiceOption = {
  kind: "choice",
  id: "pencilBehavior",
  title: "Behavior",
  choices: [
    { value: "hold", label: "Hold" },
    { value: "toggle", label: "Toggle" },
  ],
  default: "hold",
};

const pencilIsOn = (): boolean => findFirst(selectors.pencil)?.closest("li")?.classList.contains("xwd__tool--active") ?? false;

function setPencil(ctx: GameContext, on: boolean): void {
  if (pencilIsOn() === on) return;
  clickButton(selectors.pencil, { log: ctx.log, textFallback: /^pencil$/i, within: selectors.toolbar });
}

/** In Hold mode, whether the current press turned the pencil on (so releasing turns it off again). */
let pencilHeldOn = false;

export const shortcuts: readonly ShortcutDefinition[] = [
  {
    id: "crossword.togglePencil",
    title: "Pencil mode",
    description: "Hold: pencil while the key is down. Toggle: each press switches it on or off.",
    defaultCombo: "Shift",
    unsafeDefaultOverride:
      "User's explicit choice: the Shift key on its own. A lone modifier is never cancelled, and in Toggle mode it only counts when released without another key, so Shift+Tab and the other Shift chords keep working.",
    // Same guard as the native controls: only while NYT's board would have taken the key.
    when: boardHasKeys,
    option: PENCIL_BEHAVIOR,
    behavior: (ctx) => (resolveOption(ctx.settings, ctx.module.id, PENCIL_BEHAVIOR) === "toggle" ? "toggle" : "hold"),
    run(ctx) {
      if (resolveOption(ctx.settings, ctx.module.id, PENCIL_BEHAVIOR) === "hold") {
        pencilHeldOn = !pencilIsOn();
        setPencil(ctx, true);
        return;
      }
      if (!clickButton(selectors.pencil, { log: ctx.log, textFallback: /^pencil$/i, within: selectors.toolbar })) return;
      setTimeout(() => ctx.log.debug("pencil mode", pencilIsOn() ? "on" : "off"), 0);
    },
    release(ctx) {
      if (!pencilHeldOn) return;
      pencilHeldOn = false;
      setPencil(ctx, false);
    },
  },
];
