/**
 * Development-only hot reload client. Imported by the service worker inside `if (__DEV__)`, so
 * esbuild drops it from production builds. The server lives in build.mjs (`pnpm dev`).
 */
import { createLogger } from "./log";

const PENDING_TABS_KEY = "nyte:dev-reload-tabs";
const DEFAULT_PORT = typeof __NYTE_DEV_PORT__ !== "undefined" ? __NYTE_DEV_PORT__ : 35729;
const log = createLogger("dev-reload", true);

export interface DevReloadStatus {
  connected: boolean;
  port: number;
  attempts: number;
  lastBuildId: number | null;
}
const status: DevReloadStatus = { connected: false, port: DEFAULT_PORT, attempts: 0, lastBuildId: null };

/** For the popup's "hot reload: connected / not connected" line (dev builds only). */
export function getDevReloadStatus(): DevReloadStatus {
  return { ...status };
}

export function connectDevReload(port = DEFAULT_PORT, attempt = 0): void {
  let socket: WebSocket;
  status.port = port;
  status.attempts = attempt;
  if (attempt === 0) log.info(`connecting to the reload server on ws://localhost:${port}`);
  try {
    socket = new WebSocket(`ws://localhost:${port}`);
  } catch (e) {
    log.warn("could not open the reload socket", e);
    return;
  }
  socket.onopen = () => {
    attempt = 0;
    status.connected = true;
    status.attempts = 0;
    log.info(`connected to the reload server on port ${port}`);
  };
  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(String(event.data)) as { type?: string; buildId?: number };
      if (message.type === "reload") {
        status.lastBuildId = message.buildId ?? null;
        log.info("new build received; reloading the extension", { buildId: message.buildId });
        void reloadExtension();
      }
    } catch {
      /* ignore malformed frames */
    }
  };
  socket.onclose = () => {
    status.connected = false;
    const delay = Math.min(30_000, 1000 * 2 ** attempt);
    if (attempt === 0) log.warn(`reload server not reachable (is \`pnpm dev\` running?); retrying with backoff`);
    setTimeout(() => connectDevReload(port, attempt + 1), delay);
  };
}

/** Records which tabs run our content script right now (no `tabs`/host permission needed), then reloads. */
async function reloadExtension(): Promise<void> {
  const tabs = await chrome.tabs.query({});
  const live = await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) return null;
      try {
        const reply = (await chrome.tabs.sendMessage(tab.id, { type: "nyte:ping" })) as { ok?: boolean } | undefined;
        return reply?.ok ? tab.id : null;
      } catch {
        return null; // "Receiving end does not exist" = not a game tab
      }
    }),
  );
  const ids = live.filter((id): id is number => id !== null);
  log.info(`${ids.length} game tab(s) will be refreshed after the reload`, ids);
  await chrome.storage.local.set({ [PENDING_TABS_KEY]: ids });
  chrome.runtime.reload();
}

/** Called from onInstalled after a dev reload: refresh the tabs recorded by `reloadExtension`. */
export async function reloadPendingTabs(): Promise<void> {
  const stored = await chrome.storage.local.get(PENDING_TABS_KEY);
  const ids = (stored[PENDING_TABS_KEY] as number[] | undefined) ?? [];
  await chrome.storage.local.remove(PENDING_TABS_KEY);
  if (ids.length) log.info("refreshing game tabs after the reload", ids);
  for (const id of ids) {
    try {
      await chrome.tabs.reload(id);
    } catch {
      /* tab closed */
    }
  }
}
