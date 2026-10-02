# Games Plus for NYT

> **Unofficial — not affiliated with or endorsed by The New York Times.**
> An independent, community-made browser extension. "NYT" and the game names are trademarks of
> The New York Times Company, used only to describe what it works with. See [docs/LEGAL.md](docs/LEGAL.md).

A Chrome extension (desktop) that enhances the New York Times games — The Crossword, The Mini,
The Midi, Connections, Spelling Bee and Wordle — with dark mode, fullscreen and rebindable keys.

## Install

Not yet on the Chrome Web Store. To try it, build it and load `dist/` as an unpacked extension — see
[docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

## Features

- **Dark mode** (`#121213`) for the crosswords, the crossword home and archive pages, Connections and
  Spelling Bee; Wordle is already dark. *Theme*: *Dark* (default) or *NYT Default*. The crossword grid
  uses a colour-blind-safe palette (blue = current word, yellow = cursor, amber = related, orange =
  check/reveal marks) with a non-colour cue for every state and readable contrast throughout.
- **Fullscreen mode** (global setting, ⤢ button at the right of each game toolbar, `Alt+F` / `⌥F`):
  the game fills the window below the NYT navigation bar, which stays usable.
- **Crossword options**: *Red pencil* (penciled letters in red, both themes), *Clue bar location*
  (*NYT Default*, *Hidden*, *Above clue list* — the default), *Clue font size* (*Default*, *Large*,
  *X-Large*).
- **Bypass Upgrade Offer** (off by default): on `nytimes.com/subscription/games-offer`, continue to
  where you were going (NYT's own `EXIT_URI`, always a nytimes.com page). It grants nothing.
- **Settings in the page and in the popup**: the crossword's puzzle settings and Wordle's Settings
  dialog gain a *Games Plus for NYT* section; Connections and Spelling Bee get a gear at the left of
  the toolbar. The popup behind the extension icon has the same settings for every game. There is no
  on/off switch inside the extension; disable it from `chrome://extensions`.

## Keys

Each game's *Shortcuts* list holds our shortcuts and the game's own keys together; every row is
rebindable (click, press the new keys; Backspace unbinds, Esc cancels, pressing the default resets).
A modifier such as Shift can be bound on its own. Letters alone can't be bound. Binding a key another
row uses moves it there and unbinds the previous holder.

| Game | Action | Default |
|---|---|---|
| Crosswords | Pencil mode — *Behavior*: **Hold** (default) or **Toggle** | `Shift` |
| Connections | Shuffle / Deselect all | `Alt+S` / `Alt+D` (`⌥S` / `⌥D`) |
| Spelling Bee | Yesterday's answers / Open hints | `Alt+K` / `Alt+G` (`⌥K` / `⌥G`) |
| Wordle | Open statistics | `Alt+B` (`⌥B`) |
| All games | Toggle fullscreen mode | `Alt+F` (`⌥F`) |

The game's own keys (desktop), listed alongside and rebindable the same way — at the original key
the extension does nothing; once rebound, the new key performs the action and the original key
stops working on that page:

| Game | Action | NYT key(s) |
|---|---|---|
| Crosswords | Enter a rebus / Pause (also resumes) | `ESC`, `Ins` / `Shift+ESC` |
| Crosswords | Next / previous clue | `Tab`, `Enter` / `Shift+Tab`, `Shift+Enter` |
| Crosswords | Spacebar action (switch direction or clear, per NYT's setting) | `Space`, `Shift+Space` |
| Crosswords | Start / end of word; move; delete letter / clear square | `Home` / `End`; arrows; `Backspace` / `Delete` |
| Spelling Bee | Submit / Delete letter / Shuffle | `Enter` / `Backspace`, `Delete` / `Space` |
| Wordle | Submit / Delete letter | `Enter` / `Backspace` |
| Connections | Select or deselect the focused card / Submit | `Space` / `Enter` |

Our defaults avoid common browser/OS keys; the few exceptions were chosen deliberately and are
handled before the browser sees the key.

## Permissions

| Manifest field | Value | Why |
|---|---|---|
| `permissions` | `["storage"]` | settings sync |
| `content_scripts[].matches` | `https://www.nytimes.com/crosswords/game/*`, `/games/connections*`, `/puzzles/spelling-bee*`, `/games/wordle/*`, `/crosswords` (home, with or without a trailing slash or query string), `/crosswords/archive*`, `/subscription/games-offer*` | the game pages, the crossword home and archive pages and the upgrade-offer page only |

No `host_permissions`, `tabs`, `activeTab`, `scripting` or wildcard hosts; the only install warning
is "Read and change your data on www.nytimes.com".

## Contributing

Development setup, repository layout and best practices: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).
Legal notes: [docs/LEGAL.md](docs/LEGAL.md).
