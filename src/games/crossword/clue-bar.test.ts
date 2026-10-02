// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyClueBarLocation, CLUE_BAR_ATTR, CLUE_BAR_OPTION, clueBarCss, NYT_CLUE_BAR } from "./clue-bar";

describe("desktop clue bar option", () => {
  it("offers the three locations, with the bar above the clue list by default", () => {
    expect(CLUE_BAR_OPTION.kind).toBe("choice");
    expect(CLUE_BAR_OPTION.choices.map((c) => c.value)).toEqual([NYT_CLUE_BAR, "hidden", "above-clues"]);
    expect(CLUE_BAR_OPTION.default).toBe("above-clues");
  });

  it("gates the html attribute and writes only on change; the NYT value clears it", () => {
    document.documentElement.removeAttribute(CLUE_BAR_ATTR);
    expect(applyClueBarLocation(NYT_CLUE_BAR)).toBe(false);
    expect(applyClueBarLocation("hidden")).toBe(true);
    expect(document.documentElement.getAttribute(CLUE_BAR_ATTR)).toBe("hidden");
    expect(applyClueBarLocation("hidden")).toBe(false);
    expect(applyClueBarLocation("above-clues")).toBe(true);
    expect(applyClueBarLocation(NYT_CLUE_BAR)).toBe(true);
    expect(document.documentElement.hasAttribute(CLUE_BAR_ATTR)).toBe(false);
  });

  it("hides the bar, or re-lays the row out as a grid without touching the DOM order", () => {
    const css = clueBarCss();
    expect(css).toContain(`html[${CLUE_BAR_ATTR}="hidden"] :is(.xwd__clue-bar-desktop--bar) { display: none !important; }`);
    expect(css).toContain("display: grid");
    expect(css).toContain("display: contents");
    expect(css).toContain("grid-row: 1 / span 2");
    for (const line of css.split("\n")) expect(line.startsWith(`html[${CLUE_BAR_ATTR}=`), line).toBe(true);
  });
});
