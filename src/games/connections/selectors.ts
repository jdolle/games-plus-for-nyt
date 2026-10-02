/** Connections hooks. Every control carries a data-testid; buttons are text-labelled only. */
export const selectors = {
  board: ['[data-testid="connections-board"]'],
  shuffle: ['button[data-testid="shuffle-btn"]'],
  deselect: ['button[data-testid="deselect-btn"]'],
  submit: ['button[data-testid="submit-btn"]', 'form#default-choices button[type="submit"]'],
  /** input#inner-card-N[aria-label="WORD"]; selection runs on pointer-down, so .click() is not relied on. */
  cards: ['input[data-testid="card-input"]', '[data-testid="card-label"]'],
  /** The focusable checkbox of a card (NYT toggles it on Space; Enter submits the form). */
  cardInput: ['input[data-testid="card-input"]'],
  mistakes: ['[data-testid="mistake-bubble"]'],
  /** Hashed CSS-module class; prefix match only. */
  selectedCard: ['[class*="Card-module_selected"]'],
  actionBar: ["form#default-choices"],
  /** Our gear goes at the far left of the game's toolbar row. On desktop NYT bypasses the
   * #portal-game-toolbar portal and renders the row inline as section[data-testid="toolbar"]
   * (items right-aligned); the portal is only the mobile-web row. Never the empty SSR wrapper
   * .pz-game-toolbar, which would put the gear above the row. */
  toolbar: ['section[data-testid="toolbar"]', "#portal-game-toolbar"],
} as const satisfies Record<string, readonly string[]>;
