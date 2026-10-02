import { describe, expect, it } from "vitest";
import { comboEquals, comboFromEvent, formatCombo, isLetterTyping, isValidKeyCode, keyDisplayName, modifierOnlyCombo, parseCombo, serializeCombo } from "./keys";

describe("parseCombo / serializeCombo", () => {
  it("round-trips a canonical combo", () => {
    const combo = parseCombo("Alt+KeyP");
    expect(combo).toEqual({ code: "KeyP", alt: true, ctrl: false, shift: false, meta: false });
    expect(serializeCombo(combo!)).toBe("Alt+KeyP");
  });

  it("normalises modifier order and aliases", () => {
    expect(serializeCombo(parseCombo("Shift+Option+Cmd+Control+KeyA")!)).toBe("Ctrl+Alt+Shift+Meta+KeyA");
  });

  it("rejects malformed input", () => {
    // A lone modifier ("Alt") is a valid binding (see "modifier-only combos" below); these are not.
    for (const bad of ["", "Alt+", "Alt+Shift", "KeyA+KeyB", "Alt+Key P", "Alt+ShiftLeft", "+"]) {
      expect(parseCombo(bad), bad).toBeNull();
    }
  });
});

describe("comboFromEvent / comboEquals", () => {
  it("builds a combo from a plain event-like object", () => {
    const combo = comboFromEvent({ code: "KeyR", altKey: true, ctrlKey: false, shiftKey: false, metaKey: false });
    expect(comboEquals(combo, parseCombo("Alt+KeyR")!)).toBe(true);
    expect(comboEquals(combo, parseCombo("Alt+Shift+KeyR")!)).toBe(false);
  });
});

describe("formatCombo / keyDisplayName", () => {
  it("formats for macOS with glyphs", () => {
    expect(formatCombo(parseCombo("Alt+KeyP")!, "mac")).toBe("⌥P");
    expect(formatCombo(parseCombo("Ctrl+Alt+Shift+Meta+Enter")!, "mac")).toBe("⌃⌥⇧⌘↩");
  });

  it("formats for Windows with words", () => {
    expect(formatCombo(parseCombo("Alt+KeyP")!, "windows")).toBe("Alt+P");
    expect(formatCombo(parseCombo("Ctrl+Shift+Meta+Digit1")!, "windows")).toBe("Ctrl+Shift+Win+1");
  });

  it("names keys", () => {
    expect(keyDisplayName("KeyZ", "windows")).toBe("Z");
    expect(keyDisplayName("Digit9", "mac")).toBe("9");
    expect(keyDisplayName("ArrowUp", "windows")).toBe("↑");
    expect(keyDisplayName("Comma", "mac")).toBe(",");
    expect(keyDisplayName("F5", "mac")).toBe("F5");
    expect(keyDisplayName("Numpad1", "mac")).toBe("Num 1");
    expect(keyDisplayName("Unknown", "mac")).toBe("Unknown");
  });
});

describe("isLetterTyping", () => {
  it("is true for a bare letter with or without Shift and false for everything else", () => {
    expect(isLetterTyping(parseCombo("KeyA")!)).toBe(true);
    expect(isLetterTyping(parseCombo("Shift+KeyA")!)).toBe(true);
    expect(isLetterTyping(parseCombo("Alt+KeyA")!)).toBe(false);
    expect(isLetterTyping(parseCombo("Ctrl+KeyA")!)).toBe(false);
    for (const ok of ["Space", "Shift+Space", "Digit1", "Tab", "Enter", "Escape", "ArrowDown", "Comma"]) {
      expect(isLetterTyping(parseCombo(ok)!), ok).toBe(false);
    }
  });
});

describe("modifier-only combos", () => {
  it("parses, serialises and formats a lone modifier", () => {
    expect(parseCombo("Shift")).toEqual({ code: "Shift", alt: false, ctrl: false, shift: true, meta: false });
    expect(parseCombo("Option")).toEqual(modifierOnlyCombo("Alt"));
    expect(parseCombo("Alt+Shift")).toBeNull();
    expect(serializeCombo(parseCombo("Shift")!)).toBe("Shift");
    expect(formatCombo(parseCombo("Shift")!, "mac")).toBe("⇧");
    expect(formatCombo(parseCombo("Shift")!, "windows")).toBe("Shift");
    expect(isValidKeyCode("Shift")).toBe(true);
    expect(isValidKeyCode("ShiftLeft")).toBe(false);
    expect(isLetterTyping(parseCombo("Shift")!)).toBe(false);
  });
  it("maps either physical Shift key, on keydown or keyup, to the lone-Shift combo", () => {
    const down = comboFromEvent({ code: "ShiftLeft", altKey: false, ctrlKey: false, shiftKey: true, metaKey: false });
    const up = comboFromEvent({ code: "ShiftRight", altKey: false, ctrlKey: false, shiftKey: false, metaKey: false });
    expect(comboEquals(down, parseCombo("Shift")!)).toBe(true);
    expect(comboEquals(up, parseCombo("Shift")!)).toBe(true);
  });
});
