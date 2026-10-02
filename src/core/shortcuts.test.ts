// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { silentLogger } from "./log";
import { defineNativeControls, dispatchNativeKey, isSyntheticKey } from "./native-keys";
import { parseCombo } from "./keys";
import { setBinding } from "./rebind";
import { mergeSettings, type Settings } from "./settings";
import { createShortcutDispatcher, heldBack, type ShortcutDispatcher } from "./shortcuts";
import type { GameContext, GameModule } from "./types";

function press(target: EventTarget, code: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const ev = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(ev);
  return ev;
}

describe("heldBack", () => {
  const main = document.createElement("main");
  main.tabIndex = 0;
  const input = document.createElement("input");
  input.type = "text";
  const button = document.createElement("button");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";

  it("lets Alt/Ctrl/Meta chords fire anywhere", () => {
    expect(heldBack(parseCombo("Alt+KeyS")!, input)).toBe(false);
    expect(heldBack(parseCombo("Ctrl+Space")!, button)).toBe(false);
  });
  it("never types over a text field", () => {
    expect(heldBack(parseCombo("Space")!, input)).toBe(true);
    expect(heldBack(parseCombo("Shift+Enter")!, input)).toBe(true);
    expect(heldBack(parseCombo("Digit1")!, input)).toBe(true);
  });
  it("leaves a focused widget its own Space / Enter / arrows but lets Shift chords through", () => {
    expect(heldBack(parseCombo("Space")!, button)).toBe(true);
    expect(heldBack(parseCombo("Enter")!, checkbox)).toBe(true);
    expect(heldBack(parseCombo("ArrowDown")!, button)).toBe(true);
    expect(heldBack(parseCombo("Shift+Enter")!, checkbox)).toBe(false);
    expect(heldBack(parseCombo("Digit1")!, button)).toBe(false);
  });
  it("fires on the board, the clue list and the body", () => {
    expect(heldBack(parseCombo("Space")!, main)).toBe(false);
    expect(heldBack(parseCombo("Tab")!, document.body)).toBe(false);
    expect(heldBack(parseCombo("Enter")!, null)).toBe(false);
  });
});

describe("dispatcher with native controls", () => {
  let dispatcher: ShortcutDispatcher | null = null;
  afterEach(() => {
    dispatcher?.uninstall();
    dispatcher = null;
    document.body.innerHTML = "";
  });

  function setup(settings: Settings = mergeSettings({})) {
    document.body.innerHTML = '<main id="board" tabindex="0"></main><input id="text" type="text"><button id="btn"></button>';
    const board = document.getElementById("board")!;
    const fired: string[] = [];
    const synthetic: KeyboardEvent[] = [];
    board.addEventListener("keydown", (ev) => {
      if (isSyntheticKey(ev)) synthetic.push(ev);
    });
    const controls = defineNativeControls(
      [
        { id: "demo.control.next", title: "Next", key: "Tab", aliases: ["Enter"] },
        { id: "demo.control.space", title: "Spacebar", key: "Space" },
      ],
      { when: (_ctx, ev) => ev.target !== document.getElementById("text"), target: () => board },
    );
    const module: GameModule = {
      id: "demo",
      name: "Demo",
      matches: [],
      selectors: {},
      darkMode: "css",
      shortcuts: [
        { id: "demo.pencil", title: "Pencil", defaultCombo: "Space", run: () => void fired.push("pencil") },
        { id: "demo.alt", title: "Alt thing", defaultCombo: "Alt+KeyJ", run: () => void fired.push("alt") },
      ],
      controls,
      options: [],
      settingsMount: { kind: "none" },
    };
    const ctx: GameContext = { module, settings, log: silentLogger, root: document };
    dispatcher = createShortcutDispatcher(module, silentLogger);
    dispatcher.install(ctx);
    dispatcher.setBindings(settings);
    return { board, fired, synthetic, module, ctx };
  }

  it("leaves a control at its native key untouched and runs a shortcut that takes the same key first", () => {
    const { board, fired, synthetic } = setup();
    expect(press(board, "Tab").defaultPrevented).toBe(false);
    expect(synthetic).toHaveLength(0);
    expect(press(board, "Space").defaultPrevented).toBe(true); // the Space shortcut shadows the Spacebar control
    expect(fired).toEqual(["pencil"]);
  });

  it("re-creates the native action from the new key and swallows the native key and its aliases", () => {
    const settings = setBinding(mergeSettings({}), "demo", "demo.control.next", parseCombo("Alt+KeyN"));
    const { board, synthetic } = setup(settings);
    const altN = press(board, "KeyN", { altKey: true });
    expect(altN.defaultPrevented).toBe(true);
    expect(synthetic).toHaveLength(1);
    expect(synthetic[0]!.key).toBe("Tab");
    expect(synthetic[0]!.altKey).toBe(false);
    expect(press(board, "Tab").defaultPrevented).toBe(true);
    expect(press(board, "Enter").defaultPrevented).toBe(true);
    expect(synthetic).toHaveLength(1); // swallows re-create nothing
    expect(press(board, "Tab", { shiftKey: true }).defaultPrevented).toBe(false); // a different combo
  });

  it("an unbound control just switches the native key off, and `when` scopes the swallow", () => {
    const settings = setBinding(mergeSettings({}), "demo", "demo.control.next", null);
    const { board } = setup(settings);
    expect(press(board, "Tab").defaultPrevented).toBe(true);
    expect(press(document.getElementById("text")!, "Tab").defaultPrevented).toBe(false); // when() false there
  });

  it("ignores its own synthetic keys", () => {
    const settings = setBinding(mergeSettings({}), "demo", "demo.control.next", null);
    const { board } = setup(settings);
    let seen = 0;
    board.addEventListener("keydown", (ev) => {
      if (isSyntheticKey(ev)) seen++;
    });
    dispatchNativeKey(board, parseCombo("Tab")!);
    expect(seen).toBe(1); // reached the page listener, not swallowed
  });

  it("runs a shortcut once for a held key but keeps cancelling repeats; controls repeat", () => {
    const settings = setBinding(mergeSettings({}), "demo", "demo.control.next", parseCombo("Alt+KeyN"));
    const { board, fired, synthetic } = setup(settings);
    press(board, "Space");
    expect(press(board, "Space", { repeat: true }).defaultPrevented).toBe(true);
    expect(fired).toEqual(["pencil"]);
    press(board, "KeyN", { altKey: true });
    press(board, "KeyN", { altKey: true, repeat: true });
    expect(synthetic).toHaveLength(2);
    expect(synthetic[1]!.repeat).toBe(true);
  });

  it("holds a bare key back in a text field or on a widget (and lets later entries look)", () => {
    const { fired } = setup();
    expect(press(document.getElementById("text")!, "Space").defaultPrevented).toBe(false);
    expect(press(document.getElementById("btn")!, "Space").defaultPrevented).toBe(false);
    expect(fired).toEqual([]);
    expect(press(document.getElementById("text")!, "KeyJ", { altKey: true }).defaultPrevented).toBe(true);
    expect(fired).toEqual(["alt"]);
  });

  it("does nothing while disabled or after uninstall", () => {
    const settings = setBinding(mergeSettings({}), "demo", "demo.control.next", null);
    const { board } = setup(settings);
    dispatcher!.setEnabled(false);
    expect(press(board, "Tab").defaultPrevented).toBe(false);
    expect(press(board, "Space").defaultPrevented).toBe(false);
    dispatcher!.setEnabled(true);
    dispatcher!.uninstall();
    expect(press(board, "Tab").defaultPrevented).toBe(false);
  });
});

