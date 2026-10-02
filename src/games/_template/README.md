# Adding a game

1. Copy this directory to `src/games/<id>/` (kebab-case id, e.g. `letter-boxed`).
2. `selectors.ts`: record the page's stable hooks as ordered fallback lists — ids, `data-testid`,
   `aria-label`, stable class families. Hashed CSS-module classes only as `[class*="Prefix-module_name"]`.
   Find them by reading the HTML/JS NYT serves and confirm in DevTools; commit identifiers only, never NYT code.
3. `shortcuts.ts`: each shortcut clicks an existing control via `clickButton`. Defaults are Alt/Option combos on
   keys that are not common shortcuts (no R/P/S/T/… — `unsafeDefaultReason()` in `core/platform.ts` lists the
   rules and `src/games/defaults.test.ts` enforces them; the safe pool is B, G, J, K and a few punctuation keys).
4. `index.ts`: fill in `id`, `name`, `matches`, `readySelector`, `darkMode` (`"css"` unless the game is
   already dark), `options`, and `settingsMount` (`"gear"` unless the game has its own settings panel).
5. `dark.css`: only if `darkMode: "css"`. Scope every rule under `html[data-nyte-theme="dark"]`; never
   touch ad slots. Delete the file otherwise.
6. Register: add the module to `ALL_GAMES` in `src/games/index.ts`, add a `content_scripts` entry to
   `manifest.json` (same `matches`; `css` lists `styles/theme.css` + `games/<id>/dark.css` when present),
   and add the id to `GAMES` in `build.mjs`.
7. `pnpm test` — `src/manifest.test.ts` fails until the module, manifest and build agree.
