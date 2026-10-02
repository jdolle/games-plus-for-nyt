import { describe, expect, it } from "vitest";
import { findModuleForUrl, matchPatternToRegExp, urlMatches } from "./url";

const games = [
  { id: "crossword", matches: ["https://www.nytimes.com/crosswords/game/*"] },
  { id: "connections", matches: ["https://www.nytimes.com/games/connections*"] },
  { id: "spelling-bee", matches: ["https://www.nytimes.com/puzzles/spelling-bee*"] },
  { id: "wordle", matches: ["https://www.nytimes.com/games/wordle/*"] },
];

describe("matchPatternToRegExp", () => {
  it("maps known game URLs to their modules", () => {
    const cases: Array<[string, string | undefined]> = [
      ["https://www.nytimes.com/crosswords/game/daily/2026/10/01", "crossword"],
      ["https://www.nytimes.com/crosswords/game/mini", "crossword"],
      ["https://www.nytimes.com/crosswords/game/midi/2026/10/01", "crossword"],
      ["https://www.nytimes.com/crosswords", undefined],
      ["https://www.nytimes.com/games/connections", "connections"],
      ["https://www.nytimes.com/games/connections?foo=1", "connections"],
      ["https://www.nytimes.com/puzzles/spelling-bee", "spelling-bee"],
      ["https://www.nytimes.com/games/wordle/index.html", "wordle"],
      ["https://www.nytimes.com/games/strands", undefined],
      ["https://www.nytimes.com/puzzles/letter-boxed", undefined],
      ["https://www.nytimes.com/puzzles/sudoku", undefined],
      ["http://www.nytimes.com/games/wordle/index.html", undefined],
    ];
    for (const [url, expected] of cases) expect(findModuleForUrl(games, url)?.id, url).toBe(expected);
  });

  it("treats a missing port as any port and supports wildcard hosts", () => {
    expect(urlMatches("http://localhost:35729/x", ["http://localhost/*"])).toBe(true);
    expect(urlMatches("https://games.nytimes.com/a", ["*://*.nytimes.com/*"])).toBe(true);
    expect(urlMatches("https://nytimes.com/a", ["*://*.nytimes.com/*"])).toBe(true);
    expect(() => matchPatternToRegExp("nytimes.com/*")).toThrow();
  });
});
