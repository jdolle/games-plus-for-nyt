// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { createThemeController, NYT_DISPLAY_CLASS, NYT_MODE_ATTR, THEME_ATTR } from "./theme";

const tick = () => new Promise((r) => setTimeout(r, 10));

afterEach(() => {
  document.documentElement.removeAttribute(THEME_ATTR);
  document.body.removeAttribute(NYT_MODE_ATTR);
  document.body.className = "";
  localStorage.clear();
});

describe("theme controller", () => {
  it("sets our gate and NYT's body hooks, and removes them for light", () => {
    const theme = createThemeController("css");
    theme.apply("on");
    expect(document.documentElement.getAttribute(THEME_ATTR)).toBe("dark");
    expect(document.body.getAttribute(NYT_MODE_ATTR)).toBe("dark");
    expect(document.body.classList.contains(NYT_DISPLAY_CLASS)).toBe(true);
    expect(localStorage.getItem("nyte:theme")).toBe("dark");
    theme.apply("off");
    expect(document.documentElement.hasAttribute(THEME_ATTR)).toBe(false);
    expect(document.body.classList.contains(NYT_DISPLAY_CLASS)).toBe(false);
    theme.dispose();
  });

  it("re-asserts the body hooks when the page flips them, without looping", async () => {
    const theme = createThemeController("css");
    theme.apply("on");
    await tick();
    let records = 0;
    const counter = new MutationObserver((list) => {
      records += list.length;
    });
    counter.observe(document.body, { attributes: true });

    document.body.setAttribute(NYT_MODE_ATTR, "light"); // the page's own script
    await tick();
    expect(document.body.getAttribute(NYT_MODE_ATTR)).toBe("dark");

    document.body.className = "something-react-added"; // class rewritten without our hook
    await tick();
    expect(document.body.classList.contains(NYT_DISPLAY_CLASS)).toBe(true);
    expect(document.body.classList.contains("something-react-added")).toBe(true);

    await tick();
    // two page writes + two re-asserts; an unguarded observer would produce an unbounded stream
    expect(records).toBeLessThanOrEqual(4);
    counter.disconnect();
    theme.dispose();
  });

  it("does not touch the document for natively dark games", () => {
    const theme = createThemeController("native");
    theme.apply("on");
    expect(document.documentElement.hasAttribute(THEME_ATTR)).toBe(false);
    expect(document.body.hasAttribute(NYT_MODE_ATTR)).toBe(false);
  });
});
