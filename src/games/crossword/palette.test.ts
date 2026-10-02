import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../core/color";

/**
 * Guards the crossword dark palette against regressions: reads dark.css and theme.css as text and
 * checks the WCAG ratios the design relies on (4.5:1 for letters/text, 3:1 for marks, a visible step
 * between state fills). A renamed or missing declaration fails loudly instead of passing silently.
 */
const css = readFileSync(new URL("./dark.css", import.meta.url), "utf8");
const theme = readFileSync(new URL("../../styles/theme.css", import.meta.url), "utf8");

const tokens = new Map<string, string>();
for (const [, name, value] of theme.matchAll(/(--nyte-[a-z0-9-]+):\s*(#[0-9a-fA-F]{6})/g)) tokens.set(name!, value!);

type Rule = { selectors: string[]; body: string };
const rules: Rule[] = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1]!.split(",").map((s) => s.replace(/\s+/g, " ").trim()),
  body: m[2]!,
}));

/** The value of `prop` in the first rule one of whose selectors ends with `selectorEnd`, resolved to hex. */
function value(selectorEnd: string, prop: string): string {
  const rule = rules.find((r) => r.selectors.some((s) => s.endsWith(selectorEnd)) && new RegExp(`(^|;)\\s*${prop}\\s*:`).test(r.body));
  if (!rule) throw new Error(`no rule for "${selectorEnd}" with ${prop}`);
  const raw = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;!]+)`).exec(rule.body)![1]!.trim();
  const varMatch = /var\((--nyte-[a-z0-9-]+)/.exec(raw);
  if (varMatch) {
    const token = tokens.get(varMatch[1]!);
    if (!token) throw new Error(`unknown token ${varMatch[1]}`);
    return token;
  }
  if (!/^#[0-9a-fA-F]{6}$/.test(raw)) throw new Error(`${selectorEnd} ${prop} is not a hex colour: ${raw}`);
  return raw;
}

const board = "#xwd-board ";
const cell = value(`${board}.xwd__cell--cell`, "fill");
const shaded = value(`${board}.xwd__cell--shaded`, "fill");
const related = value(`${board}.xwd__cell--related`, "fill");
const highlighted = value(`${board}.xwd__cell--highlighted`, "fill");
const selected = value(`${board}.xwd__cell--selected`, "fill");
const letter = value(`${board}g.xwd__cell text`, "fill");
const penciled = value(".xwd__cell--penciled) tspan", "fill");
const confirmed = value(".xwd__assistance--confirmed) tspan", "fill");
const selectedLetter = value('[aria-selected="true"] tspan', "fill");
const slash = value(".xwd__assistance--slash", "stroke");
const flag = value(".xwd__assistance--flag", "fill");
const relatedOutline = value(`${board}.xwd__cell--related`, "stroke");

const page = tokens.get("--nyte-bg")!;
const clue = value(".xwd__clue--li .xwd__clue--text", "color");
const clueFilled = value(".xwd__clue--filled .xwd__clue--text", "color");
const relatedRow = value(".xwd__clue--li.xwd__clue--related", "background-color");
const relatedRowText = value(".xwd__clue--related .xwd__clue--text", "color");
const selectedRow = value(".xwd__clue--li.xwd__clue--selected", "background-color");
const selectedRowText = value(".xwd__clue--selected .xwd__clue--text", "color");
const clueBar = value(".xwd__clue-bar-desktop--bar", "background-color");
const clueBarText = value(".xwd__clue-bar-desktop--bar", "color");

const ratio = (a: string, b: string) => Number(contrastRatio(a, b).toFixed(2));

describe("crossword dark palette", () => {
  it("keeps letters readable on every cell state (≥ 4.5:1)", () => {
    for (const [name, fill] of Object.entries({ cell, shaded, related, highlighted })) {
      expect(ratio(letter, fill), `letter on ${name}`).toBeGreaterThanOrEqual(4.5);
      expect(ratio(confirmed, fill), `confirmed letter on ${name}`).toBeGreaterThanOrEqual(4.5);
      // Pencil letters are deliberately a dimmer gray than pen letters (and italic): ≥ 4.5 on a plain
      // cell, ≥ 3 (the graphics threshold) on the state fills.
      expect(ratio(penciled, fill), `penciled letter on ${name}`).toBeGreaterThanOrEqual(name === "cell" ? 4.5 : 3.0);
      expect(contrastRatio(penciled, fill), `pencil vs pen on ${name}`).toBeLessThan(contrastRatio(letter, fill) - 1);
    }
    expect(ratio(selectedLetter, selected), "letter on the cursor cell").toBeGreaterThanOrEqual(4.5);
  });

  it("makes the check / reveal marks and the related outline stand out (≥ 3:1)", () => {
    for (const [name, fill] of Object.entries({ cell, shaded, related, highlighted })) {
      expect(ratio(slash, fill), `slash on ${name}`).toBeGreaterThanOrEqual(3);
      expect(ratio(flag, fill), `flag on ${name}`).toBeGreaterThanOrEqual(3);
    }
    expect(ratio(relatedOutline, related), "outline vs related fill").toBeGreaterThanOrEqual(1.5);
    expect(ratio(relatedOutline, highlighted), "outline vs highlighted fill").toBeGreaterThanOrEqual(3);
  });

  it("separates every state fill from a plain cell by lightness, the cursor most of all", () => {
    expect(ratio(shaded, cell)).toBeGreaterThanOrEqual(1.5);
    expect(ratio(related, cell)).toBeGreaterThanOrEqual(1.5);
    expect(ratio(highlighted, cell)).toBeGreaterThanOrEqual(1.4);
    expect(ratio(selected, cell)).toBeGreaterThanOrEqual(4);
  });

  it("keeps the clue list readable, answered clues dimmer but legible", () => {
    expect(ratio(clue, page)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(clueFilled, page)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(clueFilled, page)).toBeLessThan(contrastRatio(clue, page));
    expect(ratio(relatedRowText, relatedRow)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(selectedRowText, selectedRow)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(clueBarText, clueBar)).toBeGreaterThanOrEqual(4.5);
  });

  it("uses one blue for everything \"current\" (word, clue, clue bar)", () => {
    expect(selectedRow).toBe(highlighted);
    expect(clueBar).toBe(highlighted);
  });
});
