import { DISCLAIMER, PRODUCT_NAME } from "../brand";
import { ensurePageStyle, findFirst, observeDom, waitForElement } from "../dom";
import { describeElement } from "../env";
import { createFullscreenControl, type FullscreenControl } from "../fullscreen";
import type { Settings } from "../settings";
import type { GameContext, GameModule, SettingsMount, ToolbarMount } from "../types";
import { registerHost } from "./hosts";
import { pageBlocks } from "./page-blocks";
import { createPanel } from "./panel";
import { UI_STYLES } from "./styles";
import type { UiBlock, UiDeps } from "./types";

export interface MountDeps {
  getSettings(): Settings;
  saveSettings(next: Settings): void;
  isDark(): boolean;
}

export interface MountedSettings {
  update(settings: Settings): void;
  dispose(): void;
}

const GEAR_SVG =
  '<svg viewBox="0 0 24 24" width="23" height="23" aria-hidden="true" focusable="false"><path fill="currentColor" d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6a.5.5 0 0 0 .1-.7l-2-3.4a.5.5 0 0 0-.6-.2l-2.5 1a7.3 7.3 0 0 0-1.7-1l-.4-2.6a.5.5 0 0 0-.5-.5h-4a.5.5 0 0 0-.5.5l-.4 2.6a7.3 7.3 0 0 0-1.7 1l-2.5-1a.5.5 0 0 0-.6.2l-2 3.4a.5.5 0 0 0 .1.7L4.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6a.5.5 0 0 0-.1.7l2 3.4c.1.2.4.3.6.2l2.5-1c.5.4 1.1.8 1.7 1l.4 2.6c0 .3.3.5.5.5h4c.3 0 .5-.2.5-.5l.4-2.6c.6-.2 1.2-.6 1.7-1l2.5 1c.2.1.5 0 .6-.2l2-3.4a.5.5 0 0 0-.1-.7L19.4 13zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>';

const TOOL_STYLE_ID = "nyte-tool-style";
const NATIVE_MENU_STYLE_ID = "nyte-native-menu-style";

/* Hover/focus/theme rules for our toolbar controls (gear, fullscreen): the same flat cell as NYT's
   crossword "Puzzle Settings Menu" button (light hover #f4f4f4; in dark mode the toolbar hover token
   from styles/theme.css). */
function ensureToolStyle(): void {
  ensurePageStyle(
    TOOL_STYLE_ID,
    [
      ".nyte-tool:hover{background-color:#f4f4f4!important}",
      // The crossword paints hover on any hovered descendant of a tool (`.xwd__tool--button :hover`),
      // which would put a light box behind our SVG; the icon never takes the pointer itself.
      ".nyte-tool>svg{pointer-events:none;background:transparent!important;color:inherit}",
      ".nyte-tool:focus-visible{outline:2px solid #2860d8!important;outline-offset:-2px!important}",
      'html[data-nyte-theme="dark"] .nyte-tool{color:var(--nyte-text,#d7dadc)!important}',
      'html[data-nyte-theme="dark"] .nyte-tool:hover{background-color:var(--nyte-surface-2,#272729)!important}',
    ].join(""),
  );
}

/**
 * Light-DOM control (so it can join the toolbar's flex layout): reset everything, then style inline.
 * Sized like NYT's crossword settings cell (45px, flat, 23px icon); `height:100%` fills a stretched
 * slot (Spelling Bee's .pz-toolbar-left) so the icon is vertically centred in any toolbar.
 */
function styleToolButton(button: HTMLElement): void {
  button.style.cssText =
    "all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;" +
    "width:45px;height:100%;min-height:45px;border-radius:0;color:inherit;flex:0 0 auto;";
}

/**
 * A mouse click on one of our toolbar buttons must not move keyboard focus away from the game (the
 * next key press should still reach the board, and a focused button would turn Space/Enter into
 * its own activation). Cancelling pointerdown's default keeps focus where it was; `click` still
 * fires, and keyboard activation (Tab, Enter) is unaffected. The buttons are deliberately NOT
 * registered as UI hosts: that list is for surfaces where the user types (the settings panels).
 */
function keepFocusOnGame(button: HTMLElement): void {
  button.addEventListener("pointerdown", (ev) => ev.preventDefault());
}

function createGearButton(module: GameModule, onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "nyte-tool nyte-gear";
  button.setAttribute("aria-label", `${PRODUCT_NAME} settings for ${module.name}`);
  button.setAttribute("aria-haspopup", "dialog");
  button.title = `${PRODUCT_NAME} settings`;
  button.innerHTML = GEAR_SVG;
  styleToolButton(button);
  button.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    onClick();
  });
  button.addEventListener("click", () => console.log(`[nyte:${module.id}] gear clicked; opening settings panel`), true);
  return button;
}

/** Gives `host` the same left/right inset as the host page's own settings row (`alignWith`). */
function alignHostWith(host: HTMLElement, alignWith: readonly string[] | undefined): void {
  if (!alignWith?.length) return;
  const row = findFirst<HTMLElement>(alignWith);
  if (!row) return;
  const r = row.getBoundingClientRect();
  const h = host.getBoundingClientRect();
  if (r.width === 0 || h.width === 0) return;
  const left = Math.max(0, Math.round(r.left - h.left));
  const right = Math.max(0, Math.round(h.right - r.right));
  if (left || right) host.style.padding = `0 ${right}px 0 ${left}px`;
}

