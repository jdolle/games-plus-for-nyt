import { findFirst, observeDom } from "./dom";
import { shell } from "./shell";
import type { Settings } from "./settings";
import type { FullscreenConfig, GameModule } from "./types";

/**
 * "Fullscreen mode": the element holding the toolbar and the game (#js-hook-game-wrapper on the
 * shared game shell) is fixed over the whole window. A global setting (`settings.fullscreen`), so
 * it is one toggle in the popup and the in-page settings, beside the Theme, as well as the toolbar
 * button on every game that declares a `fullscreen` config.
 */

/** Gate for every fullscreen rule: html[data-nyte-fullscreen="on"]. */
export const FULLSCREEN_ATTR = "data-nyte-fullscreen";
const STYLE_ID = "nyte-fullscreen-style";
/** Offset of the "fit" element from the top of the wrapper, kept up to date by the fit tracker. */
const FIT_TOP_VAR = "--nyte-fs-fit-top";
/** Height of NYT's sticky header, which stays visible above the fullscreen game (its nav menu must remain reachable). */
const HEADER_VAR = "--nyte-fs-header";
const FIT_BOTTOM_GAP = 12;

/** Whether this page should be fullscreen: the global setting, on a module that supports it. */
export function isFullscreenOn(settings: Settings, module: GameModule): boolean {
  return module.fullscreen !== undefined && settings.fullscreen;
}

export function setFullscreen(settings: Settings, on: boolean): Settings {
  return settings.fullscreen === on ? settings : { ...settings, fullscreen: on };
}

export function toggleFullscreen(settings: Settings): Settings {
  return setFullscreen(settings, !settings.fullscreen);
}

/**
 * Page-level rules, inert until html[data-nyte-fullscreen="on"]. The wrapper fills the viewport
 * BELOW NYT's sticky header (whose measured height is --nyte-fs-header), so the Games navigation and
 * its menu button (#js-nav-burger) stay visible and usable; the wrapper's z-index (99) sits under the
 * header (100) so the nav drawer opens over the game, and above the rest of the page. NYT's modal,
 * toast and moment portals live inside the wrapper, so they keep stacking above the game. The page
 * behind stops scrolling; the wrapper scrolls its own overflow (e.g. the editorial content after the
 * game, which is never hidden).
 */
export function fullscreenCss(config: FullscreenConfig): string {
  const gate = `html[${FULLSCREEN_ATTR}="on"]`;
  const rules = [
    `${gate}, ${gate} body { overflow: hidden !important; }`,
    `${gate} :is(${config.target.join(", ")}) {` +
      ` position: fixed !important; top: var(${HEADER_VAR}, 0px) !important; left: 0 !important; right: 0 !important; bottom: 0 !important;` +
      ` width: auto !important; max-width: 100% !important; height: calc(100dvh - var(${HEADER_VAR}, 0px)) !important; box-sizing: border-box !important;` +
      " margin: 0 !important; padding: 0 !important; z-index: 99;" +
      // Never a horizontal scrollbar: the wrapper is exactly the viewport wide (left/right, not 100vw, so
      // a scrollbar gutter can't push it over) and anything a few pixels wider is clipped.
      " overflow-x: hidden; overflow-y: auto; background-color: var(--bg-page, #ffffff); }",
  ];
  // The game screen inside the wrapper never grows its own scrollbars; the wrapper is the one scroller.
  rules.push(`${gate} :is(${shell.gameScreen.join(", ")}) { overflow: hidden !important; }`);
  if (config.fit?.length) {
    rules.push(
      `${gate} :is(${config.fit.join(", ")}) { max-height: none !important; box-sizing: border-box !important;` +
        ` height: calc(100dvh - var(${HEADER_VAR}, 0px) - var(${FIT_TOP_VAR}, 0px) - ${FIT_BOTTOM_GAP}px) !important; }`,
    );
  }
  if (config.css) rules.push(config.css);
  return rules.join("\n");
}

export function ensureFullscreenStyle(config: FullscreenConfig, doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = fullscreenCss(config);
  (doc.head ?? doc.documentElement).append(style);
}

