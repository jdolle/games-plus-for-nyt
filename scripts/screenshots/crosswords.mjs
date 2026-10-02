#!/usr/bin/env node
// Store screenshots of The Mini and the daily crossword, which need an NYT Games subscription.
//
// NYT's login page blocks automation-controlled browsers (DataDome: "you may be a bot"), so the
// browser is started as a plain Chrome for Testing window with the extension loaded in a throwaway
// profile and NOTHING attached while you log in. The script only watches the window's tab list
// over the DevTools HTTP endpoint. Once a tab shows a crossword board it connects over CDP, turns
// fullscreen mode on with the extension's own Alt+F shortcut and captures
// assets/crossword-mini.png and assets/crossword-daily.png (1280x800, the whole board with both
// clue columns). Nothing is typed into your puzzles, but dismissing the Play screen starts their
// timers.
//
//   pnpm screenshots:crosswords      start the window, log in there, wait
//   --attach                         reuse the window a previous run left open (no new login)
//   --keep-open                      do not close the window / delete the profile at the end
//   --no-build                       reuse the existing dist-prod/ build
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { ASSETS, CLOSE_BUTTONS, START_BUTTONS, buildExtension, capture, clickFirst, extensionArgs, log, sleep } from "./lib.mjs";

const args = process.argv.slice(2);
const ATTACH = args.includes("--attach");
const KEEP_OPEN = args.includes("--keep-open");
const PORT = Number(process.env.NYTE_SHOTS_PORT ?? 9333);
const PROFILE = path.join(tmpdir(), "nyte-shots-login-profile");
const LOGIN_WAIT_MS = 20 * 60 * 1000;
const URLS = {
  mini: "https://www.nytimes.com/crosswords/game/mini",
  daily: "https://www.nytimes.com/crosswords/game/daily",
};
const GAME_URL = /nytimes\.com\/crosswords\/game\/(mini|daily)/;

function listTabs() {
  return new Promise((resolve) => {
    http
      .get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
        let body = "";
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch {
            resolve([]);
          }
        });
      })
      .on("error", () => resolve([]));
  });
}

async function boardReady(page) {
  const hasBoard = await page.locator("#xwd-board, article#puzzle").first().isVisible().catch(() => false);
  const wall = await page.locator("text=Subscribe to play").first().isVisible().catch(() => false);
  return hasBoard && !wall;
}

async function ensureFullscreen(page) {
  const on = () => page.evaluate(() => document.documentElement.getAttribute("data-nyte-fullscreen") === "on");
  if (await on()) return;
  await page.keyboard.press("Alt+F");
  await sleep(1500);
  log(`  fullscreen via Alt+F: ${(await on()) ? "on" : "NOT on"}`);
}

/** Loads one crossword, gets past its Play/Resume screen and captures the board. */
async function captureCrossword(page, id) {
  log(`== ${id}`);
  await page.goto(URLS[id], { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(4000);
  for (let i = 0; i < 30; i++) {
    // Play/Resume/Continue are only ever clicked on a crossword URL: after login NYT may route
    // through a subscription-offer page whose own "Continue" button must be left alone.
    if (GAME_URL.test(page.url())) {
      if (await boardReady(page)) break;
      if (await clickFirst(page, START_BUTTONS, "start")) break;
    }
    await sleep(1000);
  }
  await sleep(3000);
  for (let i = 0; i < 15 && !(await boardReady(page)); i++) await sleep(1000);
  if (!(await boardReady(page))) {
    log(`  ${id}: no board (still logged out, or a subscribe wall) at ${page.url()}`);
    return false;
  }
  if (await page.locator('[role="dialog"]').first().isVisible().catch(() => false)) {
    await clickFirst(page, CLOSE_BUTTONS, "close dialog");
    await sleep(1500);
  }
  await ensureFullscreen(page);
  await capture(page, path.join(ASSETS, `crossword-${id}.png`));
  return true;
}

if (!args.includes("--no-build")) buildExtension();

let chromePid = null;
if (!ATTACH) {
  if ((await listTabs()).length) {
    console.error(`A browser already answers on port ${PORT}: pass --attach to reuse it, or close it first.`);
    process.exit(2);
  }
  rmSync(PROFILE, { recursive: true, force: true });
  const chrome = spawn(
    chromium.executablePath(),
    [
      `--user-data-dir=${PROFILE}`,
      `--remote-debugging-port=${PORT}`,
      ...extensionArgs(),
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1500,1000",
      "--window-position=40,40",
      URLS.mini,
    ],
    { stdio: "ignore", detached: true },
  );
  chrome.unref();
  chromePid = chrome.pid;
  log(`Chrome for Testing is open on The Mini (pid ${chromePid}). Log in there with its "Log in" link;`);
  log(`this script waits (up to 20 minutes) until a tab shows a crossword board, then captures.`);
}

let browser = null;
let ok = false;
try {
  // Wait for the login round-trip without attaching: a crossword tab must exist and no tab may be
  // on the login site. Then attach and verify the board; still a subscribe wall → detach and wait on.
  const deadline = Date.now() + LOGIN_WAIT_MS;
  let page = null;
  while (Date.now() < deadline && !page) {
    const tabs = await listTabs();
    const onLogin = tabs.some((t) => t.type === "page" && /myaccount\.nytimes\.com/.test(t.url));
    const game = tabs.find((t) => t.type === "page" && GAME_URL.test(t.url));
    if (game && !onLogin) {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`, { slowMo: 200 });
      const candidate = browser.contexts()[0]?.pages().find((p) => GAME_URL.test(p.url()));
      if (candidate) {
        await candidate.bringToFront().catch(() => {});
        if (GAME_URL.test(candidate.url())) {
          // Logged in when the page is not a subscribe wall (the Play screen may still cover the board).
          const wall = await candidate.locator("text=Subscribe to play").first().isVisible().catch(() => false);
          if (!wall) page = candidate;
        }
      }
      if (!page) {
        await browser.close(); // detaches only; the window stays
        browser = null;
      }
    }
    if (!page) await sleep(5000);
  }
  if (!page) {
    log("Timed out waiting for a logged-in crossword tab.");
  } else {
    const results = {};
    for (const id of page.url().includes("/daily") ? ["daily", "mini"] : ["mini", "daily"]) results[id] = await captureCrossword(page, id);
    ok = Boolean(results.mini && results.daily);
    log(`done: mini=${results.mini} daily=${results.daily}`);
  }
} catch (e) {
  log(`ERROR: ${String(e.message).split("\n")[0]}`);
} finally {
  if (browser) await browser.close().catch(() => {});
  if (ok && !KEEP_OPEN) {
    // Close the window (by profile path, so a window from an earlier --attach run is found too)
    // and delete the throwaway profile with its session cookies.
    spawn("pkill", ["-f", PROFILE], { stdio: "ignore" });
    await sleep(2500);
    rmSync(PROFILE, { recursive: true, force: true });
    log("browser closed, login profile deleted");
  } else {
    log(`the browser window stays open (logged in); re-run with --attach to capture again${ok ? "" : " once the board shows"}`);
  }
}
process.exit(ok ? 0 : 1);
