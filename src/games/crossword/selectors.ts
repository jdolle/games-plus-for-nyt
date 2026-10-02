/**
 * Hooks for every crossword game (The Crossword, The Mini, The Midi — one app under
 * /crosswords/game/*). Ordered fallbacks; static identifiers first.
 * Desktop renders the toolbar inside the board <main>; mobile web portals it into #portal-game-toolbar.
 */
export const selectors = {
  board: ["#xwd-board", "article#puzzle"],
  /** NYT's key handler lives on this <main tabindex=0> (class xwd__franklin; xwd__focused while active). */
  boardMain: ["main.xwd__franklin", '[class*="GameMoment-module_xwd__main"]', 'main[tabindex="0"]'],
  /** Present only while one of NYT's modals (settings, pause, congrats, …) is open. */
  modalOpen: ['[data-testid="modal-body"]', ".pause-modal", ".xwd__modal--overlay"],
  toolbar: ["ul.xwd__toolbar--tools", "#portal-game-toolbar", "#js-mobile-toolbar"],
  /** NYT's tool list, where our fullscreen toggle joins as a li.xwd__tool--button. */
  toolbarTools: ["ul.xwd__toolbar--tools"],
  /** Board-and-clues row on desktop (article#puzzle); NYT caps it at 660px, fullscreen lets it fill the window. */
  puzzleArea: [".xwd__layout_puzzle--desktop"],
  /** The current-clue bar above the board on desktop. */
  clueBar: [".xwd__clue-bar-desktop--bar"],
  /** section holding the clue bar and section.xwd__board (a flex column). */
  clueBarAndBoard: [".xwd__layout_clueBarAndBoard"],
  /** section holding the Across / Down clue lists. */
  clueLists: [".xwd__layout--cluelists"],
  /** One clue row in those lists (span.xwd__clue--label number + span.xwd__clue--text). */
  clueItems: [".xwd__clue--li"],
  pencil: [
    'ul.xwd__toolbar--tools button[aria-label="Pencil"]',
    '#portal-game-toolbar button[aria-label="Pencil"]',
    'button[aria-label="Pencil"]',
  ],
  rebus: [
    'ul.xwd__toolbar--tools button[aria-label="Rebus"]',
    '#portal-game-toolbar button[aria-label="Rebus"]',
    'button[aria-label="Rebus"]',
  ],
  rebusInput: ["#rebus-input"],
  /** The timer's pause control; NYT relabels it "Timer Play Button" (and ignores clicks) while paused. */
  timerPause: ['.xwd__timer--button button[aria-label="Timer Pause Button"]', 'button[aria-label="Timer Pause Button"]'],
  /** NYT's "Your game is paused" modal (containerClassName "pause-modal") and its "Continue" button. */
  pauseModal: [".pause-modal"],
  pauseContinue: [".pause-modal button"],
  rebusModeMarker: [".xwd__layout--rebusmode"],
  /** The top-left gear that opens NYT's own settings panel. */
  settingsMenuButton: ['button[aria-label="Puzzle Settings Menu"]'],
  /** NYT's "skip filled squares" checkbox: only in the DOM while the settings panel is open. */
  settingsMarker: ["#skipFilled", "#skipPenciled"],
  /**
   * `closest()` candidates from the marker. NYT's puzzle settings modal is
   * `div[data-testid="modal-body"]` (a flex ROW) wrapping `article.xwd__modal--content` (a flex
   * COLUMN that holds the settings). Mounting inside the article makes our section a row after
   * the standard settings; mounting in the body would make it a second column. No match = no
   * mount, never the page content.
   */
  settingsContainer: [
    '[data-testid="modal-body"] > article.xwd__modal--content',
    "article.xwd__modal--content",
    '[data-testid="modal-body"]',
    '[role="dialog"]',
  ],
} as const satisfies Record<string, readonly string[]>;
