// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isInteractiveTarget, isTextEntryTarget, isWidgetTarget } from "./dom";

function el(html: string): Element {
  document.body.innerHTML = html;
  return document.body.firstElementChild!;
}

describe("isTextEntryTarget / isWidgetTarget", () => {
  it("knows text fields", () => {
    expect(isTextEntryTarget(el('<input type="text">'))).toBe(true);
    expect(isTextEntryTarget(el('<input id="rebus-input" name="rebus">'))).toBe(true); // default type
    expect(isTextEntryTarget(el("<textarea></textarea>"))).toBe(true);
    expect(isTextEntryTarget(el('<div role="textbox"></div>'))).toBe(true);
    expect(isTextEntryTarget(el('<input type="checkbox">'))).toBe(false);
    expect(isTextEntryTarget(el("<button></button>"))).toBe(false);
    expect(isTextEntryTarget(el('<main tabindex="0"></main>'))).toBe(false);
    expect(isTextEntryTarget(null)).toBe(false);
  });

  it("treats buttons, links, checkboxes and selects as widgets, but not focusable containers", () => {
    expect(isWidgetTarget(el("<button></button>"))).toBe(true);
    expect(isWidgetTarget(el('<a href="/x">x</a>'))).toBe(true);
    expect(isWidgetTarget(el("<a>no href</a>"))).toBe(false);
    expect(isWidgetTarget(el('<input type="checkbox" data-testid="card-input">'))).toBe(true);
    expect(isWidgetTarget(el("<select></select>"))).toBe(true);
    expect(isWidgetTarget(el('<div role="button"></div>'))).toBe(true);
    expect(isWidgetTarget(el('<div role="menuitemcheckbox"></div>'))).toBe(true);
    expect(isWidgetTarget(el('<main tabindex="0"></main>'))).toBe(false);
    expect(isWidgetTarget(el('<ol tabindex="0"></ol>'))).toBe(false);
    expect(isWidgetTarget(el('<div data-testid="modal-body" tabindex="0"></div>'))).toBe(false);
    expect(isWidgetTarget(document.body)).toBe(false);
  });

  it("isInteractiveTarget still counts focusable containers (used for Spelling Bee's native skip)", () => {
    expect(isInteractiveTarget(el('<main tabindex="0"></main>'))).toBe(true);
    expect(isInteractiveTarget(el("<button></button>"))).toBe(true);
    expect(isInteractiveTarget(document.body)).toBe(false);
  });
});
