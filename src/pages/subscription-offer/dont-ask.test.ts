// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { silentLogger } from "../../core/log";
import { mountDontAskAgain } from "./dont-ask";

const tick = () => new Promise((r) => setTimeout(r, 80));

describe("mountDontAskAgain", () => {
  it("adds the checkbox after the continue link, reflects the setting and reports changes", async () => {
    document.body.innerHTML = `<div class="css-7248i1"><a class="css-1dhib8" data-testid="continue-button" href="https://www.nytimes.com/crosswords/game/mini">Continue without upgrading</a></div>`;
    const changes: boolean[] = [];
    let on = false;
    const control = mountDontAskAgain({ isOn: () => on, onChange: (v) => changes.push(v), log: silentLogger });
    const label = document.querySelector("[data-nyte-dont-ask]");
    expect(label?.previousElementSibling?.getAttribute("data-testid")).toBe("continue-button");
    expect(label?.textContent).toContain("ask again");
    const input = label!.querySelector("input")!;
    expect(input.checked).toBe(false);

    input.checked = true;
    input.dispatchEvent(new Event("change"));
    expect(changes).toEqual([true]);

    on = true;
    control.update(true);
    expect(input.checked).toBe(true);

    // re-render by the page: the control comes back once
    label!.remove();
    await tick();
    expect(document.querySelectorAll("[data-nyte-dont-ask]")).toHaveLength(1);
    control.dispose();
  });

  it("falls back to the link text when the test id is missing", () => {
    document.body.innerHTML = `<p><a href="/x">Continue without subscribing</a></p>`;
    mountDontAskAgain({ isOn: () => false, onChange: () => undefined, log: silentLogger }).dispose();
    expect(document.querySelector("[data-nyte-dont-ask]")?.previousElementSibling?.textContent).toBe("Continue without subscribing");
  });
});