/**
 * The element inside the native settings UI that receives our section: the first `closest()`
 * match of `candidates` from the marker (for the crossword, `[data-testid="modal-body"]`).
 * Deliberately no fallback to the marker's parent or the page: better not to mount than to
 * append settings to the main page content.
 */
export function resolveContainer(marker: Element, candidates: readonly string[]): Element | null {
  for (const selector of candidates) {
    try {
      const el = marker.closest(selector);
      if (el) return el;
    } catch {
      /* invalid selector */
    }
  }
  return null;
}

/** Mounts the in-page settings UI according to `module.settingsMount`, plus the fullscreen toggle if the module has one. */
export function mountSettings(module: GameModule, ctx: GameContext, deps: MountDeps): MountedSettings {
  const uiDeps: UiDeps = { get: deps.getSettings, save: deps.saveSettings };
  const disposers: Array<() => void> = [];
  let embedded: Array<{ root: HTMLElement; blocks: UiBlock[] }> = [];
  const mount: SettingsMount = module.settingsMount;
  const fullscreen: FullscreenControl | null = module.fullscreen ? createFullscreenControl(module, uiDeps) : null;
  if (fullscreen) {
    ensureToolStyle();
    disposers.push(() => fullscreen.button.remove());
  }
  const panel = mount.kind === "none" ? null : createPanel(module, uiDeps, deps.isDark);
  if (panel) disposers.push(() => panel.dispose());

  if (mount.kind === "none") {
    ctx.log.debug("settings mount: none (module renders its own control)");
  } else if (mount.kind === "native-menu") {
    ctx.log.debug("settings mount: native-menu; watching for NYT's settings modal", {
      marker: mount.marker,
      container: mount.container,
    });
    if (mount.css) ensurePageStyle(NATIVE_MENU_STYLE_ID, mount.css);
    let warnedNoContainer = false;
    // Wait for NYT's own settings modal (identified by a stable marker) and append our section once per opening.
    const stop = observeDom(() => {
      const marker = findFirst(mount.marker);
      if (!marker) return;
      const container = resolveContainer(marker, mount.container);
      if (!container) {
        if (!warnedNoContainer) {
          warnedNoContainer = true;
          ctx.log.warn("settings marker found but no modal container matched; not mounting", {
            marker: describeElement(marker),
            container: mount.container,
          });
        }
        return;
      }
      if (container.querySelector("[data-nyte-mounted]")) return;

      const host = document.createElement("div");
      host.setAttribute("data-nyte-mounted", module.id);
      // A full-width block row after the native settings (the content column is a flex column).
      host.style.cssText = "display:block;width:100%;box-sizing:border-box;flex:0 0 auto;clear:both;";
      const shadow = host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = UI_STYLES;
      const root = document.createElement("div");
      root.className = "nyte-ui nyte-embed";
      root.setAttribute("data-theme", deps.isDark() ? "dark" : "light");
      // The heading matches the host's own title (crossword: class pz-moment__title medium; Wordle:
      // the class list copied from its modal heading). The host's stylesheet cannot reach into our
      // shadow root, so the heading is a light-DOM child of the host, slotted into the top of our
      // section; it still inherits our text colour from .nyte-ui.
      const heading = document.createElement("h2");
      const hostHeading = mount.heading?.classFrom ? findFirst<HTMLElement>(mount.heading.classFrom) : null;
      heading.className = mount.heading?.className ?? hostHeading?.className ?? "";
      if (!heading.className) heading.style.cssText = "font-size:20px;font-weight:700;line-height:1.3;margin:0 0 8px;";
      heading.slot = "heading";
      heading.textContent = PRODUCT_NAME;
      // Light DOM, so our shadow stylesheet cannot reach it: breathing room above it is set inline.
      heading.style.marginTop = "12px";
      host.append(heading);
      const headingSlot = document.createElement("slot");
      headingSlot.name = "heading";
      // This section sits inside NYT's own settings panel, so say plainly whose it is.
      const disclaimer = document.createElement("p");
      disclaimer.className = "nyte-disclaimer";
      disclaimer.textContent = `Added by the ${PRODUCT_NAME} extension. Unofficial. ${DISCLAIMER}`;
      // No game heading: NYT's modal already says which puzzle this is.
      const blocks = pageBlocks(module, uiDeps);
      root.append(headingSlot, disclaimer, ...blocks.map((b) => b.el));
      // Keep typing inside our section away from the game, but let Escape reach NYT's modal so it
      // still closes (while recording a shortcut, the editor consumes Escape before this runs).
      root.addEventListener("keydown", (ev) => {
        if (ev.key !== "Escape") ev.stopPropagation();
      });
      shadow.append(style, root);
      container.append(host);
      alignHostWith(host, mount.alignWith);
      registerHost(host);
      embedded.push({ root, blocks });
      ctx.log.debug("settings section mounted inside NYT's settings modal", {
        marker: describeElement(marker),
        container: describeElement(container),
      });
    });
    disposers.push(stop);
  } else {
    ctx.log.debug("settings mount: gear; looking for a toolbar", { mount: mount.mount });
    void mountGear(module, mount, () => panel?.open(), ctx, disposers);
  }

  // The fullscreen toggle is always the last item at the far right of the host toolbar, on every
  // game (same layout everywhere): wrapped where the toolbar styles its own items (crossword).
  if (fullscreen) {
    const toolbar = module.fullscreen?.toolbar;
    if (toolbar) {
      let item: HTMLElement = fullscreen.button;
      if (toolbar.itemWrapper) {
        const wrapper = document.createElement(toolbar.itemWrapper.tag);
        wrapper.className = toolbar.itemWrapper.className;
        wrapper.append(fullscreen.button);
        item = wrapper;
        // Inside NYT's tool cell the <li>/<button> sizing is theirs; only the width and padding are ours.
        fullscreen.button.style.cssText = "width:45px;padding:0;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;";
      } else {
        styleToolButton(fullscreen.button);
        // Right-hand slots may be inline rows of text buttons (Spelling Bee): sit on their middle.
        fullscreen.button.style.cssText += "vertical-align:middle;margin-left:auto;";
      }
      keepFocusOnGame(fullscreen.button);
      disposers.push(() => item.remove());
      void mountInToolbar(item, toolbar, ctx, disposers, { floating: false, what: "fullscreen toggle" });
    } else {
      ctx.log.warn("module has a fullscreen target but no toolbar mount for the toggle; only the settings toggle is available");
    }
  }

  return {
    update(settings) {
      panel?.update(settings);
      fullscreen?.update(settings);
      embedded = embedded.filter((e) => e.root.isConnected);
      for (const e of embedded) {
        e.root.setAttribute("data-theme", deps.isDark() ? "dark" : "light");
        for (const block of e.blocks) block.update(settings);
      }
    },
    dispose() {
      for (const d of disposers) d();
    },
  };
}

