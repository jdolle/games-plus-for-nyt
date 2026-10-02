// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { GLOBAL_SHORTCUTS, TOGGLE_FULLSCREEN_SHORTCUT } from "./global-shortcuts";
import { silentLogger } from "./log";
import { mergeSettings } from "./settings";
import type { GameContext, GameModule } from "./types";

const module: GameModule = {
  id: "demo",
  name: "Demo",
  matches: [],
  selectors: {},
  darkMode: "css",
  shortcuts: [],
  options: [],
  settingsMount: { kind: "none" },
  fullscreen: { target: ["#js-hook-game-wrapper"] },
};
const ctx = (m: GameModule = module): GameContext => ({ module: m, settings: mergeSettings({}), log: silentLogger, root: document });
const ev = new KeyboardEvent("keydown", { code: "KeyF", altKey: true });

describe("Toggle fullscreen shortcut", () => {
  it("is the one global shortcut and defaults to Option/Alt+F", () => {
    expect(GLOBAL_SHORTCUTS.shortcuts).toEqual([TOGGLE_FULLSCREEN_SHORTCUT]);
    expect(TOGGLE_FULLSCREEN_SHORTCUT.defaultCombo).toBe("Alt+KeyF");
  });

  it("applies only on pages that support fullscreen mode", () => {
    expect(TOGGLE_FULLSCREEN_SHORTCUT.when!(ctx(), ev)).toBe(true);
    expect(TOGGLE_FULLSCREEN_SHORTCUT.when!(ctx({ ...module, fullscreen: undefined }), ev)).toBe(false);
  });
});
