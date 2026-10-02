// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyFullscreen, createFitTracker, createFullscreenControl, fullscreenCss, FULLSCREEN_ATTR, isFullscreenOn, setFullscreen, toggleFullscreen } from "./fullscreen";
import { mergeSettings, type Settings } from "./settings";
import type { GameModule } from "./types";

const module: GameModule = {
  id: "demo",
  name: "Demo",
  matches: [],
  selectors: {},
  darkMode: "css",
  shortcuts: [],
  options: [],
  settingsMount: { kind: "none" },
  fullscreen: { target: ["#js-hook-game-wrapper"], fit: [".board"] },
};

describe("fullscreen setting", () => {
  it("is a global flag, off by default, that only counts for modules that opt in", () => {
    const settings = mergeSettings({});
    expect(settings.fullscreen).toBe(false);
    expect(isFullscreenOn(settings, module)).toBe(false);
    const on = toggleFullscreen(settings);
    expect(on.fullscreen).toBe(true);
    expect(isFullscreenOn(on, module)).toBe(true);
    expect(isFullscreenOn(toggleFullscreen(on), module)).toBe(false);
    expect(isFullscreenOn(on, { ...module, fullscreen: undefined })).toBe(false);
    expect(setFullscreen(on, true)).toBe(on);
    expect(mergeSettings({ fullscreen: true }).fullscreen).toBe(true);
    expect(mergeSettings({ fullscreen: "yes" }).fullscreen).toBe(false);
  });
});

describe("applyFullscreen", () => {
  it("writes the html gate only when it changes", () => {
    document.documentElement.removeAttribute(FULLSCREEN_ATTR);
    expect(applyFullscreen(false)).toBe(false);
    expect(applyFullscreen(true)).toBe(true);
    expect(document.documentElement.getAttribute(FULLSCREEN_ATTR)).toBe("on");
    expect(applyFullscreen(true)).toBe(false);
    expect(applyFullscreen(false)).toBe(true);
    expect(document.documentElement.hasAttribute(FULLSCREEN_ATTR)).toBe(false);
  });
});

describe("fullscreenCss", () => {
  it("gates every rule on the html attribute, fixes the target over the window and grows the fit element", () => {
    const css = fullscreenCss(module.fullscreen!);
    expect(css).toContain('html[data-nyte-fullscreen="on"] :is(#js-hook-game-wrapper)');
    expect(css).toContain("position: fixed !important");
    expect(css).toContain("top: var(--nyte-fs-header, 0px) !important");
    expect(css).toContain("height: calc(100dvh - var(--nyte-fs-header, 0px)) !important");
    expect(css).toContain("z-index: 99;");
    expect(css).toContain("overflow-x: hidden; overflow-y: auto");
    expect(css).toContain('html[data-nyte-fullscreen="on"] :is(#js-hook-pz-moment__game) { overflow: hidden !important; }');
    expect(css).not.toContain("100vw");
    expect(css).toContain('html[data-nyte-fullscreen="on"] :is(.board)');
    expect(css).toContain("--nyte-fs-fit-top");
    expect(css).toMatch(/overflow: hidden/);
    for (const line of css.split("\n")) expect(line.startsWith('html[data-nyte-fullscreen="on"]'), line).toBe(true);
  });
});

describe("createFullscreenControl", () => {
  it("shows the expand icon, flips to compress and aria-pressed when on, and toggles the setting on click", () => {
    let settings: Settings = mergeSettings({});
    const saved: Settings[] = [];
    const control = createFullscreenControl(module, { get: () => settings, save: (next) => saved.push((settings = next)) });
    expect(control.button.getAttribute("aria-pressed")).toBe("false");
    expect(control.button.title).toBe("Fullscreen");
    const expandIcon = control.button.innerHTML;

    control.button.click();
    expect(saved).toHaveLength(1);
    expect(isFullscreenOn(settings, module)).toBe(true);
    control.update(settings);
    expect(control.button.getAttribute("aria-pressed")).toBe("true");
    expect(control.button.title).toBe("Exit fullscreen");
    expect(control.button.innerHTML).not.toBe(expandIcon);

    control.button.click();
    control.update(settings);
    expect(control.button.getAttribute("aria-pressed")).toBe("false");
    expect(control.button.innerHTML).toBe(expandIcon);
  });
});

describe("createFitTracker", () => {
  it("publishes the header height while fullscreen is on and clears it after", () => {
    document.body.innerHTML = '<header class="pz-header"><div id="js-global-nav"></div></header><div id="js-hook-game-wrapper"><div class="board"></div></div>';
    const nav = document.getElementById("js-global-nav")!;
    nav.getBoundingClientRect = () => ({ height: 56, top: 0, left: 0, right: 0, bottom: 56, width: 800, x: 0, y: 0, toJSON: () => ({}) });
    const tracker = createFitTracker({ target: ["#js-hook-game-wrapper"], fit: [".board"] });
    tracker.start();
    expect(document.documentElement.style.getPropertyValue("--nyte-fs-header")).toBe("56px");
    expect(document.documentElement.style.getPropertyValue("--nyte-fs-fit-top")).toBe("0px");
    tracker.stop();
    expect(document.documentElement.style.getPropertyValue("--nyte-fs-header")).toBe("");
  });
});
