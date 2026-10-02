import { describe, expect, it } from "vitest";
import { parseCombo } from "./keys";
import { reservedCombos } from "./platform";
import { bindingState, claimedCombos, findConflicts, isAtNative, recordKeydown, resetGameBindings, setBinding, takeBinding } from "./rebind";
import { DEFAULT_SETTINGS, mergeSettings, resolveShortcutCombo, type Settings } from "./settings";
import type { ControlDefinition, ShortcutDefinition, ShortcutScope } from "./types";

const noop = () => undefined;
const pencil: ShortcutDefinition = { id: "x.pencil", title: "Pencil", defaultCombo: "Alt+KeyP", run: noop };
const rebus: ShortcutDefinition = { id: "x.rebus", title: "Rebus", defaultCombo: "Alt+KeyR", run: noop };
const shortcuts = [pencil, rebus];
const scope: ShortcutScope = { id: "x", name: "X", shortcuts };
const nextClue: ControlDefinition = {
  id: "x.control.next",
  title: "Next clue",
  defaultCombo: "Tab",
  aliases: ["Enter"],
  native: true,
  when: () => true,
  run: noop,
};
const rebusKey: ControlDefinition = { id: "x.control.rebus", title: "Rebus key", defaultCombo: "Escape", native: true, when: () => true, run: noop };
const controls: ShortcutScope = { id: "x", name: "X controls", shortcuts: [nextClue, rebusKey] };
const globalScope: ShortcutScope = {
  id: "global",
  name: "Global",
  shortcuts: [{ id: "global.fs", title: "Fullscreen", defaultCombo: "Alt+KeyF", run: noop }],
};
const page = [globalScope, scope, controls];
const base: Settings = mergeSettings(DEFAULT_SETTINGS);

function key(code: string, mods: Partial<Record<"altKey" | "ctrlKey" | "shiftKey" | "metaKey", boolean>> = {}) {
  return { code, altKey: false, ctrlKey: false, shiftKey: false, metaKey: false, ...mods };
}

describe("recordKeydown", () => {
  it("ignores modifier-only presses", () => {
    expect(recordKeydown(key("AltLeft", { altKey: true }))).toEqual({ kind: "ignored" });
    expect(recordKeydown(key("ShiftRight", { shiftKey: true }))).toEqual({ kind: "ignored" });
  });
  it("cancels on bare Escape and clears on bare Backspace", () => {
    expect(recordKeydown(key("Escape"))).toEqual({ kind: "cancelled" });
    expect(recordKeydown(key("Backspace"))).toEqual({ kind: "cleared" });
    expect(recordKeydown(key("Delete"))).toEqual({ kind: "cleared" });
  });
  it("records Alt+P", () => {
    expect(recordKeydown(key("KeyP", { altKey: true }))).toEqual({
      kind: "recorded",
      combo: { code: "KeyP", alt: true, ctrl: false, shift: false, meta: false },
    });
  });
  it("records the row's own default even when it is Escape, Backspace or Delete (reset)", () => {
    expect(recordKeydown(key("Escape"), { defaultCombo: "Escape" }).kind).toBe("recorded");
    expect(recordKeydown(key("Backspace"), { defaultCombo: "Backspace" }).kind).toBe("recorded");
    expect(recordKeydown(key("Delete"), { defaultCombo: "Delete" }).kind).toBe("recorded");
    expect(recordKeydown(key("Escape"), { defaultCombo: "Tab" }).kind).toBe("cancelled");
    expect(recordKeydown(key("Backspace"), { defaultCombo: "Tab" }).kind).toBe("cleared");
  });
});

describe("findConflicts / takeBinding", () => {
  const ids = (takers: ReturnType<typeof findConflicts>) => takers.map((t) => t.def.id);

  it("finds every other row holding a key, across scopes, including unrebound controls' natives and aliases", () => {
    expect(ids(findConflicts(base, [scope], parseCombo("Alt+KeyR")!, pencil.id))).toEqual([rebus.id]);
    expect(ids(findConflicts(base, [scope], parseCombo("Alt+KeyR")!, rebus.id))).toEqual([]);
    expect(ids(findConflicts(base, page, parseCombo("Alt+KeyF")!, pencil.id))).toEqual(["global.fs"]);
    expect(ids(findConflicts(base, page, parseCombo("Tab")!, pencil.id))).toEqual([nextClue.id]);
    expect(ids(findConflicts(base, page, parseCombo("Enter")!, pencil.id))).toEqual([nextClue.id]); // alias
  });

  it("takeBinding moves the key: the new row gets it and every previous holder is unset", () => {
    // Pause bound to Space, then Rebus bound to Space → Rebus = Space, Pause unbound.
    const withPause = setBinding(base, "x", pencil.id, parseCombo("Space"));
    const { settings, unset } = takeBinding(withPause, page, "x", rebus, parseCombo("Space")!);
    expect(ids(unset)).toEqual([pencil.id]);
    expect(resolveShortcutCombo(settings, "x", rebus)).toEqual(parseCombo("Space"));
    expect(resolveShortcutCombo(settings, "x", pencil)).toBeNull();
  });

  it("taking a control's native key unbinds that control, and a rebound control frees its native key", () => {
    const took = takeBinding(base, page, "x", pencil, parseCombo("Tab")!);
    expect(ids(took.unset)).toEqual([nextClue.id]);
    expect(resolveShortcutCombo(took.settings, "x", nextClue)).toBeNull();

    const moved = setBinding(base, "x", nextClue.id, parseCombo("Alt+KeyN"));
    expect(isAtNative(moved, "x", nextClue)).toBe(false);
    expect(claimedCombos(moved, "x", nextClue)).toEqual([parseCombo("Alt+KeyN")]);
    expect(findConflicts(moved, page, parseCombo("Tab")!, pencil.id)).toEqual([]);
    expect(ids(findConflicts(moved, page, parseCombo("Alt+KeyN")!, pencil.id))).toEqual([nextClue.id]);
  });
});

describe("setBinding / bindingState / resetGameBindings", () => {
  it("binds, disables, resets", () => {
    const custom = setBinding(base, "x", pencil.id, parseCombo("Alt+Shift+KeyP"));
    expect(bindingState(custom, "x", pencil)).toBe("custom");
    expect(resolveShortcutCombo(custom, "x", pencil)).toEqual(parseCombo("Alt+Shift+KeyP"));

    const disabled = setBinding(custom, "x", pencil.id, null);
    expect(bindingState(disabled, "x", pencil)).toBe("disabled");
    expect(resolveShortcutCombo(disabled, "x", pencil)).toBeNull();

    const reset = setBinding(disabled, "x", pencil.id, undefined);
    expect(bindingState(reset, "x", pencil)).toBe("default");
    expect(reset.games.x?.shortcuts).toEqual({});
    expect(base.games.x).toBeUndefined(); // immutable
  });
  it("treats an override equal to the default as default", () => {
    const same = setBinding(base, "x", pencil.id, parseCombo("Alt+KeyP"));
    expect(bindingState(same, "x", pencil)).toBe("default");
  });
  it("resets every binding of a game", () => {
    const s = setBinding(setBinding(base, "x", pencil.id, null), "x", rebus.id, parseCombo("Alt+KeyZ"));
    expect(resetGameBindings(s, "x").games.x?.shortcuts).toEqual({});
  });
});

describe("reservedCombos", () => {
  it("is platform specific", () => {
    expect(reservedCombos("windows")).toContain("Alt+KeyF");
    expect(reservedCombos("mac")).not.toContain("Alt+KeyF");
    expect(reservedCombos("mac")).toContain("Meta+KeyQ");
  });
});
