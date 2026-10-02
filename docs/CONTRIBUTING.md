# Contributing

## Development setup

```sh
pnpm install
pnpm dev          # builds dist/, watches src/, hot-reloads the extension
```

Then once: `chrome://extensions` → *Developer mode* → *Load unpacked* → pick `dist/`. Every save
rebuilds, reloads the extension and refreshes the open NYT game tabs. `pnpm build` makes a
production build; `pnpm check` runs typecheck, lint and tests. Hot-reload troubleshooting and
console logging: [DEBUGGING.md](DEBUGGING.md). Publishing a version: [RELEASING.md](RELEASING.md).

## Repository

```
manifest.json        hand-written MV3 manifest (dev adds localhost permissions only)
build.mjs            esbuild driver: build / --watch + hot-reload server
src/core/            shared runtime and settings UI (see ../AGENTS.md)
src/games/<id>/      one directory per game: index.ts, selectors.ts, shortcuts.ts, controls.ts, content.ts, dark.css
src/games/_template/ copy-me example with the add-a-game recipe
src/pages/<id>/      non-game pages: crossword home and archive dark mode, the upgrade-offer bypass
src/icons/           the extension icon (PNG + SVG source), regenerated with `pnpm icons`
src/popup/           the extension dropdown
src/styles/theme.css shared dark tokens and NYT shell styling
scripts/             licence check, icon generation, the Chrome Web Store upload used by the Release workflow
.github/workflows/   CI (check + build on pushes and pull requests) and Release (tag → GitHub Release + Chrome Web Store)
docs/                CONTRIBUTING.md, RELEASING.md, LEGAL.md, DEBUGGING.md
```

[`AGENTS.md`](../AGENTS.md) in the repository root holds the detailed rules of the codebase (it stays
there because coding agents read it from the root); the essentials are below.

## Best practices

- **Identifiers only, never NYT assets.** Hook into the pages through ids, `data-testid`,
  `aria-label` and stable class families, kept in each game's `selectors.ts` as ordered fallback
  lists; hashed class names only by prefix (`[class*="Prefix-module_name"]`). Never commit NYT code,
  CSS, images, fonts or puzzle data, and never cache DOM nodes (React re-renders them).
- **Permissions stay minimal.** `storage` plus content scripts on the nytimes.com game paths. No
  `tabs`, `activeTab`, `scripting`, broader hosts or `host_permissions`; a new page gets its own
  narrow match pattern and a row in the README permissions table.
- **Leave NYT's page intact.** Ad slots are never styled, hidden or moved; nothing scrapes, caches
  or reveals puzzle content or touches paywall state. Dark mode is scoped under
  `html[data-nyte-theme="dark"]`; layout options use their own `html[data-nyte-…]` gate written only
  when the value changes (writing an unchanged attribute inside a MutationObserver loops forever).
- **One settings implementation, on every surface.** A game's settings appear inside the game's own
  settings menu when it has one (crossword, Wordle) or behind our toolbar gear, and in the popup.
  Never nest menus: a popup or modal must not open another one; editors render inline.
- **Keys.** Match on `event.code`; defaults are Alt/Option combos that avoid common browser and OS
  keys unless the maintainer explicitly chooses otherwise (then record why on the shortcut). Never
  add a shortcut for an action the site already binds — list the site's key as a control instead.
  Support macOS and Windows; desktop only.
- **Accessible colour.** Every state in the crossword grid needs a non-colour cue, letters stay at
  4.5:1 or better, no red/green pairs.
- **Adding a game:** copy `src/games/_template/`, register it in `src/games/index.ts`,
  `manifest.json` and `GAMES` in `build.mjs`, then restart `pnpm dev` (a new build entry point).
  Pages work the same way through `src/pages/`.
- **Dependencies.** The extension bundles no third-party code (no runtime dependencies; `src/` imports
  nothing from `node_modules` outside the tests). Development packages must carry permissive licences
  (MIT, Apache-2.0, BSD, ISC and the like — the allow-list is in `scripts/check-licenses.mjs`); never
  add a GPL/LGPL/AGPL/SSPL dependency.
- Run `pnpm check` before opening a pull request. The non-affiliation notice stays on every
  user-facing surface (manifest, popup, in-page panel, README).
