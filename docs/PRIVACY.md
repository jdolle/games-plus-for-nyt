# Privacy Policy — Games Plus for NYT

Effective 2 October 2026. Games Plus for NYT is an unofficial browser extension for the games
on nytimes.com. It is not affiliated with, endorsed by, or sponsored by The New York Times.

## The short version

The extension collects no data, sends no data anywhere, and has no servers, accounts, analytics
or advertising. Everything it does happens inside your browser on the nytimes.com game pages.

## What the extension accesses, and why

- **The content of the nytimes.com game pages you open.** The extension runs only on these pages
  of `www.nytimes.com`: the crossword puzzles (`/crosswords/game/*`), the crossword home and
  archive pages (`/crosswords`, `/crosswords/archive*`), Connections (`/games/connections*`),
  Spelling Bee (`/puzzles/spelling-bee*`), Wordle (`/games/wordle/*`) and the Games upgrade-offer
  page (`/subscription/games-offer*`). On those pages it reads the page as shown in your browser
  in order to apply dark mode and fullscreen layout, run keyboard shortcuts, and place its settings
  panel. That reading happens in your browser only; nothing from the page is stored by the
  extension or transmitted anywhere.
- **Your settings.** The extension stores its own settings in your browser through Chrome's
  extension storage: the theme choice, whether fullscreen mode is on, your keyboard-shortcut
  bindings, per-game options and whether debug logging is on. If you have turned on Chrome Sync,
  Chrome copies these settings between your own devices through your Google Account, under
  [Google's privacy policy](https://policies.google.com/privacy); the extension's developer has no
  access to them. The settings contain no account information, no puzzle progress and no browsing
  history.
- **The upgrade-offer page (optional).** If you turn on the "Bypass Upgrade Offer" option, the
  extension reads the address of the offer page in order to continue to the page on nytimes.com
  that the offer page would have continued to. The address is not stored or sent anywhere.
- **Debug logging (optional).** When turned on, the extension writes diagnostic messages to the
  browser's developer console. They stay in your browser.

## Permissions

| Permission | Why |
|---|---|
| `storage` | to save your settings in your browser |
| access to the nytimes.com pages listed above | to change how those pages look and behave; the extension runs nowhere else |

The extension does not use the `tabs`, `activeTab`, `scripting`, `cookies`, `history` or
`webRequest` permissions, has no access to other websites, and does not load or run code from the
internet.

## What is not collected

The extension does not collect, store or transmit personal information, health or financial
information, login details or cookies, personal communications, location, browsing history, or
records of how you use nytimes.com. It does not sell or share anything with anyone, because it
holds nothing to share. Reading the game pages in your browser, as described above, is the only
"website content" it handles, and that content never leaves your browser.

## Children

The extension is not directed at children and, as above, collects no information from anyone.

## Changes

Changes to this policy are published on this page with a new effective date.

## Contact

Questions and concerns: [open an issue](https://github.com/jdolle/games-plus-for-nyt/issues) in
the project's GitHub repository.
