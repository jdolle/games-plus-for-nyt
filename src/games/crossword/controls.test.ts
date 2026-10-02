// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isSyntheticKey } from "../../core/native-keys";
import { silentLogger } from "../../core/log";
import { mergeSettings } from "../../core/settings";
import type { GameContext } from "../../core/types";
import { boardHasKeys, controls } from "./controls";
import { crossword } from "./index";

const ctx = (): GameContext => ({ module: crossword, settings: mergeSettings({}), log: silentLogger, root: document });
const keyOn = (target: Element, code = "Tab") => {
  const ev = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true });
  Object.defineProperty(ev, "target", { value: target });
  return ev;
};

describe("crossword native controls", () => {
  it("guards on NYT's board having the key: inside <main>, not a widget, not the rebus input, no modal", () => {
    document.body.innerHTML = `
      <main class="xwd__franklin" tabindex="0">
        <ul class="xwd__toolbar--tools"><li class="xwd__tool--button"><button id="tool">Rebus</button></li></ul>
        <g id="cell" tabindex="0"></g>
        <div class="xwd__rebus"><input id="rebus-input" name="rebus"></div>
      </main>
      <aside id="outside" tabindex="0"></aside>`;
    const main = document.querySelector("main")!;
    expect(boardHasKeys(ctx(), keyOn(main))).toBe(true);
    expect(boardHasKeys(ctx(), keyOn(document.getElementById("cell")!))).toBe(true);
    expect(boardHasKeys(ctx(), keyOn(document.getElementById("tool")!))).toBe(false);
    expect(boardHasKeys(ctx(), keyOn(document.getElementById("rebus-input")!))).toBe(false);
    expect(boardHasKeys(ctx(), keyOn(document.getElementById("outside")!))).toBe(false);
    document.body.insertAdjacentHTML("beforeend", '<div data-testid="modal-body"></div>');
    expect(boardHasKeys(ctx(), keyOn(main))).toBe(false);
  });

  it("re-creates a control by dispatching its native key on <main>", () => {
    document.body.innerHTML = '<main class="xwd__franklin" tabindex="0"></main>';
    const main = document.querySelector("main")!;
    const seen: KeyboardEvent[] = [];
    main.addEventListener("keydown", (ev) => seen.push(ev));
    const previousClue = controls.find((c) => c.id === "crossword.control.previousClue")!;
    previousClue.run(ctx(), new KeyboardEvent("keydown", { code: "KeyN", altKey: true }));
    expect(seen).toHaveLength(1);
    expect(seen[0]!.key).toBe("Tab");
    expect(seen[0]!.shiftKey).toBe(true);
    expect(isSyntheticKey(seen[0]!)).toBe(true);
  });

  it("lists the pencil shortcut with the same board guard, Shift as its default and a Behavior choice", () => {
    const pencil = crossword.shortcuts.find((s) => s.id === "crossword.togglePencil")!;
    expect(pencil.title).toBe("Pencil mode");
    expect(pencil.defaultCombo).toBe("Shift");
    expect(pencil.when).toBe(boardHasKeys);
    expect(pencil.option?.choices.map((c) => c.value)).toEqual(["hold", "toggle"]);
    expect(pencil.behavior?.({ module: crossword, settings: mergeSettings({}), log: silentLogger, root: document })).toBe("hold");
  });
});