/** Sets or clears the gate on <html>. Writes only when the value changes; returns whether it did. */
export function applyFullscreen(on: boolean, doc: Document = document): boolean {
  const html = doc.documentElement;
  const current = html.getAttribute(FULLSCREEN_ATTR) === "on";
  if (current === on) return false;
  if (on) html.setAttribute(FULLSCREEN_ATTR, "on");
  else html.removeAttribute(FULLSCREEN_ATTR);
  return true;
}

export interface FitTracker {
  start(): void;
  stop(): void;
}

/**
 * While fullscreen is on, keeps two custom properties on <html> up to date: --nyte-fs-header, the
 * height of NYT's sticky header (the game fills the window below it), and — for games with a `fit`
 * element such as the crossword's board-and-clues row, which NYT caps at 660px — --nyte-fs-fit-top,
 * that element's distance from the top of the wrapper, so the CSS above can give it the remaining
 * height. Re-measured after DOM changes and window resizes; a property is written only when its
 * rounded value changes.
 */
export function createFitTracker(config: FullscreenConfig, doc: Document = document): FitTracker {
  let stopObserving: (() => void) | null = null;
  const setVar = (name: string, px: number): void => {
    const value = `${Math.max(0, Math.round(px))}px`;
    if (doc.documentElement.style.getPropertyValue(name) !== value) doc.documentElement.style.setProperty(name, value);
  };
  const measure = (): void => {
    // Where the Games nav (#js-global-nav) ends on screen: its bottom edge covers anything stacked
    // above it in the sticky header as well as its own height.
    const header = findFirst<HTMLElement>(shell.header, doc);
    const rect = header?.getBoundingClientRect();
    setVar(HEADER_VAR, rect ? Math.max(rect.bottom, rect.height) : 0);
    const wrapper = findFirst<HTMLElement>(config.target, doc);
    const el = config.fit ? findFirst<HTMLElement>(config.fit, doc) : null;
    if (!wrapper || !el) return;
    setVar(FIT_TOP_VAR, el.getBoundingClientRect().top - wrapper.getBoundingClientRect().top + wrapper.scrollTop);
  };
  return {
    start() {
      if (stopObserving) return;
      const stopDom = observeDom(measure, doc.documentElement);
      const view = doc.defaultView;
      view?.addEventListener("resize", measure);
      stopObserving = () => {
        stopDom();
        view?.removeEventListener("resize", measure);
      };
    },
    stop() {
      stopObserving?.();
      stopObserving = null;
      doc.documentElement.style.removeProperty(FIT_TOP_VAR);
      doc.documentElement.style.removeProperty(HEADER_VAR);
    },
  };
}

/* Our own icons (currentColor): corner brackets pointing out = enter fullscreen, pointing in = exit. */
const EXPAND_SVG =
  '<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" focusable="false"><path fill="currentColor" d="M3 3h7v2H5v5H3V3zm11 0h7v7h-2V5h-5V3zM3 14h2v5h5v2H3v-7zm16 0h2v7h-7v-2h5v-5z"/></svg>';
const COMPRESS_SVG =
  '<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" focusable="false"><path fill="currentColor" d="M10 3v7H3V8h5V3h2zm4 0h2v5h5v2h-7V3zM3 14h7v7H8v-5H3v-2zm11 0h7v2h-5v5h-2v-7z"/></svg>';

export interface FullscreenControl {
  button: HTMLButtonElement;
  update(settings: Settings): void;
}

export interface FullscreenDeps {
  get(): Settings;
  save(next: Settings): void;
}

/** The toolbar toggle: expand icon when the game is normal size, compress icon while fullscreen. */
export function createFullscreenControl(module: GameModule, deps: FullscreenDeps): FullscreenControl {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nyte-tool nyte-fullscreen";
  button.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    deps.save(toggleFullscreen(deps.get()));
  });
  const update = (settings: Settings): void => {
    const on = isFullscreenOn(settings, module);
    button.setAttribute("aria-pressed", String(on));
    button.setAttribute("aria-label", on ? "Exit fullscreen game" : "Fullscreen game");
    button.title = on ? "Exit fullscreen" : "Fullscreen";
    const svg = on ? COMPRESS_SVG : EXPAND_SVG;
    if (button.innerHTML !== svg) button.innerHTML = svg;
  };
  update(deps.get());
  return { button, update };
}
