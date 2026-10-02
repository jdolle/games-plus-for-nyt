import type { Settings } from "./settings";
import type { Logger } from "./log";

/** "css" = we theme it; "native" = the game is already dark (Wordle) and is never touched. */
export type DarkModeCapability = "css" | "native";

export interface ShortcutDefinition {
  /** Globally unique, e.g. "crossword.togglePencil". Also the settings key. */
  id: string;
  /** Shown in the settings UI. */
  title: string;
  /** Optional help line under the title (e.g. what else the key does on the page). */
  description?: string;
  /** Serialized combo such as "Alt+KeyP" (see core/keys.ts), or null for no default binding. */
  defaultCombo: string | null;
  /**
   * Why this default is allowed although `unsafeDefaultReason()` rejects it. Set only when the user
   * explicitly asked for that binding; `src/games/defaults.test.ts` then skips the safety check for it.
   */
  unsafeDefaultOverride?: string;
  /**
   * Optional guard: when it returns false the key is not treated as this shortcut at all and the
   * event passes through to the page untouched (e.g. "Toggle fullscreen mode" only on pages that support it).
   */
  when?(ctx: GameContext, ev: KeyboardEvent): boolean;
  run(ctx: GameContext, ev: KeyboardEvent): void | Promise<void>;
  /**
   * For mode-like shortcuts (pencil): "hold" runs `run` when the key goes down and `release` when it
   * comes up; "toggle" runs `run` once per press — for a lone-modifier binding only when the key is
   * released without another key having been pressed, so chords such as Shift+Tab are left alone.
   * Undefined = an ordinary shortcut (runs on keydown).
   */
  behavior?(ctx: GameContext): "hold" | "toggle";
  /** Called when a "hold" binding is released (also on window blur). */
  release?(ctx: GameContext, ev: KeyboardEvent | null): void;
  /** A choice rendered inline in the shortcut's settings row (e.g. the pencil "Behavior": Hold / Toggle). */
  option?: ChoiceOption;
}

/**
 * One of the game's OWN keyboard controls (bound by nytimes.com), listed under "Controls" in the
 * settings and rebindable. At its native key (`defaultCombo`) the extension does nothing. Once
 * rebound (or unbound), the dispatcher claims the new key and calls `run` — which re-creates the
 * native action, usually by dispatching a synthetic keydown carrying the native key (see
 * core/native-keys.ts) — and swallows the native key and every alias so they stop working.
 * `when` is required: it says whether NYT would handle the key right now (board focused, no modal…),
 * so the swallow never reaches keys NYT would not have taken (Tab across toolbar buttons, modals).
 */
export interface ControlDefinition extends ShortcutDefinition {
  native: true;
  /** NYT's key for this action, e.g. "Tab". */
  defaultCombo: string;
  /** Other native keys for the same action, e.g. ["Enter"]; blocked too once the control is rebound. */
  aliases?: readonly string[];
  when(ctx: GameContext, ev: KeyboardEvent): boolean;
}

/** What the shortcut editor and dispatcher need: a game module, or the global pseudo-scope. */
export type ShortcutScope = Pick<GameModule, "id" | "name" | "shortcuts">;

/** A game-specific on/off setting, rendered as a checkbox in the page panel and the popup. */
export interface ToggleOption {
  kind?: "toggle";
  id: string;
  title: string;
  description?: string;
  default: boolean;
}

/** A game-specific multiple-choice setting, rendered as a dropdown (<select>). */
export interface ChoiceOption {
  kind: "choice";
  id: string;
  title: string;
  description?: string;
  choices: ReadonlyArray<{ value: string; label: string }>;
  default: string;
}

export type OptionDefinition = ToggleOption | ChoiceOption;

/** A toolbar row to host one of our controls. */
export interface ToolbarMount {
  mount: readonly string[];
  placement: "start" | "end";
  /** Wrap the control so the host toolbar styles it as one of its own items, e.g. the crossword's li.xwd__tool--button. */
  itemWrapper?: { tag: string; className: string };
}

/** Opt-in to the global "Fullscreen mode" (core/fullscreen.ts): what fills the window and where the toolbar toggle goes. */
export interface FullscreenConfig {
  /** The element that fills the window: it must contain the toolbar and the game (#js-hook-game-wrapper). */
  target: readonly string[];
  /** Where the toolbar toggle goes: the far right of the game toolbar on every game (placement "end"). */
  toolbar?: ToolbarMount;
  /** Optional element to grow to the remaining window height (e.g. the crossword's board-and-clues row). */
  fit?: readonly string[];
  /** Extra page-level CSS, gated on html[data-nyte-fullscreen="on"] by convention. */
  css?: string;
}

/** Where the in-page settings UI lives. */
export type SettingsMount =
  | {
      /** Append our section to a settings panel the game already has (crossword gear menu). */
      kind: "native-menu";
      /** The button that opens the native panel (documentation / future use). */
      trigger: readonly string[];
      /** A stable element that only exists while the native panel is open. */
      marker: readonly string[];
      /** `closest()` candidates, resolved from the marker, that receive our section. No match = no mount. */
      container: readonly string[];
      /** Optional page-level CSS injected while this mount is active (e.g. let the host modal scroll). */
      css?: string;
      /**
       * How our section's heading matches the host's: a class the host styles (crossword:
       * "pz-moment__title medium"), or selectors of the host's own heading whose class list is copied
       * at mount time (Wordle's hashed modal heading). Neither → a plain inline style.
       */
      heading?: { className?: string; classFrom?: readonly string[] };
      /**
       * Selectors of one of the host's own settings rows: our section copies its horizontal inset (as
       * padding) at mount time, so it lines up with the native rows whatever the host's CSS does.
       */
      alignWith?: readonly string[];
    }
  | {
      /** Inject our own gear button into a toolbar; falls back to a floating button. */
      kind: "gear";
      mount: readonly string[];
      placement: "start" | "end";
    }
  | {
      /** No in-page settings UI (the module renders its own control, e.g. a checkbox in the page). */
      kind: "none";
    };

export interface GameModule {
  /** Directory name, settings key and bundle name, e.g. "spelling-bee". */
  id: string;
  name: string;
  /** Must equal the manifest's content_scripts matches for this game (enforced by a test). */
  matches: readonly string[];
  /** init() and the settings mount wait for this element (the board root). */
  readySelector?: string | readonly string[];
  /** Named, ordered fallback lists. The only place hashed class names may appear. */
  selectors: Record<string, readonly string[]>;
  darkMode: DarkModeCapability;
  shortcuts: readonly ShortcutDefinition[];
  /** NYT's own key bindings for this game (documented and rebindable); see ControlDefinition. */
  controls?: readonly ControlDefinition[];
  options: readonly OptionDefinition[];
  settingsMount: SettingsMount;
  fullscreen?: FullscreenConfig;
  /**
   * For `darkMode: "native"` games: whether the page is currently dark (e.g. Wordle's own toggle), so
   * our embedded settings match. Themed games derive it from our theme controller instead.
   */
  isPageDark?(doc: Document): boolean;
  init?(ctx: GameContext): void | Promise<void>;
  /** Called after settings change from any surface (ctx.settings is already the new value). */
  onSettingsChanged?(ctx: GameContext): void;
  teardown?(ctx: GameContext): void;
}

export interface GameContext {
  module: GameModule;
  /** Live snapshot; boot() replaces it whenever settings change. */
  settings: Settings;
  log: Logger;
  root: Document;
}
