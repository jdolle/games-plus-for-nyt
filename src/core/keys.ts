import type { Platform } from "./platform";

/** A key combination, matched on the physical key (`KeyboardEvent.code`) plus modifiers. */
export interface KeyCombo {
  code: string;
  alt: boolean;
  ctrl: boolean;
  shift: boolean;
  meta: boolean;
}

type ModifierName = "alt" | "ctrl" | "shift" | "meta";

const MODIFIER_ALIASES: Record<string, ModifierName> = {
  ctrl: "ctrl", control: "ctrl",
  alt: "alt", option: "alt", opt: "alt",
  shift: "shift",
  meta: "meta", cmd: "meta", command: "meta", win: "meta", super: "meta",
};

const MODIFIER_CODES = new Set([
  "ControlLeft", "ControlRight", "AltLeft", "AltRight", "ShiftLeft", "ShiftRight",
  "MetaLeft", "MetaRight", "OSLeft", "OSRight", "CapsLock", "Fn", "FnLock",
]);

export function isModifierCode(code: string): boolean {
  return MODIFIER_CODES.has(code);
}

/** The generic name of a physical modifier key's family ("ShiftLeft" → "Shift"), or null. */
export function modifierFamily(code: string): ModifierOnlyCode | null {
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "AltLeft" || code === "AltRight") return "Alt";
  if (code === "ControlLeft" || code === "ControlRight") return "Control";
  if (code === "MetaLeft" || code === "MetaRight" || code === "OSLeft" || code === "OSRight") return "Meta";
  return null;
}

/** A binding on a modifier key by itself (either side): code is the family name and only its own flag is set. */
export type ModifierOnlyCode = "Shift" | "Alt" | "Control" | "Meta";
const MODIFIER_FLAG: Record<ModifierOnlyCode, ModifierName> = { Shift: "shift", Alt: "alt", Control: "ctrl", Meta: "meta" };

export function isModifierOnlyCode(code: string): code is ModifierOnlyCode {
  return code in MODIFIER_FLAG;
}

export function isModifierOnly(c: KeyCombo): boolean {
  return isModifierOnlyCode(c.code);
}

/** The combo for a modifier key pressed on its own, e.g. `modifierOnlyCombo("Shift")`. */
export function modifierOnlyCombo(code: ModifierOnlyCode): KeyCombo {
  return { code, alt: false, ctrl: false, shift: false, meta: false, [MODIFIER_FLAG[code]]: true };
}

const NAMED_CODES = new Set([
  "Enter", "Escape", "Backspace", "Tab", "Space", "Minus", "Equal", "BracketLeft", "BracketRight",
  "Backslash", "Semicolon", "Quote", "Backquote", "Comma", "Period", "Slash", "IntlBackslash",
  "IntlRo", "IntlYen", "Home", "End", "PageUp", "PageDown", "Insert", "Delete", "ContextMenu",
  "PrintScreen", "ScrollLock", "Pause", "NumLock", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
]);

/**
 * Accepts real `KeyboardEvent.code` values (letters, digits, F-keys, numpad, named keys) and the
 * generic modifier-only names ("Shift"), never a physical modifier code ("ShiftLeft").
 */
export function isValidKeyCode(code: string): boolean {
  if (isModifierCode(code)) return false;
  if (isModifierOnlyCode(code)) return true;
  return (
    /^Key[A-Z]$/.test(code) ||
    /^Digit[0-9]$/.test(code) ||
    /^F([1-9]|1[0-9]|2[0-4])$/.test(code) ||
    /^Numpad[A-Za-z0-9]+$/.test(code) ||
    /^(Lang|Media|Audio|Browser|Launch)[A-Za-z0-9]+$/.test(code) ||
    NAMED_CODES.has(code)
  );
}

/**
 * Parses "Alt+Shift+KeyP" (any modifier order, aliases allowed) or a lone modifier ("Shift", "Option").
 * Returns null when malformed.
 */
export function parseCombo(input: string): KeyCombo | null {
  if (typeof input !== "string") return null;
  const parts = input.split("+").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1 && !input.includes("+")) {
    const lone = MODIFIER_ALIASES[parts[0]!.toLowerCase()];
    if (lone) return modifierOnlyCombo(({ shift: "Shift", alt: "Alt", ctrl: "Control", meta: "Meta" } as const)[lone]);
  }
  const combo: KeyCombo = { code: "", alt: false, ctrl: false, shift: false, meta: false };
  for (const part of parts) {
    const mod = MODIFIER_ALIASES[part.toLowerCase()];
    if (mod) {
      combo[mod] = true;
      continue;
    }
    if (combo.code) return null; // two non-modifier keys
    if (!isValidKeyCode(part)) return null;
    combo.code = part;
  }
  return combo.code ? combo : null;
}

