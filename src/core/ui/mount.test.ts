// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { keepGearPlaced, resolveContainer } from "./mount";

const crosswordContainers = [
  '[data-testid="modal-body"] > article.xwd__modal--content',
  "article.xwd__modal--content",
  '[data-testid="modal-body"]',
  '[role="dialog"]',
];

describe("resolveContainer", () => {
  it("returns the settings modal's content column (a row after the settings), not the modal body", () => {
    document.body.innerHTML = `
      <div id="portal-game-modals"><div data-testid="modal-body" tabindex="0">
        <article class="xwd__modal--content"><form><input id="skipFilled" type="checkbox"></form></article>
      </div></div>`;
    const marker = document.getElementById("skipFilled")!;
    const container = resolveContainer(marker, crosswordContainers);
    expect(container?.tagName).toBe("ARTICLE");
    expect(container?.parentElement?.getAttribute("data-testid")).toBe("modal-body");
  });

  it("falls back to the modal body when the content article is missing", () => {
    document.body.innerHTML = `<div data-testid="modal-body"><div><input id="skipFilled"></div></div>`;
    const marker = document.getElementById("skipFilled")!;
    expect(resolveContainer(marker, crosswordContainers)?.getAttribute("data-testid")).toBe("modal-body");
  });

  it("never falls back to the marker's parent or the page content", () => {
    document.body.innerHTML = `<main><section><form><input id="skipFilled"></form></section></main>`;
    const marker = document.getElementById("skipFilled")!;
    expect(resolveContainer(marker, crosswordContainers)).toBeNull();
  });

  it("resolves Wordle's settings dialog to its content column", () => {
    document.body.innerHTML = `
      <dialog open id="settings-dialog" data-testid="modal-overlay">
        <div class="Modal-module_content__abc Modal-module_testExtraWidth__x">
          <div class="Modal-module_topWrapper__t"><h2 class="Modal-module_heading__h">Settings</h2></div>
          <div class="Settings-module_setting__s"><div id="Hard Mode"><button role="switch" aria-label="Hard Mode"></button></div></div>
        </div>
      </dialog>`;
    const marker = document.querySelector('#settings-dialog button[role="switch"]')!;
    const container = resolveContainer(marker, ['[class*="Modal-module_content"]', "#settings-dialog > div", "#settings-dialog"]);
    expect(container?.className).toContain("Modal-module_content");
  });

  it("skips invalid selectors", () => {
    document.body.innerHTML = `<div role="dialog"><input id="m"></div>`;
    const marker = document.getElementById("m")!;
    expect(resolveContainer(marker, ["[[bad", '[role="dialog"]'])?.getAttribute("role")).toBe("dialog");
  });
});

describe("keepGearPlaced", () => {
  const candidates = ['section[data-testid="toolbar"]', ".pz-toolbar-left", "#portal-game-toolbar"];
  const place = (target: HTMLElement) => target.prepend(gear);
  let gear: HTMLButtonElement;

  it("uses the fallback row when only the portal exists, then moves to the real toolbar once it renders", () => {
    document.body.innerHTML = `<div class="pz-game-toolbar"><div id="portal-game-toolbar"></div></div><main id="game"></main>`;
    gear = document.createElement("button");
    expect(keepGearPlaced(gear, candidates, place)).toBe(true);
    expect(gear.parentElement?.id).toBe("portal-game-toolbar");

    document.getElementById("game")!.innerHTML = `<header><section data-testid="toolbar"><button id="help-button"></button></section></header>`;
    expect(keepGearPlaced(gear, candidates, place)).toBe(true);
    const section = document.querySelector('section[data-testid="toolbar"]')!;
    expect(gear.parentElement).toBe(section);
    expect(section.firstElementChild).toBe(gear);
    expect(document.getElementById("portal-game-toolbar")!.contains(gear)).toBe(false);
  });

  it("does not touch the DOM when the gear is already in the best target", () => {
    document.body.innerHTML = `<section data-testid="toolbar"><button id="x"></button></section><div id="portal-game-toolbar"></div>`;
    gear = document.createElement("button");
    keepGearPlaced(gear, candidates, place);
    const before = document.body.innerHTML;
    expect(keepGearPlaced(gear, candidates, place)).toBe(false);
    expect(document.body.innerHTML).toBe(before);
  });

  it("re-attaches a gear React dropped from the toolbar", () => {
    document.body.innerHTML = `<section data-testid="toolbar"></section>`;
    gear = document.createElement("button");
    keepGearPlaced(gear, candidates, place);
    gear.remove();
    expect(keepGearPlaced(gear, candidates, place)).toBe(true);
    expect(gear.parentElement?.getAttribute("data-testid")).toBe("toolbar");
  });

  it("leaves a floating gear alone when no candidate matches", () => {
    document.body.innerHTML = `<main></main>`;
    gear = document.createElement("button");
    document.body.append(gear);
    expect(keepGearPlaced(gear, candidates, place)).toBe(false);
    expect(gear.parentElement).toBe(document.body);
  });
});
