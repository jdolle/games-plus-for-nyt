import { PRODUCT_NAME } from "./brand";
import { createClickDiagnostics } from "./diagnostics";
import { describeElement, DEV, extensionVersion } from "./env";
import { waitForElement } from "./dom";
import { applyFullscreen, createFitTracker, ensureFullscreenStyle, isFullscreenOn } from "./fullscreen";
import { createLogger, type Logger } from "./log";
import { isGameActive, type Settings } from "./settings";
import { createShortcutDispatcher } from "./shortcuts";
import { createDebouncedSaver, loadSettings, onSettingsChanged } from "./storage";
import { createThemeController } from "./theme";
import type { GameContext, GameModule } from "./types";
import { isOurUiEvent } from "./ui/hosts";
import { mountSettings, type MountedSettings } from "./ui/mount";

declare global {
  interface Window {
    __nyte?: Record<string, true>;
  }
}

/**
 * Content-script entry for one game: settings → theme → shortcuts → module.init → in-page settings UI,
 * then live updates from chrome.storage. Each game's content.ts is just `boot(module)`.
 * Logs: a banner and a "ready" line always; every phase with debug on (always on in dev builds).
 */
export async function boot(module: GameModule): Promise<void> {
  if (window.__nyte?.[module.id]) return;
  (window.__nyte ??= {})[module.id] = true;
  const log = createLogger(module.id, DEV);
  try {
    await run(module, log);
  } catch (e) {
    log.error("boot failed", e);
  }
}

async function run(module: GameModule, log: Logger): Promise<void> {
  log.info(`${PRODUCT_NAME} v${extensionVersion()}${DEV ? " (dev build, verbose logging on)" : ""} booting for ${module.name}`, {
    url: location.href,
    readyState: document.readyState,
    darkModeCapability: module.darkMode,
  });

  const theme = createThemeController(module.darkMode, { log });
  theme.applyCached();
  const fit = module.fullscreen ? createFitTracker(module.fullscreen) : null;
  if (module.fullscreen) ensureFullscreenStyle(module.fullscreen);

  log.debug("loading settings from chrome.storage.sync");
  let settings: Settings = await loadSettings();
  log.debug("settings loaded", settings);
  const ctx: GameContext = { module, settings, log, root: document };
  const dispatcher = createShortcutDispatcher(module, log, { ignoreWhen: isOurUiEvent });
  const clicks = createClickDiagnostics(log);
  const saver = createDebouncedSaver(150);
  let mounted: MountedSettings | null = null;

  const applySettings = (next: Settings, reason: string): void => {
    settings = next;
    ctx.settings = next;
    log.setDebug(DEV || next.debug);
    clicks.setEnabled(DEV || next.debug);
    const active = isGameActive(next, module.id);
    log.debug(`applying settings (${reason})`, { active, darkMode: next.darkMode, debug: next.debug });
    theme.apply(active ? next.darkMode : "off");
    const fullscreen = active && isFullscreenOn(next, module);
    if (applyFullscreen(fullscreen)) log.debug(`fullscreen game ${fullscreen ? "on" : "off"}`);
    if (fullscreen) fit?.start();
    else fit?.stop();
    dispatcher.setBindings(next);
    dispatcher.setEnabled(active);
    mounted?.update(next);
    if (reason !== "initial") {
      try {
        module.onSettingsChanged?.(ctx);
      } catch (e) {
        log.warn("module.onSettingsChanged failed", e);
      }
    }
  };

  applySettings(settings, "initial");
  dispatcher.install(ctx);
  log.debug("shortcut listener installed on window (capture phase)");

  const unsubscribe = onSettingsChanged((next) => applySettings(next, "storage change"));

  try {
    chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
      const type = (message as { type?: string } | null)?.type;
      log.debug("message received", type);
      if (type === "nyte:whoami") sendResponse({ gameId: module.id, name: module.name });
      else if (type === "nyte:ping") sendResponse({ ok: true });
    });
  } catch (e) {
    log.warn("messaging unavailable", e);
  }

  if (module.readySelector) {
    const selectors = typeof module.readySelector === "string" ? [module.readySelector] : module.readySelector;
    log.debug("waiting for the game to render", selectors);
    try {
      const el = await waitForElement(selectors);
      log.debug("game rendered; ready element:", describeElement(el));
    } catch (e) {
      log.warn("ready element never appeared (shortcuts stay active; in-page settings may not mount)", e);
    }
  }

  if (module.init) {
    try {
      await module.init(ctx);
      log.debug("module.init done");
    } catch (e) {
      log.warn("module.init failed", e);
    }
  }

  mounted = mountSettings(module, ctx, {
    getSettings: () => settings,
    saveSettings: (next) => {
      log.debug("settings changed from the in-page panel", next);
      applySettings(next, "in-page panel");
      saver.schedule(next);
    },
    // Natively dark games (Wordle) report their own state; themed games follow our theme controller.
    isDark: () => module.isPageDark?.(document) ?? theme.isDark(),
  });

  log.info("ready", { theme: theme.isDark() ? "dark" : "light", shortcuts: module.shortcuts.length });

  window.addEventListener(
    "pagehide",
    () => {
      log.debug("pagehide: tearing down");
      void saver.flush();
      unsubscribe();
      dispatcher.uninstall();
      clicks.setEnabled(false);
      theme.dispose();
      fit?.stop();
      applyFullscreen(false);
      mounted?.dispose();
      try {
        module.teardown?.(ctx);
      } catch {
        /* ignore */
      }
    },
    { once: true },
  );
}
