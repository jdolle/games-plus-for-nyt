import { PRODUCT_NAME } from "../core/brand";
import { connectDevReload, getDevReloadStatus, reloadPendingTabs } from "../core/dev-reload";
import { DEV, extensionVersion } from "../core/env";
import { createLogger } from "../core/log";
import { mergeSettings } from "../core/settings";
import { loadRawSettings, saveSettings } from "../core/storage";

const log = createLogger("service-worker", DEV);
log.info(`${PRODUCT_NAME} v${extensionVersion()} service worker started${DEV ? " (dev build)" : ""}`);

// Runs on every worker start, so the socket reconnects after Chrome terminates the worker.
if (__DEV__) {
  connectDevReload();
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if ((message as { type?: string } | null)?.type === "nyte:dev-status") sendResponse(getDevReloadStatus());
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  log.info("onInstalled", details.reason);
  void (async () => {
    try {
      // Migrate / normalise whatever is in storage to the current schema.
      const settings = mergeSettings(await loadRawSettings());
      await saveSettings(settings);
      log.debug("settings normalised", settings);
    } catch (e) {
      log.warn("settings migration failed", e);
    }
    if (__DEV__) await reloadPendingTabs();
  })();
});
