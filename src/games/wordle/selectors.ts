import { shell } from "../../core/shell";

/** Wordle renders into document.body (no #pz-game-root). */
export const selectors = {
  app: ["main#wordle-app-game"],
  keyboard: ['div[role="group"][aria-label="Keyboard"]'],
  /** data-key="q" | "↵" | "←"; aria-label "add q" / "enter" / "backspace" */
  key: ["button[data-key]"],
  /** data-state = empty | tbd | absent | present | correct */
  tiles: ['[data-testid="tile"]'],
  stats: shell.statsButton,
  /** NYT's own settings button in the toolbar (opens dialog#settings-dialog). */
  settingsButton: shell.settingsButton,
  /** Only in the DOM while the settings dialog is open: its switches (Hard Mode, Dark Mode, …). */
  settingsMarker: ['#settings-dialog button[role="switch"]', '#settings-dialog [role="switch"]'],
  /**
   * `closest()` candidates from the marker: the dialog's content column (hashed Modal-module class,
   * matched by prefix), else the dialog's first child, else the dialog itself. No match = no mount.
   */
  settingsContainer: ['[class*="Modal-module_content"]', "#settings-dialog > div", "#settings-dialog", '[data-testid="modal-overlay"]'],
  /** One of Wordle's own settings rows (hashed Settings-module class, prefix match): our section copies its inset. */
  settingsRow: ['#settings-dialog [class*="Settings-module_setting"]', '#settings-dialog [class*="Modal-module_topWrapper"]'],
  /** The dialog's own "Settings" heading; its class list is copied onto ours so they match. */
  settingsHeading: ['#settings-dialog h2[class*="Modal-module_heading"]', '[data-testid="modal-overlay"] h2'],
  /** Reference only: NYT's own switch; we never toggle it. */
  darkModeSwitch: ['button[role="switch"][aria-label="Dark Mode"]'],
  toolbar: ["main#wordle-app-game header", '[class*="Toolbar-module_toolbar"]'],
  /** NYT's modals are native <dialog>s; its key listener is detached while one is open. */
  openDialog: ["dialog[open]"],
} as const satisfies Record<string, readonly string[]>;
