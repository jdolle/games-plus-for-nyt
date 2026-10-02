import { serializeCombo, type KeyCombo } from "./keys";

export type Platform = "mac" | "windows" | "other";

interface NavigatorLike {
  userAgentData?: { platform?: string };
  platform?: string;
}

export function detectPlatform(
  nav: NavigatorLike = typeof navigator !== "undefined" ? (navigator as NavigatorLike) : {},
): Platform {
  const p = (nav.userAgentData?.platform ?? nav.platform ?? "").toLowerCase();
  if (p.includes("mac")) return "mac";
  if (p.includes("win")) return "windows";
  return "other";
}

/** Chrome / Windows chords that the browser or OS handles (often before the page sees the key). */
const WINDOWS_RESERVED: readonly string[] = [
  "Alt+KeyF", "Alt+KeyE", "Alt+KeyD", "Alt+Home", "Alt+ArrowLeft", "Alt+ArrowRight",
  "Alt+F4", "Alt+Space", "Alt+Tab", "Alt+Enter",
  "Ctrl+KeyA", "Ctrl+KeyC", "Ctrl+KeyD", "Ctrl+KeyE", "Ctrl+KeyF", "Ctrl+KeyG", "Ctrl+KeyH",
  "Ctrl+KeyJ", "Ctrl+KeyK", "Ctrl+KeyL", "Ctrl+KeyN", "Ctrl+KeyO", "Ctrl+KeyP", "Ctrl+KeyR",
  "Ctrl+KeyS", "Ctrl+KeyT", "Ctrl+KeyU", "Ctrl+KeyV", "Ctrl+KeyW", "Ctrl+KeyX", "Ctrl+KeyY", "Ctrl+KeyZ",
  "F5", "F6", "F11", "F12",
];

/** macOS / Chrome chords that the system or browser grabs. */
const MAC_RESERVED: readonly string[] = [
  "Meta+KeyA", "Meta+KeyC", "Meta+KeyD", "Meta+KeyE", "Meta+KeyF", "Meta+KeyG", "Meta+KeyH",
  "Meta+KeyJ", "Meta+KeyK", "Meta+KeyL", "Meta+KeyM", "Meta+KeyN", "Meta+KeyO", "Meta+KeyP",
  "Meta+KeyQ", "Meta+KeyR", "Meta+KeyS", "Meta+KeyT", "Meta+KeyU", "Meta+KeyV", "Meta+KeyW",
  "Meta+KeyX", "Meta+KeyY", "Meta+KeyZ", "Meta+Comma", "Meta+Tab", "Meta+BracketLeft", "Meta+BracketRight",
  "Ctrl+ArrowLeft", "Ctrl+ArrowRight", "Ctrl+ArrowUp", "Ctrl+ArrowDown",
];

/** Combos to warn about (never block) when a user records them, and never to use as defaults. */
export function reservedCombos(platform: Platform): readonly string[] {
  return platform === "mac" ? MAC_RESERVED : WINDOWS_RESERVED;
}

/**
 * Keys whose Ctrl/⌘ chord is a well-known browser or OS action (reload, print, save, new tab,
 * copy, …) or that the browser binds with Alt (tab switching, menus, navigation). Never use them
 * for DEFAULT bindings, even behind Alt/Option: users associate the letter with that action and a
 * modifier slip (⌘R instead of ⌥R) would reload the page. Users may still rebind to anything.
 */
export const COMMON_SHORTCUT_CODES: ReadonlySet<string> = new Set([
  "KeyA", "KeyC", "KeyD", "KeyE", "KeyF", "KeyH", "KeyL", "KeyM", "KeyN", "KeyO", "KeyP", "KeyQ",
  "KeyR", "KeyS", "KeyT", "KeyU", "KeyV", "KeyW", "KeyX", "KeyY", "KeyZ",
  "Digit0", "Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9",
  "Tab", "Space", "Backspace", "Delete", "Escape", "Home", "End", "PageUp", "PageDown",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "BracketLeft", "BracketRight", "Comma", "Minus", "Equal",
  "F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F9", "F10", "F11", "F12",
]);

/** Option+E/U/I/N/` start an accent composition on macOS; avoid them as defaults. */
export const MAC_DEAD_KEY_CODES: ReadonlySet<string> = new Set(["KeyE", "KeyU", "KeyI", "KeyN", "Backquote"]);

/**
 * Why `combo` must not be a default binding, or null when it is acceptable.
 * Safe pool in practice: Alt/Option + B, G, J, K, Enter, Period, Slash, Semicolon, Quote, Backslash.
 * A shortcut the user explicitly wants anyway sets `unsafeDefaultOverride` (see core/types.ts).
 */
export function unsafeDefaultReason(combo: KeyCombo): string | null {
  if (combo.ctrl || combo.meta) return "Ctrl/⌘ chords are the browser's own shortcut space";
  if (!combo.alt) return "defaults must use Alt/Option so they never collide with typing in the game";
  if (COMMON_SHORTCUT_CODES.has(combo.code)) return `${combo.code} is a common browser/OS shortcut key`;
  if (MAC_DEAD_KEY_CODES.has(combo.code)) return `Option+${combo.code} is a dead key on macOS`;
  const serialized = serializeCombo(combo);
  if (reservedCombos("windows").includes(serialized) || reservedCombos("mac").includes(serialized)) {
    return `${serialized} is a reserved browser/OS chord`;
  }
  return null;
}
