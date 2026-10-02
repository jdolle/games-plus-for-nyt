import { mergeSettings, STORAGE_KEY, type Settings } from "./settings";

/** False once the content script is orphaned by an extension reload. */
export function hasRuntime(): boolean {
  try {
    return typeof chrome !== "undefined" && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

export async function loadRawSettings(): Promise<unknown> {
  if (!hasRuntime()) return undefined;
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  return result[STORAGE_KEY];
}

export async function loadSettings(): Promise<Settings> {
  try {
    return mergeSettings(await loadRawSettings());
  } catch {
    return mergeSettings(undefined);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  if (!hasRuntime()) return;
  await chrome.storage.sync.set({ [STORAGE_KEY]: settings });
}

/** Read-modify-write against the stored settings (fresh copy, not a stale snapshot). */
export async function updateSettings(fn: (current: Settings) => Settings): Promise<Settings> {
  const next = fn(await loadSettings());
  await saveSettings(next);
  return next;
}

/** Subscribes to settings written by any surface (page panel, popup, another tab). Returns an unsubscribe. */
export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  if (!hasRuntime()) return () => undefined;
  const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area !== "sync" || !(STORAGE_KEY in changes)) return;
    cb(mergeSettings(changes[STORAGE_KEY]?.newValue));
  };
  chrome.storage.onChanged.addListener(listener);
  return () => {
    try {
      chrome.storage.onChanged.removeListener(listener);
    } catch {
      /* runtime gone */
    }
  };
}

/** Coalesces rapid saves (radio clicks, recording) into one write; the last value wins. */
export function createDebouncedSaver(delayMs = 150): { schedule(next: Settings): void; flush(): Promise<void> } {
  let pending: Settings | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  const write = async () => {
    timer = null;
    const next = pending;
    pending = null;
    if (next) await saveSettings(next).catch(() => undefined);
  };
  return {
    schedule(next) {
      pending = next;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void write(), delayMs);
    },
    async flush() {
      if (timer) {
        clearTimeout(timer);
        await write();
      }
    },
  };
}
