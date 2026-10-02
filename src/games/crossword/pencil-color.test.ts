// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../core/color";
import { applyPencilColor, PENCIL_COLOR_ATTR, pencilColorCss, RED_PENCIL_OPTION } from "./pencil-color";

describe("red pencil option", () => {
  it("is a checkbox, off by default", () => {
    expect(RED_PENCIL_OPTION.kind ?? "toggle").toBe("toggle");
    expect(RED_PENCIL_OPTION.default).toBe(false);
  });

  it("gates the html attribute and writes only on change", () => {
    document.documentElement.removeAttribute(PENCIL_COLOR_ATTR);
    expect(applyPencilColor(false)).toBe(false);
    expect(applyPencilColor(true)).toBe(true);
    expect(document.documentElement.getAttribute(PENCIL_COLOR_ATTR)).toBe("red");
    expect(applyPencilColor(true)).toBe(false);
    expect(applyPencilColor(false)).toBe(true);
    expect(document.documentElement.hasAttribute(PENCIL_COLOR_ATTR)).toBe(false);
  });

  it("colours penciled letters red in both themes, including the selected cell, with readable contrast", () => {
    const css = pencilColorCss();
    const [lightRule, darkRule, cursorRule] = css.split("\n");
    const fill = (rule: string) => /\{ fill: (#[0-9a-f]{6})/.exec(rule)![1]!;
    expect(lightRule).toContain(':not([data-nyte-theme="dark"]) #xwd-board g.xwd__cell:has(> .xwd__cell--penciled) text');
    expect(cursorRule).toContain('[data-nyte-theme="dark"] #xwd-board g.xwd__cell[aria-selected="true"]:has(> .xwd__cell--penciled) text');
    expect(contrastRatio(fill(lightRule!), "#ffffff")).toBeGreaterThanOrEqual(4.5); // NYT's white squares
    expect(contrastRatio(fill(lightRule!), "#ffda00")).toBeGreaterThanOrEqual(4.5); // NYT's yellow cursor cell
    expect(contrastRatio(fill(darkRule!), "#3a3a3c")).toBeGreaterThanOrEqual(4); // our dark squares
    expect(contrastRatio(fill(cursorRule!), "#b59f3b")).toBeGreaterThanOrEqual(4.5); // our yellow cursor cell
    for (const line of css.split("\n")) expect(line.startsWith(`html[${PENCIL_COLOR_ATTR}="red"]`), line).toBe(true);
  });
});
