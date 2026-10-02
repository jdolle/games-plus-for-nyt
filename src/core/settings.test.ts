import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, isGameActive, mergeSettings, resolveOption, resolveShortcutCombo, withGameSettings, withOption } from "./settings";
import type { ChoiceOption, OptionDefinition, ShortcutDefinition } from "./types";

describe("mergeSettings", () => {
  it("returns defaults for missing or malformed input", () => {
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(mergeSettings([1, 2])).toEqual(DEFAULT_SETTINGS);
  });

  it("drops unknown keys and invalid values, keeps valid ones", () => {
    const merged = mergeSettings({
      darkMode: "off",
      debug: "yes",
      extra: 1,
      games: {
        crossword: { enabled: false, shortcuts: { a: "Alt+KeyA", b: "garbage", c: null, d: 5 }, options: { x: true, y: 5 }, junk: true },
        broken: "not an object",
      },
    });
    expect(merged.darkMode).toBe("off");
    expect(merged.debug).toBe(false);
    expect("extra" in merged).toBe(false);
    expect(merged.games.crossword).toEqual({ enabled: false, shortcuts: { a: "Alt+KeyA", c: null }, options: { x: true } });
    expect(merged.games.broken).toBeUndefined();
  });

  it("canonicalises combo strings", () => {
    const merged = mergeSettings({ games: { g: { shortcuts: { s: "option+shift+KeyQ" } } } });
    expect(merged.games.g?.shortcuts.s).toBe("Alt+Shift+KeyQ");
  });

  it("drops bare-letter overrides (they would type into the game) but keeps special keys", () => {
    const merged = mergeSettings({ games: { g: { shortcuts: { a: "KeyA", b: "Shift+KeyB", c: "Alt+KeyC", d: "Tab", e: "Space", f: "Shift+Escape" } } } });
    expect(merged.games.g?.shortcuts).toEqual({ c: "Alt+KeyC", d: "Tab", e: "Space", f: "Shift+Escape" });
  });
});

describe("resolve helpers", () => {
  const def: ShortcutDefinition = { id: "g.s", title: "S", defaultCombo: "Alt+KeyS", run: () => undefined };
  const opt: OptionDefinition = { id: "o", title: "O", default: true };

  it("falls back to the default combo and honours null", () => {
    const s = mergeSettings(undefined);
    expect(resolveShortcutCombo(s, "g", def)?.code).toBe("KeyS");
    const off = withGameSettings(s, "g", { shortcuts: { "g.s": null } });
    expect(resolveShortcutCombo(off, "g", def)).toBeNull();
  });

  it("resolves options with defaults", () => {
    const s = mergeSettings(undefined);
    expect(resolveOption(s, "g", opt)).toBe(true);
    expect(resolveOption(withGameSettings(s, "g", { options: { o: false } }), "g", opt)).toBe(false);
  });
});

describe("isGameActive", () => {
  it("follows the module flag (true unless an old stored value turned it off); there is no global switch", () => {
    const on = mergeSettings({ enabled: false, games: { crossword: { enabled: true } } });
    expect("enabled" in on).toBe(false);
    expect(isGameActive(on, "crossword")).toBe(true);
    expect(isGameActive(on, "unknown-module")).toBe(true);
    expect(isGameActive(withGameSettings(on, "crossword", { enabled: false }), "crossword")).toBe(false);
  });
});

describe("choice options", () => {
  const def: ChoiceOption = {
    kind: "choice",
    id: "where",
    title: "Where",
    choices: [{ value: "a", label: "A" }, { value: "b", label: "B" }],
    default: "a",
  };

  it("keeps stored strings, rejects values outside the declared choices, and updates immutably", () => {
    const base = mergeSettings({ games: { g: { options: { where: "b", junk: 5, long: "x".repeat(65) } } } });
    expect(base.games.g?.options).toEqual({ where: "b" });
    expect(resolveOption(base, "g", def)).toBe("b");
    expect(resolveOption(mergeSettings({ games: { g: { options: { where: "zzz" } } } }), "g", def)).toBe("a");
    expect(resolveOption(mergeSettings({}), "g", def)).toBe("a");
    const next = withOption(base, "g", "where", "a");
    expect(resolveOption(next, "g", def)).toBe("a");
    expect(resolveOption(base, "g", def)).toBe("b");
  });
});
