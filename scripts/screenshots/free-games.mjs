#!/usr/bin/env node
// Store screenshots of the games that need no NYT account: Spelling Bee, Connections and Wordle.
// Runs a headless Chromium with a production build of the extension, plays each game a little and
// writes assets/spelling-bee.png, assets/connections.png and assets/wordle.png (1280x800).
//
//   pnpm screenshots                         all three
//   pnpm screenshots connections wordle      a subset
//   --bee-words=PAINT,TITAN                  words of today's Spelling Bee to enter (so the found-words
//                                            list is not empty); without it only a few letters are typed
//   --no-build                               reuse the existing dist-prod/ build
//
// The crosswords need a subscription: see crosswords.mjs.
import path from "node:path";
import {
  ASSETS,
  CLOSE_BUTTONS,
  START_BUTTONS,
  buildExtension,
  capture,
  clickFirst,
  launchHeadless,
  log,
  seedSettings,
  sleep,
} from "./lib.mjs";

const args = process.argv.slice(2);
const beeWords = (args.find((a) => a.startsWith("--bee-words="))?.slice("--bee-words=".length) ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);
const wanted = args.filter((a) => !a.startsWith("--"));

const URLS = {
  "spelling-bee": "https://www.nytimes.com/puzzles/spelling-bee",
  connections: "https://www.nytimes.com/games/connections",
  wordle: "https://www.nytimes.com/games/wordle/index.html",
};

/** Closes NYT's "Spelling Bee badges" popover, which makes the hive inert while it is open. */
async function dismissBadgesPopover(page) {
  const box = page.locator("text=Spelling Bee badges").locator("xpath=ancestor::*[.//button][1]");
  try {
    if (await box.isVisible({ timeout: 800 })) {
      await box.locator("button").first().click({ timeout: 2000 });
      await sleep(400);
    }
  } catch {
    /* not shown this time */
  }
}

async function open(ctx, id, settings) {
  await seedSettings(ctx, settings);
  const page = await ctx.newPage();
  await page.goto(URLS[id], { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);
  await clickFirst(page, START_BUTTONS, "Play");
  await sleep(2500);
  return page;
}

const games = {
  async "spelling-bee"(ctx) {
    const page = await open(ctx, "spelling-bee", { fullscreen: true, darkMode: "on" });
    await clickFirst(page, CLOSE_BUTTONS, "close");
    await dismissBadgesPopover(page);
    // While the popover is open it holds keyboard focus and eats the first word; Escape closes it.
    await page.keyboard.press("Escape");
    await sleep(800);
    // Hive letters, centre first; keys are lowercase like NYT's own aria-labels.
    const letters = await page.evaluate(() =>
      [...document.querySelectorAll("button.hive-cell")]
        .sort((a, b) => Number(b.classList.contains("center")) - Number(a.classList.contains("center")))
        .map((b) => b.getAttribute("aria-label") ?? ""),
    );
    log(`  hive letters: ${letters.join(" ").toUpperCase() || "(none found)"}`);
    for (const word of beeWords) {
      await page.keyboard.type(word, { delay: 90 });
      await page.keyboard.press("Enter");
      await sleep(2000);
      await dismissBadgesPopover(page);
      await clickFirst(page, CLOSE_BUTTONS, "close");
    }
    // Leave a half-typed word on screen.
    await page.keyboard.type(letters.slice(0, 3).join(""), { delay: 90 });
    await sleep(500);
    await capture(page, path.join(ASSETS, "spelling-bee.png"));
    return page;
  },

  async connections(ctx) {
    const page = await open(ctx, "connections", { fullscreen: true, darkMode: "on" });
    await clickFirst(page, CLOSE_BUTTONS, "close");
    const tiles = page.locator('[data-testid="card-label"]');
    const n = await tiles.count();
    for (const i of [1, 4, 6]) if (i < n) await tiles.nth(i).click().catch(() => {});
    await sleep(500);
    await clickFirst(page, ["button.nyte-gear"], "our gear");
    await sleep(1000);
    // Our panel centres over the whole window, so this frame keeps NYT's header.
    await capture(page, path.join(ASSETS, "connections.png"), { headerless: false });
    return page;
  },

  async wordle(ctx) {
    const page = await open(ctx, "wordle", { fullscreen: false, darkMode: "on" });
    await sleep(2000); // a pre-game ad may run before the board appears
    await clickFirst(page, CLOSE_BUTTONS, "close help");
    await sleep(800);
    for (const guess of ["CRANE", "SLOTH"]) {
      await page.keyboard.type(guess, { delay: 80 });
      await page.keyboard.press("Enter");
      await sleep(2500);
    }
    // Scroll the ad above the toolbar out of view.
    const toolbarTop = await page.evaluate(() => {
      const el = document.querySelector("#settings-button")?.closest("header, section, nav, div");
      return el ? Math.max(0, Math.round(el.getBoundingClientRect().top + window.scrollY)) : 0;
    });
    await page.evaluate((y) => window.scrollTo(0, y), toolbarTop);
    await sleep(600);
    await clickFirst(page, ["#settings-button", 'button[data-testid="settings-button"]', 'button[aria-label="Settings"]'], "settings");
    await sleep(1500);
    await capture(page, path.join(ASSETS, "wordle.png"), { headerless: false });
    return page;
  },
};

const ids = wanted.length ? wanted : Object.keys(games);
for (const id of ids) {
  if (!games[id]) {
    console.error(`unknown game "${id}"; choose from ${Object.keys(games).join(", ")}`);
    process.exit(2);
  }
}
if (!args.includes("--no-build")) buildExtension();

const ctx = await launchHeadless();
let failed = 0;
try {
  for (const id of ids) {
    log(`== ${id}`);
    try {
      const page = await games[id](ctx);
      await page.close();
    } catch (e) {
      failed++;
      log(`  FAILED: ${String(e.message).split("\n")[0]}`);
    }
  }
} finally {
  await ctx.close();
}
process.exit(failed ? 1 : 0);