describe("mode shortcuts on a lone modifier (hold / toggle)", () => {
  let dispatcher: ShortcutDispatcher | null = null;
  afterEach(() => {
    dispatcher?.uninstall();
    dispatcher = null;
    document.body.innerHTML = "";
  });

  function setup(behavior: "hold" | "toggle") {
    document.body.innerHTML = '<main id="board" tabindex="0"></main>';
    const board = document.getElementById("board")!;
    const log: string[] = [];
    const module: GameModule = {
      id: "demo",
      name: "Demo",
      matches: [],
      selectors: {},
      darkMode: "css",
      shortcuts: [
        {
          id: "demo.pencil",
          title: "Pencil mode",
          defaultCombo: "Shift",
          behavior: () => behavior,
          run: () => void log.push("run"),
          release: () => void log.push("release"),
        },
      ],
      options: [],
      settingsMount: { kind: "none" },
    };
    const ctx: GameContext = { module, settings: mergeSettings({}), log: silentLogger, root: document };
    dispatcher = createShortcutDispatcher(module, silentLogger);
    dispatcher.install(ctx);
    dispatcher.setBindings(ctx.settings);
    const down = (code: string, init: KeyboardEventInit = {}) => press(board, code, { shiftKey: code.startsWith("Shift"), ...init });
    const up = (code: string) => board.dispatchEvent(new KeyboardEvent("keyup", { code, bubbles: true, cancelable: true }));
    return { board, log, down, up };
  }

  it("hold: runs when Shift goes down and releases when it comes up, never cancelling the modifier", () => {
    const { log, down, up } = setup("hold");
    expect(down("ShiftLeft").defaultPrevented).toBe(false);
    down("ShiftLeft", { repeat: true });
    expect(log).toEqual(["run"]);
    up("ShiftLeft");
    expect(log).toEqual(["run", "release"]);
  });

  it("hold: a blur releases too", () => {
    const { log, down } = setup("hold");
    down("ShiftRight");
    window.dispatchEvent(new Event("blur"));
    expect(log).toEqual(["run", "release"]);
  });

  it("toggle: fires on a clean press-and-release only, so Shift chords are left alone", () => {
    const { log, down, up } = setup("toggle");
    down("ShiftLeft");
    expect(log).toEqual([]);
    up("ShiftLeft");
    expect(log).toEqual(["run"]);
    down("ShiftLeft");
    down("Tab", { shiftKey: true }); // a chord
    up("Tab");
    up("ShiftLeft");
    expect(log).toEqual(["run"]);
  });
});
