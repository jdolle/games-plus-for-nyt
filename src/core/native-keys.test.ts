// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseCombo } from "./keys";
import { dispatchNativeKey, isSyntheticKey, keyForCode } from "./native-keys";

describe("native keys", () => {
  it("maps the re-creatable codes to key values and nothing else", () => {
    expect(keyForCode("Space")).toBe(" ");
    expect(keyForCode("Tab")).toBe("Tab");
    expect(keyForCode("NumpadEnter")).toBe("Enter");
    expect(keyForCode("ArrowLeft")).toBe("ArrowLeft");
    expect(keyForCode("KeyA")).toBeNull();
    expect(keyForCode("F5")).toBeNull();
  });

  it("dispatches a marked keydown carrying only the native combo's modifiers", () => {
    const target = document.createElement("main");
    document.body.append(target);
    const seen: KeyboardEvent[] = [];
    target.addEventListener("keydown", (ev) => seen.push(ev));
    expect(dispatchNativeKey(target, parseCombo("Shift+Tab")!, { repeat: true })).toBe(true);
    expect(seen).toHaveLength(1);
    const ev = seen[0]!;
    expect(ev.key).toBe("Tab");
    expect(ev.code).toBe("Tab");
    expect(ev.shiftKey).toBe(true);
    expect(ev.altKey).toBe(false);
    expect(ev.metaKey).toBe(false);
    expect(ev.repeat).toBe(true);
    expect(ev.bubbles).toBe(true);
    expect(ev.cancelable).toBe(true);
    expect(ev.keyCode).toBe(9);
    expect(isSyntheticKey(ev)).toBe(true);
    expect(isSyntheticKey(new KeyboardEvent("keydown", { key: "Tab" }))).toBe(false);
  });

  it("refuses codes it cannot re-create", () => {
    const target = document.createElement("div");
    let count = 0;
    target.addEventListener("keydown", () => count++);
    expect(dispatchNativeKey(target, parseCombo("KeyA")!)).toBe(false);
    expect(count).toBe(0);
  });
});
