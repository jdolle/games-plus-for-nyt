# Releasing

A release is a git tag `v<version>` pushed to GitHub. The [Release workflow](../.github/workflows/release.yml)
builds the extension, attaches the zip to a GitHub Release and uploads it to the Chrome Web Store,
where it is submitted for review and goes live once approved.

## One-time setup

The first version has to be published by hand: the item, its id and its listing only come into
being through the Developer Dashboard. Everything after that is automated.

1. **Developer account.** Register at the
   [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) (one-time fee).
2. **First upload.** `pnpm build`, then zip the *contents* of `dist/` so `manifest.json` sits at the
   root of the archive (`cd dist && zip -r ../games-plus-for-nyt.zip .`). In the dashboard create a
   new item from that zip, fill in the *Store listing* and *Privacy* tabs (the description keeps the
   non-affiliation notice, see [LEGAL.md](LEGAL.md)) and submit it. Note the item's id (the 32-letter
   id in its store URL).
3. **Service account** (what the workflow signs in as).
   - In the [Google Cloud Console](https://console.cloud.google.com/) create or pick a project and
     enable the **Chrome Web Store API**.
   - Create a service account (no roles needed) and add a JSON key under its *Keys* tab; keep the
     downloaded file private.
   - In the Developer Dashboard, under **Account**, add the service account's email address (a
     publisher can have one service account).
   - Note the publisher id under **Publisher → Settings**.
4. **GitHub.** In the repository settings under *Secrets and variables → Actions* add
   - the secret `CWS_SERVICE_ACCOUNT_KEY`: the whole contents of the JSON key file;
   - the variables `CWS_PUBLISHER_ID` and `CWS_EXTENSION_ID`.
5. **Check it** from your machine before the first tagged release:

   ```sh
   CWS_SERVICE_ACCOUNT_KEY="$(cat key.json)" CWS_PUBLISHER_ID=… CWS_EXTENSION_ID=… node scripts/publish-chrome.mjs --status
   ```

   It prints the published and submitted versions with their states. An error here means a wrong
   id, a key that is not a service account key, or a service account not yet added to the publisher.

## Store screenshots

The listing's screenshots are the 1280x800 PNGs in `assets/` (`crossword-daily.png`,
`crossword-mini.png`, `spelling-bee.png`, `connections.png`, `wordle.png`), captured on the real
game pages with a production build of the extension. Refresh them before a major release; they
need macOS (`sips` does the resizing) and the Playwright Chromium (`pnpm exec playwright install
chromium` once).

- `pnpm screenshots` captures Spelling Bee, Connections and Wordle headlessly, no account needed.
  Pass `--bee-words=WORD,WORD` with a couple of today's Spelling Bee answers so its found-words
  list is not empty.
- `pnpm screenshots:crosswords` captures The Mini and the daily crossword, which need a Games
  subscription. It opens a Chrome for Testing window on The Mini: log in there yourself (NYT's
  login page rejects automated browsers, so nothing is attached while you do), and the script
  takes over once the board shows. It does not type into your puzzles, but dismissing the Play
  screen starts their timers. On success it closes the window and deletes the throwaway profile;
  if something goes wrong the window stays open and `--attach` re-runs the capture without a new
  login.
- The 640x400 small promo tile (`crosswords-640x400.png`) is a crop of the daily frame; for
  example `sips --cropOffset 0 0 -c 700 1120 assets/crossword-daily.png --out /tmp/tile.png &&
  sips -z 400 640 /tmp/tile.png --out assets/crosswords-640x400.png`.

The frames show what the extension does: dark mode and fullscreen mode on the boards, the
settings panel open on Connections, and our section inside Wordle's own Settings dialog. Check
each image before uploading; a page change on nytimes.com usually shows up as a missing
element or an un-dismissed dialog in the frame. Too many automated page loads in a row make
nytimes.com answer with a "confirm that you are human" check; the scripts then stop without
writing anything, and it clears by itself after a while.

## Releasing a version

1. Set the new version in `manifest.json` and `package.json` (the same value, dotted integers such
   as `0.2.0`; the store refuses an upload whose version is not higher than the published one).
2. `pnpm check`, commit.
3. Tag and push:

   ```sh
   git tag v0.2.0 && git push origin main v0.2.0
   ```

The workflow runs three jobs:

- **build** checks that the tag matches the manifest version, runs `pnpm check` and `pnpm build`,
  and zips `dist/`.
- **github-release** creates the GitHub Release for the tag, with the zip attached and generated notes.
- **chrome-web-store** uploads the zip and submits it for review (`scripts/publish-chrome.mjs`). The
  log shows the upload state and the submission state (normally `PENDING_REVIEW`); the review
  itself happens on Google's side and the dashboard emails the result. At any time,
  `node scripts/publish-chrome.mjs --status` (same environment variables as above) shows where
  things stand.

## When something goes wrong

- **The tag does not match the manifest version:** nothing is released. Delete the tag
  (`git tag -d v0.2.0 && git push origin :v0.2.0`), fix the version, commit, tag again.
- **Authentication error:** check the secret and the two variables, and that the service account is
  listed under *Account* in the dashboard; re-run the failed job from the Actions page.
- **The upload succeeded but the submission failed:** submit the uploaded draft from the dashboard
  (re-running would try to upload the same version again, which the store refuses).
- **Any other store error:** the GitHub Release still exists. Fix the cause, bump the version and
  release again.
- **Rejected in review:** fix what the review asks for, bump the version and release again. The
  rejected submission can be cancelled from the dashboard.
- **Upload a draft without submitting it:** `node scripts/publish-chrome.mjs <zip> --no-publish`
  locally with the same environment variables, then submit from the dashboard.
