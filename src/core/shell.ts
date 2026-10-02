/**
 * Hooks shared by every NYT game shell. All of these are server-rendered ids except the toolbar
 * buttons, which Connections, Spelling Bee, Strands and Wordle render as
 * `button#{icon}-button[data-testid="{icon}-button"][aria-label]`.
 */
export const shell = {
  gameRoot: ["#pz-game-root"],
  /** Toolbar + game (+ NYT's modal/toast/moment portals); the element our "fullscreen game" fixes over the window. */
  wrapper: ["#js-hook-game-wrapper", "#js-hook-pz-moment__game"],
  /** The game screen inside the wrapper; in fullscreen mode its overflow is clipped so only the wrapper scrolls. */
  gameScreen: ["#js-hook-pz-moment__game"],
  /**
   * The toolbar row our gear joins. On desktop NYT bypasses the #portal-game-toolbar portal and
   * renders the row inline: section[data-testid="toolbar"] (Connections, Wordle-style toolbar) or a
   * div.pz-toolbar-left / .pz-toolbar-right pair (Spelling Bee). #portal-game-toolbar is only the
   * mobile-web row. Never the empty server-rendered .pz-game-toolbar wrapper around the portal.
   */
  toolbar: ['section[data-testid="toolbar"]', ".pz-toolbar-left", "#portal-game-toolbar"],
  modals: ["#portal-game-modals", "#portal-modal-system"],
  toasts: ["#portal-toast-system"],
  nav: ["#js-global-nav"],
  /** The Games navigation bar (menu button #js-nav-burger) inside the sticky header; fullscreen mode starts below its bottom edge. */
  header: ["#js-global-nav", ".pz-header"],
  helpButton: ["#help-button", 'button[data-testid="help-button"]', 'button[aria-label="Help"]'],
  statsButton: ["#stats-button", 'button[data-testid="stats-button"]', 'button[aria-label="Statistics"]'],
  settingsButton: ["#settings-button", 'button[data-testid="settings-button"]', 'button[aria-label="Settings"]'],
  /** Never styled, hidden or moved — see docs/LEGAL.md. */
  adSlots: ['[data-testid="ad-top"]', '[data-testid="ad-bottom"]', '[id^="dfp-ad"]', ".ad"],
} as const satisfies Record<string, readonly string[]>;
