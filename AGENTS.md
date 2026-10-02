# Games Plus for NYT — context for agents

Chrome extension (Manifest V3) that enhances the New York Times games on nytimes.com, in the
to enhance the player's experience: dark mode plus per-game keyboard shortcuts and settings. **Unofficial; not
affiliated with or endorsed by The New York Times** — that notice must stay visible on every
user-facing surface (manifest description, popup, in-page panel, README). Name and notice live in
`src/core/brand.ts`; `src/manifest.test.ts` checks the manifest against them.

## Layout
- `src/core/` shared runtime: settings (`chrome.storage.sync`, one `settings` key), key combos,
  shortcut dispatcher, theme controller, DOM helpers, `boot()`, and `ui/` (settings components).
- "Crossword" means every crossword game — The Crossword (daily), The Mini and The Midi share one
  NYT app under `/crosswords/game/*` and the single `crossword` module; verify crossword changes on
  all three.
- `src/pages/<id>/` non-game page modules with the same module shape (e.g. `crosswords-hub` and
  `crosswords-archive`, dark mode for the crossword home page `/crosswords` and the archive pages
  `/crosswords/archive/*` — the puzzles themselves are the crossword module; and `subscription-offer`,
  the opt-in upgrade-offer bypass that continues to `https://www.nytimes.com/` + `EXIT_URI`, so the
  destination is always on nytimes.com). `src/registry.ts` lists every module (games + pages); add a
  page to `PAGES` in `build.mjs`, `manifest.json` and `src/pages/index.ts`.
- `src/games/<id>/` one directory per game: `index.ts` (module), `selectors.ts`, `shortcuts.ts`,
  `content.ts` (`boot(module)`), `dark.css`. `_template/` is the copy-me example (not built).
- `manifest.json` is hand-written; `build.mjs` (esbuild) emits `dist/`, the folder loaded unpacked.

## Commands
Never run `pnpm build` while `pnpm dev` is running: it would overwrite the dev output in `dist/` and
break the user's hot reload (the build refuses this; use `NYTE_OUT=dist-prod pnpm build` for a
side build, and `NYTE_OUT=… NYTE_DEV_PORT=… node build.mjs --watch` for an isolated dev server).
`pnpm dev` (watch + hot reload: load `dist/` once via chrome://extensions → Load unpacked; every
save then reloads the extension and refreshes open game tabs), `pnpm build`, `pnpm check`
(typecheck + lint + tests).

## Rules
- Selectors live only in a game's `selectors.ts`, as ordered fallback lists. Ids, `data-testid`,
  `aria-label` and stable class families first; hashed CSS-module classes only as
  `[class*="Prefix-module_name"]`. Never cache DOM nodes (React re-renders them).
- Permissions: production requests only `storage` plus content scripts scoped to the nytimes.com
  game paths. Never add `tabs`, `activeTab`, `scripting`, broader hosts or `host_permissions`
  without updating the README permissions table (`src/manifest.test.ts` enforces the current set).
- Dark mode: our gate is `html[data-nyte-theme="dark"]`; NYT's own palette is switched on through
  `body[data-mode="dark"].display-settings-enabled`. Background is `#121213`. Wordle is
  `darkMode: "native"` and is never themed. Ad slots are never styled, hidden or moved. The
  "Theme" choices are "Dark" (`darkMode: "on"`, the default) and "NYT Default" (`"off"`); there is
  no system-preference option (the user removed it).
- Crossword grid colours are a role-based palette (blue = current word/clue, `--nyte-yellow` = cursor,
  amber `#665518`/`#c9a227` = related, orange `#ffb347` = check/reveal marks, grays = neutral; never
  red/green). Every state also needs a non-colour cue (outline, italic, underline, accent bar, inverted
  letter). Letters/text ≥ 4.5:1 on any fill they can sit on (pencil letters: a deliberately dimmer gray,
  ≥ 4.5 on a plain cell and ≥ 3 on state fills; the "Red pencil" option in `pencil-color.ts` recolours
  them in both themes through its own html gate), marks ≥ 3:1; `games/crossword/palette.test.ts`
  reads `dark.css` and enforces this — keep its selectors in sync when renaming rules.
