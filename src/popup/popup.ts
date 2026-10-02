import { createDebouncedSaver, loadSettings, onSettingsChanged } from "../core/storage";
import type { Settings } from "../core/settings";
import { renderAppearance } from "../core/ui/appearance";
import { renderFullscreenMode } from "../core/ui/fullscreen-mode";
import { renderGameSection } from "../core/ui/game-section";
import { renderGlobalShortcuts } from "../core/ui/global-shortcuts";
import { keyScope } from "../core/ui/scopes";
import { GLOBAL_SHORTCUTS } from "../core/global-shortcuts";
import { UI_STYLES } from "../core/ui/styles";
import type { UiBlock, UiDeps } from "../core/ui/types";
import { ALL_MODULES } from "../registry";
import { DISCLAIMER, PRODUCT_NAME } from "../core/brand";
import { DEV, extensionVersion } from "../core/env";
import { createLogger } from "../core/log";

/** Asks the active tab's content script which game it is (no tabs/host permission needed). */
async function detectCurrentGame(): Promise<string | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id === undefined) return null;
    const reply = (await chrome.tabs.sendMessage(tab.id, { type: "nyte:whoami" })) as { gameId?: string } | undefined;
    return reply?.gameId ?? null;
  } catch {
    return null;
  }
}

const log = createLogger("popup", DEV);

async function main(): Promise<void> {
  log.info(`${PRODUCT_NAME} v${extensionVersion()} popup opened`);
  const app = document.getElementById("app");
  if (!app) return;

  const style = document.createElement("style");
  style.textContent = UI_STYLES;
  document.head.append(style);
  const theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

  let settings: Settings = await loadSettings();
  log.setDebug(DEV || settings.debug);
  log.debug("settings loaded", settings);
  const saver = createDebouncedSaver(150);
  const blocks: UiBlock[] = [];
  const deps: UiDeps = {
    get: () => settings,
    save: (next) => {
      settings = next;
      log.setDebug(DEV || next.debug);
      log.debug("saving settings", next);
      for (const block of blocks) block.update(next);
      saver.schedule(next);
    },
  };
  onSettingsChanged((next) => {
    settings = next;
    for (const block of blocks) block.update(next);
  });
  window.addEventListener("pagehide", () => void saver.flush());

  const root = document.createElement("div");
  root.className = "nyte-ui nyte-popup";
  root.setAttribute("data-theme", theme);
  app.append(root);

  const heading = document.createElement("h2");
  heading.textContent = PRODUCT_NAME;
  const disclaimer = document.createElement("p");
  disclaimer.className = "nyte-disclaimer";
  disclaimer.textContent = `Unofficial. ${DISCLAIMER}`;
  root.append(heading, disclaimer);

  const appearance = renderAppearance(deps);
  const fullscreenMode = renderFullscreenMode(deps);
  // In the popup a global key may clash with any game's shortcuts or controls.
  const everyScope = [GLOBAL_SHORTCUTS, ...ALL_MODULES.map(keyScope)];
  const globalShortcuts = renderGlobalShortcuts(deps, everyScope);
  blocks.push(appearance, fullscreenMode, globalShortcuts);
  root.append(appearance.el, fullscreenMode.el, globalShortcuts.el);

  const currentId = await detectCurrentGame();
  log.debug("active tab game", currentId ?? "(none — no content script answered)");
  if (!currentId) {
    const hint = document.createElement("p");
    hint.className = "nyte-help nyte-popup-hint";
    hint.textContent = "Open an NYT game to see its settings in the page; every game is listed below.";
    root.append(hint);
  }

  // Only modules with something to configure get a section; a dark-mode-only page (the crossword
  // home) is covered by the global switch and the Theme above and would otherwise show an empty row.
  const ordered = ALL_MODULES.filter((m) => m.options.length > 0 || m.shortcuts.length > 0 || (m.controls?.length ?? 0) > 0).sort(
    (a, b) => Number(b.id === currentId) - Number(a.id === currentId),
  );
  for (const module of ordered) {
    const details = document.createElement("details");
    details.className = "nyte-section";
    details.open = module.id === currentId;
    const summary = document.createElement("summary");
    summary.textContent = module.name;
    if (module.id === currentId) {
      const tag = document.createElement("span");
      tag.className = "nyte-tag is-custom";
      tag.textContent = "this tab";
      summary.append(tag);
    }
    // The full shortcut editor renders inline here: the popup never opens a second level (no dialog).
    const section = renderGameSection(module, deps, { heading: false });
    blocks.push(section);
    details.append(summary, section.el);
    root.append(details);
  }

  const debugRow = document.createElement("label");
  debugRow.className = "nyte-row nyte-check nyte-section";
  const debugLabel = document.createElement("span");
  debugLabel.className = "nyte-label nyte-muted";
  debugLabel.textContent = DEV ? "Debug logging (always on in dev builds)" : "Debug logging in the page console";
  const debug = document.createElement("input");
  debug.type = "checkbox";
  debug.checked = settings.debug;
  debug.addEventListener("change", () => deps.save({ ...deps.get(), debug: debug.checked }));
  blocks.push({ el: debugRow, update: (s) => (debug.checked = s.debug) });
  debugRow.append(debugLabel, debug);
  root.append(debugRow);

  if (DEV) {
    const line = document.createElement("p");
    line.className = "nyte-help";
    line.textContent = "Dev build · hot reload: checking…";
    root.append(line);
    try {
      const status = (await chrome.runtime.sendMessage({ type: "nyte:dev-status" })) as
        | { connected: boolean; port: number; attempts: number }
        | undefined;
      line.textContent = status?.connected
        ? `Dev build · hot reload connected on ws://localhost:${status.port} — saves reload the extension automatically.`
        : `Dev build · hot reload NOT connected (port ${status?.port ?? "?"}). Is \`pnpm dev\` running? Then reload the extension once.`;
    } catch {
      line.textContent = "Dev build · hot reload status unavailable (service worker asleep?). Reload the extension once.";
    }
  }
}

void main();
