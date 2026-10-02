// Shared helpers for the store-screenshot scripts (free-games.mjs, crosswords.mjs).
//
// A screenshot is a 1280x800 PNG (the Chrome Web Store size) in assets/. Frames are rendered at
// 2x through the DevTools `Page.captureScreenshot` call (so they look the same whether the page
// lives in a headless Chromium or in a window on a 1x display) and downscaled with macOS `sips`.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
/** Production build of the extension, made by `NYTE_OUT=dist-prod pnpm build` (never dist/, which pnpm dev owns). */
export const EXT = path.join(ROOT, "dist-prod");
export const ASSETS = path.join(ROOT, "assets");
export const W = 1280;
export const H = 800;
/** Headless Chromium otherwise announces itself as "HeadlessChrome". */
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36";

export const log = (...a) => console.log(`[shots ${new Date().toISOString().slice(11, 19)}]`, ...a);
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The Play / Continue / Resume screens NYT shows before a game. */
export const START_BUTTONS = [
  'button[data-testid="moment-btn-play"]',
  "button.pz-moment__button.primary",
  'button[data-testid="Play"]',
  'button[data-testid="Continue"]',
  'button:has-text("Play")',
  'button:has-text("Continue")',
  'button:has-text("Resume")',
];
export const CLOSE_BUTTONS = [
  'button[data-testid="modal-close"]',
  'button[aria-label="Close"]',
  "button.pz-moment__close",
  '[role="dialog"] button[aria-label*="lose"]',
];

export function buildExtension() {
  log("building the extension into dist-prod/ …");
  execFileSync("node", ["build.mjs"], { cwd: ROOT, env: { ...process.env, NYTE_OUT: "dist-prod" }, stdio: "inherit" });
}

export function extensionArgs() {
  return [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`];
}

/** A fresh headless Chromium with the extension loaded (extensions need a persistent context). */
export async function launchHeadless(profileDir = path.join(tmpdir(), "nyte-shots-headless")) {
  rmSync(profileDir, { recursive: true, force: true });
  return chromium.launchPersistentContext(profileDir, {
    channel: "chromium",
    headless: true,
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    userAgent: USER_AGENT,
    args: extensionArgs(),
  });
}

/** Writes the extension's settings (chrome.storage.sync `settings`) through its service worker. */
export async function seedSettings(ctx, settings) {
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent("serviceworker", { timeout: 15000 }));
  await sw.evaluate(async (s) => {
    await chrome.storage.sync.set({ settings: s });
  }, settings);
}

/**
 * Throws when NYT's bot check (DataDome: "confirm that you are human") has replaced the page. It
 * appears after too many automated loads from one address; wait a while before trying again.
 */
export async function assertNotBlocked(page) {
  const blocked = await page.evaluate(
    () =>
      /confirm that you are human|suspect.*bot/i.test(document.body?.innerText ?? "") ||
      [...document.querySelectorAll("iframe")].some((f) => /captcha-delivery\.com/.test(f.src)),
  );
  if (blocked) throw new Error("NYT is showing its bot check (captcha); wait a while, then try again");
}

/** Bottom edge of NYT's sticky header, or 0 when it is not at the top (e.g. scrolled away). */
export async function navBottom(page) {
  return page.evaluate(() => {
    const nav = document.querySelector("#js-global-nav");
    if (!nav) return 0;
    const r = nav.getBoundingClientRect();
    return r.top === 0 && r.height < 120 ? Math.round(r.bottom) : 0;
  });
}

/** Clicks the first visible match; returns false when none is. */
export async function clickFirst(page, selectors, label) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    try {
      if (await loc.isVisible({ timeout: 400 })) {
        await loc.click({ timeout: 3000 });
        log(`  clicked ${label}: ${sel}`);
        return true;
      }
    } catch {
      /* try the next selector */
    }
  }
  return false;
}

/**
 * Captures a 1280x800 frame into `file`. `headerless` (the default for game boards) frames the
 * region directly below NYT's sticky header; panels and dialogs that centre over the whole window
 * are captured with `headerless: false` (the header is then part of the picture).
 */
export async function capture(page, file, { headerless = true, w = W, h = H } = {}) {
  await assertNotBlocked(page); // never overwrite an asset with a captcha page
  let top = 0;
  if (headerless) {
    top = await navBottom(page);
    await page.setViewportSize({ width: w, height: h + top });
    await sleep(800);
    top = await navBottom(page); // re-measure after the resize
    await page.setViewportSize({ width: w, height: h + top });
  } else {
    await page.setViewportSize({ width: w, height: h });
  }
  await sleep(900);
  // The clip is in document coordinates, so offset it by the scroll position to frame the viewport.
  const { sx, sy } = await page.evaluate(() => ({ sx: window.scrollX, sy: window.scrollY }));
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: sx, y: sy + top, width: w, height: h, scale: 2 },
  });
  await cdp.detach().catch(() => {});
  const png = Buffer.from(data, "base64");
  const raw = path.join(tmpdir(), `nyte-shot-${process.pid}-${path.basename(file)}`);
  writeFileSync(raw, png);
  mkdirSync(path.dirname(file), { recursive: true });
  const size = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`;
  try {
    execFileSync("sips", ["-z", String(h), String(w), raw, "--out", file], { stdio: "ignore" });
    log(`  wrote ${path.relative(ROOT, file)} (${w}x${h}, from a ${size} frame)`);
  } catch {
    copyFileSync(raw, file);
    log(`  wrote ${path.relative(ROOT, file)} as the raw ${size} frame: sips is unavailable, resize it to ${w}x${h} yourself`);
  }
  rmSync(raw, { force: true });
}