- Content after the game (`#portal-editorial-content`) is NYT's light-only design with hard-coded
  dark text and white cards; in dark mode it is colour-inverted as a whole (contrast-preserving),
  with images/video/iframes/ad slots inverted back. Do not try to theme its components one by one,
  and never hide or remove that region — the user wants it kept.
- Never write a DOM attribute from inside a MutationObserver callback unless the value actually
  changes: setting an attribute to its current value still queues a mutation record, and an
  unconditional write re-triggers the observer forever and freezes the page (this happened once
  in `core/theme.ts`; `theme.test.ts` guards it).
- Fullscreen mode: `core/fullscreen.ts`; gate is `html[data-nyte-fullscreen="on"]` (set by `boot()` from
  the global `settings.fullscreen`, the "Fullscreen mode" toggle beside the Theme on every surface). A
  module opts in with `fullscreen: { target, toolbar?, fit?, css? }`. The target (`#js-hook-game-wrapper`, which
  also holds NYT's modal/toast/moment portals) is fixed over the window BELOW NYT's sticky header
  (the bottom edge of `#js-global-nav` is measured into `--nyte-fs-header`; the Games nav and
  `#js-nav-burger` stay usable, the user asked for this) at z-index 99, exactly the viewport wide
  with horizontal overflow clipped (no horizontal scrollbar), under the header (100) so the nav drawer opens over the game;
  the rest of the page behind is covered, never hidden or restyled (ads included). The
  toggle is always the last item at the far right of the toolbar (`fullscreen.toolbar`, placement
  "end"); the crossword wraps it in an NYT `li.xwd__tool--button`. Our gear stays at the far left.
- Global shortcuts (`core/global-shortcuts.ts`, currently "Toggle fullscreen mode" = Alt/Option+F)
  apply on every game page; bindings are stored under the pseudo game id `global` and the dispatcher
  matches them before the game's own. A `when` guard on a shortcut lets the key pass through to the
  page when it declines (Alt+F is only claimed on pages with a `fullscreen` config). Global defaults
  must not collide with any game default (`defaults.test.ts` checks). Escape is never a default: the
  crossword maps it to rebus.
- A lone modifier ("Shift", either side) is a valid binding: `parseCombo("Shift")`, `comboFromEvent`
  maps `ShiftLeft/Right` to it on keydown and keyup, the recorder takes it on a clean press-and-release,
  and the dispatcher never cancels a modifier keydown. Mode shortcuts declare `behavior(ctx)` ("hold":
  `run` on keydown, `release` on keyup/blur; "toggle": once per press, for a lone modifier only on a
  clean release) and may render a `ChoiceOption` inline in their row (`option`, e.g. pencil "Behavior").
- Controls (`module.controls`, `ControlDefinition` in `core/types.ts`; per game in
  `games/<id>/controls.ts` built with `defineNativeControls()` from `core/native-keys.ts`): NYT's own
  key bindings, listed in the SAME "Shortcuts" section as ours (`keyScope()` in `core/ui/scopes.ts`; the
  user: "these are the same thing"), rebindable. At the native key the extension
  adds nothing. Rebound: the dispatcher claims the new key and `run` re-dispatches a synthetic keydown
  carrying the native key where the game listens (crossword `<main>`, `document.body` for Spelling
  Bee / Wordle; Connections clicks Submit), and swallows the native key plus aliases. `when` is
  required and must mean "NYT would handle this key now" (`boardHasKeys()` for the crossword). Our
  synthetic events are marked (`isSyntheticKey`) and ignored by the dispatcher. Letters are never
  controls. Never add a shortcut of ours for an action the site already binds: there is one entry, a
  control on the site's key, titled plainly (no "(NYT key)" suffix) — e.g. rebus (ESC), pause
  (Shift+ESC), Connections' Submit (Enter). Precedence: global shortcuts → game shortcuts → rebound
  controls → swallows; shipped defaults must not overlap (`defaults.test.ts`; its allow-list is empty).
- Shortcuts: matched on `event.code`, defaults are Alt/Option combos, one capture-phase listener on
  `window`; user overrides live in `settings.games[id].shortcuts`. macOS and Windows both supported.
- Default bindings never use common shortcut keys (R = reload, P = print, S = save, T = new tab, …,
  digits, arrows, F-keys) or macOS Option dead keys, even behind Alt. `unsafeDefaultReason()` in
  `src/core/platform.ts` is the rule and `src/games/defaults.test.ts` enforces it; the safe pool is
  Alt + B, G, J, K and a few punctuation keys. When the user explicitly asks for a binding the rule
  rejects (crossword: a lone Shift for pencil; Connections: Alt+S, Alt+D; global Alt+F), set `unsafeDefaultOverride` on that shortcut with
  the reason instead of weakening the rule. Bare letters (with or without Shift) can never be bound
  (`isLetterTyping()`; the editor refuses them and `mergeSettings` drops them). Other bare keys are
  held back only inside text fields (`isTextEntryTarget`) and, for Space/Enter/arrows/Home/End/Page
  keys without Shift, on focused widgets (`isWidgetTarget`) — see `heldBack()` in `core/shortcuts.ts`.
  Binding a key that another row on the surface holds MOVES it: `takeBinding()` in `core/rebind.ts`
  binds the new row and unsets every previous holder (`findConflicts` across the page's scopes from
  `core/ui/scopes.ts`, including unrebound controls' native keys and aliases); the row notes what was
  unbound. There is no "already used" refusal and no "Shadowed by" note. Our toolbar buttons are not UI hosts
  and cancel `pointerdown` so a click never moves focus off the game.
- Settings: there is NO on/off switch inside the extension (the user removed it; disabling is done
  from chrome://extensions). `isGameActive()` in `core/settings.ts` only reads the per-module flag,
  which has no UI either and is true by default; `boot()` and page modules consult it.
- Settings UI: one implementation in `src/core/ui/`, rendered in the page (crossword: appended
  inside NYT's puzzle settings modal body `[data-testid="modal-body"]` once `#skipFilled` appears;
  Wordle: inside its `dialog#settings-dialog` content column once a `[role="switch"]` appears, with
  the heading class copied from Wordle's own modal heading and dark mode read from `body.dark`;
  never into page content; other games: our gear at the top left of the game toolbar) and in the
  popup. In-page blocks come from `core/ui/page-blocks.ts`: Theme only for `darkMode: "css"` games,
  Fullscreen mode + global shortcuts only for games with a `fullscreen` config (so Wordle shows just
  its own section); the popup shows everything. Settings surfaces also appear in the
  popup. Injected UI lives in shadow roots. Game-specific settings are `module.options`: a
  `ToggleOption` renders as a checkbox, a `ChoiceOption` as a dropdown (`<select>`); read them with
  `resolveOption()`. Apply a layout option the way `games/crossword/clue-bar.ts` does: an attribute
  gate on `<html>` written only on change, page-level CSS injected once with `ensurePageStyle()`, and
  never move React-owned nodes (re-lay them out with CSS grid / `display: contents` instead).
- The gear is a flat 45px cell with a 23px icon, matching NYT's crossword "Puzzle Settings Menu"
  button (`core/ui/mount.ts`). It mounts into the real toolbar row — `section[data-testid="toolbar"]`
  (Connections) or `.pz-toolbar-left` (Spelling Bee); `#portal-game-toolbar` only on mobile web —
  never the empty server-rendered `.pz-game-toolbar` wrapper, which NYT bypasses on desktop.
- Never nest UI levels: a popup or modal must not open another popup, modal or sub-menu. Editors
  (e.g. shortcut rebinding) render inline on the surface that shows the value; in-place `<details>`
  disclosure is fine. The popup shows the full shortcut editor per game, not a summary plus dialog.
- Adding a game: copy `_template/`, register in `ALL_GAMES`, `manifest.json` and `GAMES` in
  `build.mjs`; `pnpm test` fails until they agree.

## Icon
`src/icons/icon-{16,32,48,128}.png` (+ `icon.svg`) are generated by `scripts/make-icons.mjs` (`pnpm icons`):
original artwork (dark tile, 3×3 grid, white plus), copied to `dist/icons/` by the build and referenced by
`manifest.json` `icons` / `action.default_icon` (`src/manifest.test.ts` checks sizes). Never use an NYT mark.

## Legal guardrails (see docs/LEGAL.md)
Never commit NYT code, CSS, icons, fonts, puzzle data or bundles — identifiers only. No scraping,
caching, answer reveal or paywall interaction. NYT marks only nominatively ("for NYT"), never as
the brand itself or in the icon; keep the non-affiliation notice.
