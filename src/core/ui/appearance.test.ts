// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, mergeSettings, type Settings } from "../settings";
import { renderAppearance } from "./appearance";

describe("appearance block", () => {
  it("offers Dark (default) and NYT Default, and saves the choice", () => {
    let settings: Settings = mergeSettings(DEFAULT_SETTINGS);
    const saved: Settings[] = [];
    const block = renderAppearance({ get: () => settings, save: (next) => saved.push((settings = next)) });
    const labels = [...block.el.querySelectorAll("label")].map((l) => l.textContent?.trim());
    expect(labels).toEqual(["Dark", "NYT Default"]);
    expect(block.el.querySelector<HTMLInputElement>("input:checked")?.value).toBe("on");

    const light = block.el.querySelector<HTMLInputElement>('input[value="off"]')!;
    light.checked = true;
    light.dispatchEvent(new Event("change"));
    expect(saved.at(-1)?.darkMode).toBe("off");
    block.update(saved.at(-1)!);
    expect(block.el.querySelector<HTMLInputElement>("input:checked")?.value).toBe("off");
  });

  it("maps a stored legacy 'auto' value to the default", () => {
    expect(mergeSettings({ darkMode: "auto" }).darkMode).toBe("on");
  });
});
