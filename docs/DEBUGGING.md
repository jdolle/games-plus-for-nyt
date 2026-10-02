# Debugging and development

## Hot reload

`pnpm dev` builds `dist/`, watches `src/` and runs a reload WebSocket server; every save rebuilds,
reloads the extension and refreshes the open NYT game tabs. The popup's last line shows the status
in dev builds.

- `dist/` must come from `pnpm dev`, not `pnpm build`: production builds have no reload client.
  `pnpm build` refuses to write into `dist/` while the dev server runs; build a production copy
  elsewhere with `NYTE_OUT=dist-prod pnpm build`.
- After switching from a production build to `pnpm dev`, reload the extension **once** by hand so
  the dev service worker (with the reload client) is the one running.
- The terminal prints `reload sent to N client(s)` on every build; `0 client(s)` means the service
  worker is not connected (asleep, or a production build). Opening the popup wakes it.
- Adding a game or page module adds a build entry point: restart `pnpm dev` once.
- Changes to `manifest.json` that Chrome refuses to apply through `runtime.reload()` need the
  reload button. Port in use? `NYTE_DEV_PORT=4000 pnpm dev` (the client follows the same port).

## Console logging

Every content script logs with a `[nyte:<game> +<ms>]` prefix (elapsed since the page started).
Open DevTools on the game page and filter the console by `nyte`:

- A banner (`… booting for Crossword`) and a `ready` line always print.
- Phase-by-phase lines (settings loaded, theme applied, key bindings, waiting for the board,
  settings mount, shortcut fired, settings changed) print when debug logging is on — always in
  `pnpm dev` builds; in production builds, turn it on with the "Debug logging" checkbox in the
  popup. Debug lines use `console.log`, so the default DevTools filter shows them.
- The service worker has its own console: `chrome://extensions` → the extension's *service worker*
  link. It logs the reload-server connection, each build it receives and which tabs it refreshes.
- The popup logs to its own console: right-click the popup → *Inspect*.

If a page hangs or stays blank, first check whether the banner printed at all (content script
injected?) and what the last line before the silence was.

## Checks

`pnpm check` runs typecheck, lint and the unit tests.
