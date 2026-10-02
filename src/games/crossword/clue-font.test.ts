// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { applyClueFontSize, CLUE_FONT_ATTR, CLUE_FONT_OPTION, clueFontCss, NYT_CLUE_FONT } from "./clue-font";

describe("clue font size option", () => {
  it("offers Default, Large and X-Large with NYT's size as the default", () => {
    expect(CLUE_FONT_OPTION.choices.map((c) => [c.value, c.label])).toEqual([
      [NYT_CLUE_FONT, "Default"],
      ["large", "Large"],
      ["x-large", "X-Large"],
    ]);
    expect(CLUE_FONT_OPTION.default).toBe(NYT_CLUE_FONT);
  });

  it("maps each size to the CSS font-size keyword on the clue rows and the clue bar, gated on the html attribute", () => {
    const css = clueFontCss();
    expect(css).toContain(`html[${CLUE_FONT_ATTR}="large"] :is(.xwd__clue--li, .xwd__clue-bar-desktop--bar) { font-size: large !important; }`);
    expect(css).toContain(`html[${CLUE_FONT_ATTR}="x-large"] :is(.xwd__clue--li, .xwd__clue-bar-desktop--bar) { font-size: x-large !important; }`);
    expect(css).not.toContain('"default"');
  });

  it("writes the gate only on change and clears it for the default", () => {
    document.documentElement.removeAttribute(CLUE_FONT_ATTR);
    expect(applyClueFontSize(NYT_CLUE_FONT)).toBe(false);
    expect(applyClueFontSize("large")).toBe(true);
    expect(document.documentElement.getAttribute(CLUE_FONT_ATTR)).toBe("large");
    expect(applyClueFontSize("large")).toBe(false);
    expect(applyClueFontSize("x-large")).toBe(true);
    expect(applyClueFontSize(NYT_CLUE_FONT)).toBe(true);
    expect(document.documentElement.hasAttribute(CLUE_FONT_ATTR)).toBe(false);
  });
});