async function mountGear(
  module: GameModule,
  mount: Extract<SettingsMount, { kind: "gear" }>,
  onOpen: () => void,
  ctx: GameContext,
  disposers: Array<() => void>,
): Promise<void> {
  ensureToolStyle();
  const gear = createGearButton(module, onOpen);
  // A group around the gear (room for future left-hand controls) so the toolbar sees one item.
  // `margin-right:auto` keeps it at the far left of a right-aligned row (Connections);
  // `align-self:stretch` fills the row's height so the cell is centred.
  const group = document.createElement("span");
  group.className = "nyte-toolbar-controls";
  group.style.cssText = "display:inline-flex;align-items:stretch;align-self:stretch;min-height:45px;flex:0 0 auto;margin:0 auto 0 0;";
  group.append(gear);
  keepFocusOnGame(gear);
  disposers.push(() => group.remove());
  await mountInToolbar(group, mount, ctx, disposers, { floating: true, what: "gear" });
}

/**
 * Puts `item` into the first matching toolbar candidate and keeps it there (NYT renders the real
 * toolbar row later than the server-rendered fallback, and React re-renders can drop our element).
 * With `floating`, a fixed top-left fallback is used when no toolbar appears within 10 s.
 */
async function mountInToolbar(
  item: HTMLElement,
  mount: Pick<ToolbarMount, "mount" | "placement">,
  ctx: GameContext,
  disposers: Array<() => void>,
  opts: { floating: boolean; what: string },
): Promise<void> {
  const place = (target: HTMLElement) => {
    if (mount.placement === "start") target.prepend(item);
    else target.append(item);
  };

  const target = mount.mount.length
    ? await waitForElement<HTMLElement>(mount.mount, { timeout: 10_000 }).catch(() => null)
    : null;
  if (target) {
    place(target);
    ctx.log.debug(`${opts.what} mounted in`, describeElement(target));
  } else if (opts.floating) {
    item.style.cssText += "position:fixed;top:72px;left:16px;z-index:2147483646;height:45px;background:rgba(127,127,127,.25);";
    document.body.append(item);
    if (mount.mount.length) ctx.log.warn(`no toolbar matched within 10 s; using a floating ${opts.what} (top-left)`, mount.mount);
    else ctx.log.debug(`floating ${opts.what} (this page has no toolbar mount)`);
  } else {
    ctx.log.warn(`no toolbar matched within 10 s; ${opts.what} not mounted`, mount.mount);
  }

  // Writes only when the parent actually changes (see keepGearPlaced).
  const stop = observeDom(() => keepGearPlaced(item, mount.mount, place));
  disposers.push(stop);
}

/** Moves `button` into the first matching mount candidate unless it is already there. Returns true if it moved. */
export function keepGearPlaced(
  button: HTMLElement,
  candidates: readonly string[],
  place: (target: HTMLElement) => void,
): boolean {
  const best = findFirst<HTMLElement>(candidates);
  if (!best) return false;
  if (button.isConnected && button.parentElement === best) return false;
  place(best);
  return true;
}