/** Canonical form: Ctrl+Alt+Shift+Meta+<code>, or just the family name for a lone modifier ("Shift"). */
export function serializeCombo(c: KeyCombo): string {
  if (isModifierOnly(c)) return c.code;
  const parts: string[] = [];
  if (c.ctrl) parts.push("Ctrl");
  if (c.alt) parts.push("Alt");
  if (c.shift) parts.push("Shift");
  if (c.meta) parts.push("Meta");
  parts.push(c.code);
  return parts.join("+");
}

/**
 * The combo a key event represents. A physical modifier key maps to its family's lone-modifier combo
 * ("ShiftLeft" → "Shift" with only `shift` set), on keydown and keyup alike (on keyup the flag has
 * already dropped, so it is set explicitly).
 */
export function comboFromEvent(
  e: Pick<KeyboardEvent, "code" | "altKey" | "ctrlKey" | "shiftKey" | "metaKey">,
): KeyCombo {
  const family = modifierFamily(e.code);
  if (family) return modifierOnlyCombo(family);
  return { code: e.code, alt: e.altKey, ctrl: e.ctrlKey, shift: e.shiftKey, meta: e.metaKey };
}

export function comboEquals(a: KeyCombo, b: KeyCombo): boolean {
  return a.code === b.code && a.alt === b.alt && a.ctrl === b.ctrl && a.shift === b.shift && a.meta === b.meta;
}

/** True when the combo has a "real" modifier (Shift alone does not count). */
export function hasModifier(c: KeyCombo): boolean {
  return c.alt || c.ctrl || c.meta;
}

/**
 * A bare letter — with or without Shift — types text, so such a combo can never be a binding: the
 * editor refuses it and `mergeSettings` drops a stored one. Digits and special keys (Space, Tab, …)
 * are allowed; the dispatcher only holds bare keys back inside text fields and on focused widgets.
 */
export function isLetterTyping(c: KeyCombo): boolean {
  return !hasModifier(c) && /^Key[A-Z]$/.test(c.code);
}

const SPECIAL_NAMES: Record<string, { mac: string; other: string }> = {
  Enter: { mac: "↩", other: "Enter" },
  Escape: { mac: "ESC", other: "ESC" }, // the ⎋ glyph is obscure; the key cap says ESC
  Backspace: { mac: "⌫", other: "Backspace" },
  Delete: { mac: "⌦", other: "Delete" },
  Tab: { mac: "⇥", other: "Tab" },
  Shift: { mac: "⇧", other: "Shift" },
  Alt: { mac: "⌥", other: "Alt" },
  Control: { mac: "⌃", other: "Ctrl" },
  Meta: { mac: "⌘", other: "Win" },
  Space: { mac: "Space", other: "Space" },
  ArrowUp: { mac: "↑", other: "↑" },
  ArrowDown: { mac: "↓", other: "↓" },
  ArrowLeft: { mac: "←", other: "←" },
  ArrowRight: { mac: "→", other: "→" },
  Home: { mac: "Home", other: "Home" },
  End: { mac: "End", other: "End" },
  PageUp: { mac: "PgUp", other: "PgUp" },
  PageDown: { mac: "PgDn", other: "PgDn" },
  Insert: { mac: "Ins", other: "Ins" },
  Comma: { mac: ",", other: "," },
  Period: { mac: ".", other: "." },
  Slash: { mac: "/", other: "/" },
  Backslash: { mac: "\\", other: "\\" },
  Semicolon: { mac: ";", other: ";" },
  Quote: { mac: "'", other: "'" },
  BracketLeft: { mac: "[", other: "[" },
  BracketRight: { mac: "]", other: "]" },
  Minus: { mac: "-", other: "-" },
  Equal: { mac: "=", other: "=" },
  Backquote: { mac: "`", other: "`" },
};

/** Human-readable name for a `KeyboardEvent.code`. */
export function keyDisplayName(code: string, platform: Platform): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit\d$/.test(code)) return code.slice(5);
  if (/^F\d{1,2}$/.test(code)) return code;
  if (code.startsWith("Numpad")) return `Num ${code.slice(6)}`;
  const special = SPECIAL_NAMES[code];
  if (special) return platform === "mac" ? special.mac : special.other;
  return code;
}

/** "⌥P" on macOS, "Alt+P" on Windows / Linux. */
export function formatCombo(c: KeyCombo, platform: Platform): string {
  const key = keyDisplayName(c.code, platform);
  if (isModifierOnly(c)) return key; // a lone modifier: just its own name, not "⇧⇧"
  if (platform === "mac") {
    return `${c.ctrl ? "⌃" : ""}${c.alt ? "⌥" : ""}${c.shift ? "⇧" : ""}${c.meta ? "⌘" : ""}${key}`;
  }
  const parts: string[] = [];
  if (c.ctrl) parts.push("Ctrl");
  if (c.alt) parts.push("Alt");
  if (c.shift) parts.push("Shift");
  if (c.meta) parts.push(platform === "windows" ? "Win" : "Super");
  parts.push(key);
  return parts.join("+");
}
