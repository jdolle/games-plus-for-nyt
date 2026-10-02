import { describe, expect, it } from "vitest";
import { hasModifier, isLetterTyping, parseCombo, serializeCombo } from "../core/keys";
import { GLOBAL_SHORTCUTS } from "../core/global-shortcuts";
import { keyForCode } from "../core/native-keys";
import { unsafeDefaultReason } from "../core/platform";
import { ALL_MODULES } from "../registry";
import { myGame } from "./_template/index";

describe("default shortcut bindings avoid common shortcuts", () => {
  for (const game of [...ALL_MODULES, myGame, GLOBAL_SHORTCUTS]) {
    it(`${game.id}: every default is safe and unique`, () => {
      const seen = new Set<string>();
      for (const def of game.shortcuts) {
        if (!def.defaultCombo) continue;
        const combo = parseCombo(def.defaultCombo);
        expect(combo, def.id).not.toBeNull();
        const reason = unsafeDefaultReason(combo!);
        if (def.unsafeDefaultOverride) {
          // An override documents a binding the user asked for despite the rule; it must be needed.
          expect(reason, `${def.id} = ${def.defaultCombo} does not need an override`).not.toBeNull();
          expect(def.unsafeDefaultOverride.length).toBeGreaterThan(10);
        } else {
          expect(reason, `${def.id} = ${def.defaultCombo}`).toBeNull();
        }
        const key = serializeCombo(combo!);
        expect(seen.has(key), `${def.id} reuses ${key}`).toBe(false);
        seen.add(key);
      }
    });
  }

  it("global defaults never collide with any game's defaults", () => {
    const globals = new Set(GLOBAL_SHORTCUTS.shortcuts.map((s) => s.defaultCombo && serializeCombo(parseCombo(s.defaultCombo)!)));
    for (const game of ALL_MODULES) {
      for (const def of game.shortcuts) {
        if (!def.defaultCombo) continue;
        expect(globals.has(serializeCombo(parseCombo(def.defaultCombo)!)), `${game.id}: ${def.id} = ${def.defaultCombo}`).toBe(false);
      }
    }
  });

  /** Shipped shortcut defaults that deliberately take a native control's key (the user's choice). None today. */
  const ALLOWED_OVERLAPS = new Set<string>();

  for (const game of [...ALL_MODULES, myGame]) {
    const controls = game.controls ?? [];
    if (controls.length === 0) continue;
    it(`${game.id}: native controls are NYT's bare keys, unique, re-creatable, and distinct from our shortcuts`, () => {
      const shortcutIds = new Set(game.shortcuts.map((s) => s.id));
      const seen = new Map<string, string>();
      for (const control of controls) {
        expect(control.native, control.id).toBe(true);
        expect(shortcutIds.has(control.id), `${control.id} reuses a shortcut id`).toBe(false);
        expect(typeof control.when, control.id).toBe("function");
        for (const key of [control.defaultCombo, ...(control.aliases ?? [])]) {
          const combo = parseCombo(key);
          expect(combo, `${control.id}: ${key}`).not.toBeNull();
          expect(hasModifier(combo!), `${control.id}: ${key} must be NYT's bare key (Shift allowed)`).toBe(false);
          expect(isLetterTyping(combo!), `${control.id}: ${key} is typing, not a control`).toBe(false);
          expect(keyForCode(combo!.code), `${control.id}: ${key} cannot be re-created`).not.toBeNull();
          const serialized = serializeCombo(combo!);
          expect(seen.get(serialized), `${control.id} and ${seen.get(serialized)} share ${serialized}`).toBeUndefined();
          seen.set(serialized, control.id);
        }
      }
      // A shortcut default on a native key shadows that control; only listed overlaps may ship.
      for (const def of game.shortcuts) {
        if (!def.defaultCombo) continue;
        const owner = seen.get(serializeCombo(parseCombo(def.defaultCombo)!));
        if (owner) expect(ALLOWED_OVERLAPS.has(`${def.id}|${owner}`), `${def.id} = ${def.defaultCombo} shadows ${owner}`).toBe(true);
      }
    });
  }

  it("rejects the classic offenders and accepts the safe pool", () => {
    expect(unsafeDefaultReason(parseCombo("Meta+KeyR")!)).toMatch(/Ctrl/);
    expect(unsafeDefaultReason(parseCombo("Ctrl+KeyP")!)).toMatch(/Ctrl/);
    expect(unsafeDefaultReason(parseCombo("Alt+KeyR")!)).toMatch(/common/);
    expect(unsafeDefaultReason(parseCombo("Alt+KeyP")!)).toMatch(/common/);
    expect(unsafeDefaultReason(parseCombo("Alt+KeyI")!)).toMatch(/dead key/);
    expect(unsafeDefaultReason(parseCombo("Alt+Digit1")!)).toMatch(/common/);
    expect(unsafeDefaultReason(parseCombo("Alt+Enter")!)).toMatch(/reserved/);
    expect(unsafeDefaultReason(parseCombo("KeyB")!)).toMatch(/Alt/);
    for (const ok of ["Alt+KeyB", "Alt+KeyG", "Alt+KeyJ", "Alt+KeyK", "Alt+Period", "Alt+Shift+KeyB"]) {
      expect(unsafeDefaultReason(parseCombo(ok)!), ok).toBeNull();
    }
  });
});
