import { findFirst, observeDom } from "../../core/dom";
import type { Logger } from "../../core/log";

/** NYT's continue link on the offer page ("Continue without upgrading" / "… subscribing"). */
export const CONTINUE_LINK: readonly string[] = ['a[data-testid="continue-button"]'];
const MARK = "data-nyte-dont-ask";

export interface DontAskControl {
  update(on: boolean): void;
  dispose(): void;
}

function findContinueLink(root: ParentNode): HTMLAnchorElement | null {
  const byTestId = findFirst<HTMLAnchorElement>(CONTINUE_LINK, root);
  if (byTestId) return byTestId;
  for (const a of root.querySelectorAll<HTMLAnchorElement>("a[href]")) {
    if (/continue without/i.test(a.textContent ?? "")) return a;
  }
  return null;
}

/**
 * Inserts a "Don't ask again" checkbox right after the page's continue link and keeps it there
 * across re-renders. Checking it turns the Bypass Upgrade Offer setting on; the user then clicks
 * the link as usual, and the next visit skips the page.
 */
export function mountDontAskAgain(opts: {
  isOn(): boolean;
  onChange(on: boolean): void;
  log: Logger;
  root?: ParentNode;
}): DontAskControl {
  const root = opts.root ?? document;
  let input: HTMLInputElement | null = null;
  const stop = observeDom(
    () => {
      if (root.querySelector(`[${MARK}]`)) return;
      const link = findContinueLink(root);
      if (!link) return;
      const label = document.createElement("label");
      label.setAttribute(MARK, "");
      label.style.cssText =
        "display:inline-flex;align-items:center;gap:6px;margin-left:16px;font:inherit;color:inherit;cursor:pointer;white-space:nowrap;vertical-align:middle;";
      input = document.createElement("input");
      input.type = "checkbox";
      input.checked = opts.isOn();
      input.style.cssText = "margin:0;width:16px;height:16px;cursor:pointer;";
      input.setAttribute("aria-label", "Don't ask again: skip this offer next time");
      input.addEventListener("change", () => {
        const on = input?.checked ?? false;
        opts.log.debug("don't ask again →", on);
        opts.onChange(on);
      });
      label.append(input, document.createTextNode("Don’t ask again"));
      link.insertAdjacentElement("afterend", label);
      opts.log.debug('mounted the "Don\'t ask again" checkbox next to', (link.textContent ?? "").trim());
    },
    root === document ? document.documentElement : (root as Node),
  );
  return {
    update(on) {
      if (input?.isConnected) input.checked = on;
    },
    dispose: stop,
  };
}
