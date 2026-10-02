import { DISCLAIMER, PRODUCT_NAME, PRODUCT_SHORT_NAME } from "../brand";
import type { Settings } from "../settings";
import type { GameModule } from "../types";
import { registerHost, unregisterHost } from "./hosts";
import { pageBlocks } from "./page-blocks";
import { UI_STYLES } from "./styles";
import type { UiBlock, UiDeps } from "./types";

export interface Panel {
  host: HTMLElement;
  open(): void;
  close(): void;
  update(settings: Settings): void;
  dispose(): void;
}

/** The in-page settings dialog, inside a shadow root so NYT's CSS and ours never meet. */
export function createPanel(module: GameModule, deps: UiDeps, isDark: () => boolean): Panel {
  const host = document.createElement("div");
  host.setAttribute("data-nyte-host", "panel");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = UI_STYLES;

  const dialog = document.createElement("dialog");
  dialog.className = "nyte-ui nyte-dialog";
  dialog.setAttribute("aria-label", `${PRODUCT_NAME} settings for ${module.name}`);

  // Title and close button are light-DOM children of the host, slotted into the dialog header, so
  // NYT's own classes style them like its modals: the "pz-moment__title medium" heading and the
  // "pz-icon pz-icon-close" icon (which NYT swaps to its light variant under body[data-mode="dark"]).
  // NYT's stylesheet cannot reach inside the shadow root, hence the slots.
  const header = document.createElement("div");
  header.className = "nyte-row nyte-dialog-header";
  const title = document.createElement("h2");
  title.className = "pz-moment__title medium";
  title.slot = "title";
  title.textContent = PRODUCT_NAME;
  const close = document.createElement("button");
  close.type = "button";
  close.slot = "close";
  close.className = "nyte-close";
  close.setAttribute("aria-label", "Close");
  close.title = "Close";
  close.style.cssText = "all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:4px;flex:0 0 auto;";
  const closeIcon = document.createElement("i");
  closeIcon.className = "pz-icon pz-icon-close";
  closeIcon.setAttribute("aria-hidden", "true");
  closeIcon.style.cssText = "margin:0;min-width:24px;min-height:24px;";
  close.append(closeIcon);
  close.addEventListener("click", () => dialog.close());
  host.append(title, close);
  const titleSlot = document.createElement("slot");
  titleSlot.name = "title";
  const closeSlot = document.createElement("slot");
  closeSlot.name = "close";
  header.append(titleSlot, closeSlot);

  const blocks: UiBlock[] = pageBlocks(module, deps);
  const disclaimer = document.createElement("p");
  disclaimer.className = "nyte-disclaimer";
  disclaimer.textContent = `Unofficial. ${DISCLAIMER}`;
  const footer = document.createElement("p");
  footer.className = "nyte-help";
  footer.textContent = `These settings are also available from the ${PRODUCT_SHORT_NAME} icon in the Chrome toolbar.`;
  dialog.append(header, disclaimer, ...blocks.map((b) => b.el), footer);

  // Keep every key inside the dialog away from the game (the crossword maps Escape to rebus).
  dialog.addEventListener("keydown", (ev) => {
    ev.stopPropagation();
    if (ev.key === "Escape") {
      ev.preventDefault();
      dialog.close();
    }
  });
  dialog.addEventListener("click", (ev) => {
    if (ev.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
    if (!inside) dialog.close();
  });

  shadow.append(style, dialog);
  registerHost(host);

  const applyTheme = () => dialog.setAttribute("data-theme", isDark() ? "dark" : "light");

  return {
    host,
    open() {
      if (!host.isConnected) document.body.append(host);
      applyTheme();
      if (!dialog.open) dialog.showModal();
    },
    close() {
      if (dialog.open) dialog.close();
    },
    update(settings) {
      applyTheme();
      for (const block of blocks) block.update(settings);
    },
    dispose() {
      unregisterHost(host);
      host.remove();
    },
  };
}
