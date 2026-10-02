import { describe, expect, it } from "vitest";
import { resolveExitUrl } from "./exit-uri";

const here = "https://www.nytimes.com/subscription/games-offer?campaignId=abc&EXIT_URI=x";
const q = (value: string) => `?EXIT_URI=${encodeURIComponent(value)}`;

describe("resolveExitUrl", () => {
  it("prefixes a path with https://www.nytimes.com/ (any parameter-name case, percent-encoded)", () => {
    expect(resolveExitUrl(q("/crosswords/game/daily/2026/08/09?foo=1"), here)).toEqual({
      url: "https://www.nytimes.com/crosswords/game/daily/2026/08/09?foo=1",
    });
    expect(resolveExitUrl(q("crosswords/game/mini"), here)).toEqual({ url: "https://www.nytimes.com/crosswords/game/mini" });
    expect(resolveExitUrl(`?a=1&exit_uri=${encodeURIComponent("/games/wordle/index.html")}`, here)).toEqual({
      url: "https://www.nytimes.com/games/wordle/index.html",
    });
  });

  it("uses a value that is already an absolute nytimes.com URL as is", () => {
    const target = "https://www.nytimes.com/games/connections#top";
    expect(resolveExitUrl(q(target), here)).toEqual({ url: target });
  });

  it("never leaves nytimes.com, whatever the value looks like", () => {
    for (const value of [
      "//evil.example/x",
      "\\\\evil.example/x",
      "https://evil.example/",
      "https://www.nytimes.com.evil.example/x",
      "@evil.example/",
      "../../evil",
    ]) {
      const r = resolveExitUrl(q(value), here);
      expect(r.url, value).toMatch(/^https:\/\/www\.nytimes\.com\//);
    }
  });

  it("refuses redirect loops, empty and missing values", () => {
    expect(resolveExitUrl(q("/subscription/games-offer?x=1"), here).url).toBeNull();
    expect(resolveExitUrl(q("https://www.nytimes.com/subscription/games-offer"), here).url).toBeNull();
    expect(resolveExitUrl(q("   "), here)).toEqual({ url: null, reason: "EXIT_URI is empty" });
    expect(resolveExitUrl("?campaignId=abc", here)).toEqual({ url: null, reason: "no EXIT_URI query parameter" });
  });
});
