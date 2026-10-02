import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DISCLAIMER, PRODUCT_NAME } from "./core/brand";
import { ALL_MODULES, moduleDir } from "./registry";

interface ContentScript {
  matches: string[];
  js: string[];
  css?: string[];
  run_at?: string;
}
interface Manifest {
  name: string;
  version: string;
  description: string;
  icons?: Record<string, string>;
  action?: { default_icon?: Record<string, string> };
  permissions?: string[];
  host_permissions?: string[];
  optional_permissions?: string[];
  content_scripts: ContentScript[];
}

const manifest = JSON.parse(readFileSync(new URL("../manifest.json", import.meta.url), "utf8")) as Manifest;

describe("manifest.json agrees with the game registry", () => {
  it("has exactly one content script per module, with matching patterns and outputs", () => {
    expect(manifest.content_scripts).toHaveLength(ALL_MODULES.length);
    for (const module of ALL_MODULES) {
      const dir = moduleDir(module);
      const entries = manifest.content_scripts.filter((cs) => cs.js.includes(`${dir}/${module.id}/content.js`));
      expect(entries, module.id).toHaveLength(1);
      const entry = entries[0]!;
      expect(entry.matches).toEqual([...module.matches]);
      expect(entry.js).toEqual([`${dir}/${module.id}/content.js`]);
      expect(entry.run_at).toBe("document_start");
      if (module.darkMode === "css") expect(entry.css).toEqual(["styles/theme.css", `${dir}/${module.id}/dark.css`]);
      else expect(entry.css).toBeUndefined();
    }
  });

  it("requests only the storage permission and nytimes.com game paths", () => {
    expect(manifest.permissions).toEqual(["storage"]);
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_permissions).toBeUndefined();
    for (const cs of manifest.content_scripts) {
      for (const pattern of cs.matches) expect(pattern.startsWith("https://www.nytimes.com/"), pattern).toBe(true);
    }
  });

  it("uses the brand name with NYT marks only nominatively, and carries the non-affiliation notice", () => {
    expect(manifest.name).toBe(PRODUCT_NAME);
    const [brand] = manifest.name.split(/\s+for\s+/i);
    expect(brand!.toLowerCase()).not.toMatch(/nyt|new york times|wordle|spelling bee|connections|crossword/);
    expect(manifest.description).toContain(DISCLAIMER);
    expect(manifest.description.length).toBeLessThanOrEqual(132); // Chrome's manifest description limit
  });

  it("carries the same version as package.json, in Chrome's dotted-integer form", () => {
    // A release is the tag v<manifest version> (.github/workflows/release.yml); keeping package.json equal
    // means one bump before tagging. See docs/RELEASING.md.
    const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { version: string };
    expect(manifest.version).toBe(pkg.version);
    expect(manifest.version).toMatch(/^\d+(\.\d+){0,3}$/);
  });

  it("ships its own icon at the sizes Chrome and the Web Store use", () => {
    const sizes = ["16", "32", "48", "128"];
    expect(Object.keys(manifest.icons ?? {}).sort()).toEqual([...sizes].sort());
    expect(manifest.action?.default_icon).toEqual(manifest.icons);
    for (const size of sizes) {
      const path = manifest.icons![size]!;
      expect(path).toBe(`icons/icon-${size}.png`);
      const file = new URL(`../src/${path}`, import.meta.url);
      expect(existsSync(file), path).toBe(true);
      const png = readFileSync(file);
      expect(png.subarray(1, 4).toString()).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(Number(size)); // IHDR width
      expect(png.readUInt32BE(20)).toBe(Number(size)); // IHDR height
    }
  });

  it("game ids are unique and shortcut ids are namespaced by game", () => {
    const ids = ALL_MODULES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    const shortcutIds = ALL_MODULES.flatMap((g) => g.shortcuts.map((s) => s.id));
    expect(new Set(shortcutIds).size).toBe(shortcutIds.length);
    for (const s of shortcutIds) expect(s).toMatch(/^[a-zA-Z-]+\.[a-zA-Z]+$/);
  });
});
