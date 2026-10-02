import { describeElement } from "./env";
import type { Logger } from "./log";

/**
 * Debug aid (on when debug logging is on): logs what every click actually hit — the control under
 * the pointer, the topmost element at that point (reveals invisible overlays), whether a modal is
 * open — so "this button does nothing" can be diagnosed from the console. Passive: never
 * prevents or stops anything.
 */
export function createClickDiagnostics(log: Logger): { setEnabled(on: boolean): void } {
  let installed = false;
  const handler = (ev: MouseEvent): void => {
    const target = ev.target instanceof Element ? ev.target : null;
    const control = target?.closest("button, a, [role='button'], input, select, textarea") ?? null;
    const atPoint = document.elementFromPoint(ev.clientX, ev.clientY);
    const covered = !!(atPoint && target && atPoint !== target && !target.contains(atPoint) && !atPoint.contains(target));
    log.debug("click", {
      target: describeElement(target),
      control: control ? `${describeElement(control)} [aria-label="${control.getAttribute("aria-label") ?? ""}"]` : "(none)",
      topElementAtPoint: describeElement(atPoint),
      coveredByAnotherElement: covered,
      modalOpen: !!document.querySelector('[data-testid="modal-body"], [role="dialog"][aria-modal="true"]'),
      activeElement: describeElement(document.activeElement),
    });
  };
  return {
    setEnabled(on) {
      if (on && !installed) {
        document.addEventListener("click", handler, true);
        installed = true;
      } else if (!on && installed) {
        document.removeEventListener("click", handler, true);
        installed = false;
      }
    },
  };
}
