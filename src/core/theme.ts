import { silentLogger, type Logger } from "./log";
import type { DarkModeSetting } from "./settings";
import type { DarkModeCapability } from "./types";

/** Our gate: every rule in styles/theme.css and each game's dark.css is scoped under html[data-nyte-theme="dark"]. */
export const THEME_ATTR = "data-nyte-theme";
/** Page-origin cache so repeat visits paint dark before chrome.storage resolves. */
export const CACHE_KEY = "nyte:theme";
/** NYT's own hooks: their token stylesheet defines the dark palette on `[data-mode=dark].display-settings-enabled`. */
export const NYT_MODE_ATTR = "data-mode";
export const NYT_DISPLAY_CLASS = "display-settings-enabled";

/** How many times per second we are willing to re-assert the body hooks before assuming the page is fighting us. */
const MAX_REASSERTS_PER_SECOND = 20;

export interface ThemeController {
  /** Synchronous, from the localStorage cache; call at document_start. */
  applyCached(): void;
  apply(mode: DarkModeSetting): void;
  isDark(): boolean;
  dispose(): void;
}

export interface ThemeOptions {
  log?: Logger;
  doc?: Document;
}

export function createThemeController(
  capability: DarkModeCapability,
  { log = silentLogger, doc = document }: ThemeOptions = {},
): ThemeController {
  if (capability === "native") {
    log.debug("theme: game is natively dark; leaving the page untouched");
    return { applyCached: () => undefined, apply: () => undefined, isDark: () => false, dispose: () => undefined };
  }

  let dark = false;
  let bodyObserver: MutationObserver | null = null;
  let bodyWaiter: MutationObserver | null = null;
  let reasserts = 0;
  let reassertWindowStart = 0;
  let tripped = false;

  /**
   * Writes NYT's hooks only when something actually differs. Setting an attribute to its current
   * value still queues a mutation record, so an unconditional write from inside the observer
   * callback would re-trigger itself forever and freeze the page.
   */
  function writeBodyHooks(body: HTMLElement): boolean {
    let changed = false;
    if (body.getAttribute(NYT_MODE_ATTR) !== "dark") {
      body.setAttribute(NYT_MODE_ATTR, "dark");
      changed = true;
    }
    if (!body.classList.contains(NYT_DISPLAY_CLASS)) {
      body.classList.add(NYT_DISPLAY_CLASS);
      changed = true;
    }
    return changed;
  }

  function onBodyMutation(): void {
    const body = doc.body;
    if (!dark || tripped || !body) return;
    const now = Date.now();
    if (now - reassertWindowStart > 1000) {
      reassertWindowStart = now;
      reasserts = 0;
    }
    if (!writeBodyHooks(body)) return;
    bodyObserver?.takeRecords(); // discard the records our own write just queued
    reasserts++;
    log.debug("theme: the page changed body[data-mode]/class; re-asserted ours", { reasserts });
    if (reasserts >= MAX_REASSERTS_PER_SECOND) {
      tripped = true;
      bodyObserver?.disconnect();
      bodyObserver = null;
      log.warn("theme: the page keeps overriding the body hooks; stopped re-asserting to avoid a loop");
    }
  }

  function applyBody(): void {
    const body = doc.body;
    if (!body) return;
    if (dark) {
      const changed = writeBodyHooks(body);
      if (bodyObserver) {
        bodyObserver.takeRecords(); // our write is not a page change
      } else if (!tripped) {
        bodyObserver = new MutationObserver(onBodyMutation);
        bodyObserver.observe(body, { attributes: true, attributeFilter: [NYT_MODE_ATTR, "class"] });
      }
      if (changed) log.debug("theme: body hooks set", { [NYT_MODE_ATTR]: "dark", class: NYT_DISPLAY_CLASS });
    } else {
      bodyObserver?.disconnect();
      bodyObserver = null;
      if (body.classList.contains(NYT_DISPLAY_CLASS)) {
        body.classList.remove(NYT_DISPLAY_CLASS); // data-mode is inert without the class; leave it alone
        log.debug("theme: body hooks removed");
      }
    }
  }

  function render(): void {
    const html = doc.documentElement;
    if (dark) {
      if (html.getAttribute(THEME_ATTR) !== "dark") html.setAttribute(THEME_ATTR, "dark");
    } else {
      html.removeAttribute(THEME_ATTR);
    }
    if (doc.body) {
      applyBody();
    } else if (!bodyWaiter) {
      log.debug("theme: <body> not parsed yet; waiting");
      bodyWaiter = new MutationObserver(() => {
        if (!doc.body) return;
        bodyWaiter?.disconnect();
        bodyWaiter = null;
        applyBody();
      });
      bodyWaiter.observe(html, { childList: true });
    }
    try {
      localStorage.setItem(CACHE_KEY, dark ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  }

  return {
    applyCached() {
      try {
        if (localStorage.getItem(CACHE_KEY) === "dark") {
          dark = true;
          log.debug("theme: applying cached dark theme before settings load");
          render();
        }
      } catch {
        /* storage unavailable */
      }
    },
    apply(m) {
      dark = m === "on";
      log.debug("theme: apply", { mode: m, dark });
      render();
    },
    isDark: () => dark,
    dispose() {
      bodyObserver?.disconnect();
      bodyWaiter?.disconnect();
    },
  };
}
