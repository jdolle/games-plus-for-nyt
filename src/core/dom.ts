import type { Logger } from "./log";

/** First element matching any candidate selector, in order. Invalid selectors are skipped. */
export function findFirst<T extends Element = HTMLElement>(
  candidates: readonly string[],
  root: ParentNode = document,
): T | null {
  for (const selector of candidates) {
    try {
      const el = root.querySelector<T>(selector);
      if (el) return el;
    } catch {
      /* invalid selector: try the next candidate */
    }
  }
  return null;
}

function normalizeText(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

export interface ClickOptions {
  /** Last resort: a button/link under `within` (or the document) whose aria-label or text matches. */
  textFallback?: RegExp;
  within?: readonly string[];
  log?: Logger;
}

/** Clicks the first matching element. Never caches nodes (React re-renders them). */
export function clickButton(candidates: readonly string[], opts: ClickOptions = {}): boolean {
  let target = findFirst<HTMLElement>(candidates);
  if (!target && opts.textFallback) {
    const scope: ParentNode = (opts.within && findFirst(opts.within)) || document;
    for (const el of scope.querySelectorAll<HTMLElement>('button, [role="button"], a')) {
      const label = normalizeText(`${el.getAttribute("aria-label") ?? ""} ${el.textContent ?? ""}`);
      if (opts.textFallback.test(label)) {
        target = el;
        break;
      }
    }
  }
  if (!target) {
    opts.log?.warn("No element matched any candidate selector", candidates);
    return false;
  }
  target.click();
  return true;
}

export interface WaitOptions {
  timeout?: number;
  root?: ParentNode;
}

/** Resolves when any of the selectors matches; `document.body` may not exist yet at document_start. */
export function waitForElement<T extends Element = HTMLElement>(
  selectors: string | readonly string[],
  { timeout = 15_000, root = document }: WaitOptions = {},
): Promise<T> {
  const list = typeof selectors === "string" ? [selectors] : selectors;
  const existing = findFirst<T>(list, root);
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const target: Node = root === document ? document.documentElement : (root as Node);
    const observer = new MutationObserver(() => {
      const el = findFirst<T>(list, root);
      if (el) {
        cleanup();
        resolve(el);
      }
    });
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out after ${timeout}ms waiting for ${list.join(" | ")}`));
    }, timeout);
    const cleanup = () => {
      observer.disconnect();
      clearTimeout(timer);
    };
    observer.observe(target, { childList: true, subtree: true });
  });
}

/** Injects a page-level <style> once (light DOM; only for rules that must reach the host page's own elements). */
export function ensurePageStyle(id: string, css: string, doc: Document = document): void {
  if (doc.getElementById(id)) return;
  const style = doc.createElement("style");
  style.id = id;
  style.textContent = css;
  (doc.head ?? doc.documentElement).append(style);
}

/** Runs `cb` now and after DOM mutations under `root` (coalesced). Returns a disposer. */
export function observeDom(cb: () => void, root: Node = document.documentElement): () => void {
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      cb();
    }, 50);
  });
  observer.observe(root, { childList: true, subtree: true });
  cb();
  return () => observer.disconnect();
}

const TEXT_INPUT_TYPES = new Set(["text", "search", "url", "tel", "email", "password", "number", "date", "datetime-local", "month", "week", "time"]);

/** Somewhere the user types: a text-like <input>, <textarea>, contenteditable or an ARIA text box. */
export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return TEXT_INPUT_TYPES.has(el.type);
  const role = el.getAttribute("role");
  return role === "textbox" || role === "searchbox" || role === "combobox";
}

/**
 * A widget the browser or ARIA operates with Space, Enter or the arrows (buttons, links, checkboxes,
 * selects, …) plus text entry. A bare navigation key must never be taken from one of these.
 * Focusable containers such as the crossword's `<main tabindex=0>` are NOT widgets.
 */
export function isWidgetTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (isTextEntryTarget(target)) return true;
  const tag = target.tagName;
  if (tag === "BUTTON" || tag === "SELECT" || tag === "SUMMARY" || tag === "INPUT") return true;
  if (tag === "A" && target.hasAttribute("href")) return true;
  return /^(button|link|checkbox|radio|switch|menuitem(checkbox|radio)?|tab|option|slider|spinbutton)$/.test(target.getAttribute("role") ?? "");
}

/** Inputs, buttons, links and focusable containers (such as the crossword's `<main tabindex=0>`). */
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target as HTMLElement;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON" || tag === "A") return true;
  const role = el.getAttribute("role");
  if (role === "button" || role === "textbox" || role === "link" || role === "switch" || role === "checkbox") return true;
  const tabindex = el.getAttribute("tabindex");
  return tabindex !== null && tabindex !== "-1";
}
