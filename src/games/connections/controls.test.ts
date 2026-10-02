// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { silentLogger } from "../../core/log";
import { mergeSettings } from "../../core/settings";
import type { GameContext } from "../../core/types";
import { controls } from "./controls";
import { connections } from "./index";

const ctx = (): GameContext => ({ module: connections, settings: mergeSettings({}), log: silentLogger, root: document });
const keyOn = (target: Element, code: string) => {
  const ev = new KeyboardEvent("keydown", { code, bubbles: true, cancelable: true });
  Object.defineProperty(ev, "target", { value: target });
  return ev;
};

describe("connections native controls", () => {
  it("apply only while a card has focus; Submit presses NYT's button, toggle re-sends Space to the card", () => {
    document.body.innerHTML = `
      <form id="default-choices">
        <input type="checkbox" data-testid="card-input" id="card">
        <button type="submit" data-testid="submit-btn" id="submit">Submit</button>
      </form>`;
    const card = document.getElementById("card")!;
    const toggle = controls.find((c) => c.id === "connections.control.toggleCard")!;
    const submit = controls.find((c) => c.id === "connections.control.submit")!;
    expect(toggle.when(ctx(), keyOn(card, "KeyX"))).toBe(true);
    expect(toggle.when(ctx(), keyOn(document.body, "KeyX"))).toBe(false);

    let clicks = 0;
    document.getElementById("submit")!.addEventListener("click", (ev) => {
      ev.preventDefault();
      clicks++;
    });
    submit.run(ctx(), keyOn(card, "KeyX"));
    expect(clicks).toBe(1);

    const seen: KeyboardEvent[] = [];
    card.addEventListener("keydown", (ev) => seen.push(ev));
    toggle.run(ctx(), keyOn(card, "KeyX"));
    expect(seen).toHaveLength(1);
    expect(seen[0]!.key).toBe(" ");
  });
});
