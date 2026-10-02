import { isLetterTyping, parseCombo, serializeCombo, type KeyCombo } from "./keys";
import type { ChoiceOption, OptionDefinition, ShortcutDefinition, ToggleOption } from "./types";

export const SETTINGS_VERSION = 1;
/** The single chrome.storage.sync key everything lives under. */
export const STORAGE_KEY = "settings";

/** "on" = Dark (the default), "off" = NYT Default. */
export type DarkModeSetting = "on" | "off";

export interface GameSettings {
  enabled: boolean;
  /** shortcutId → serialized combo override; `null` disables the shortcut; absent = module default. */
  shortcuts: Record<string, string | null>;
  /** optionId → value (boolean for toggles, string for choices); absent = the option's declared default. */
  options: Record<string, boolean | string>;
}

export interface Settings {
  version: number;
  /** "Fullscreen mode": the game and its toolbar fill the window, on every game that supports it. */
  fullscreen: boolean;
  darkMode: DarkModeSetting;
  debug: boolean;
  games: Record<string, GameSettings>;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  version: SETTINGS_VERSION,
  fullscreen: false,
  darkMode: "on",
  debug: false,
  games: {},
});

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function emptyGameSettings(): GameSettings {
  return { enabled: true, shortcuts: {}, options: {} };
}

/** Validates whatever is in storage against the schema; unknown keys and invalid values are dropped. */
export function mergeSettings(stored: unknown): Settings {
  const out: Settings = {
    version: SETTINGS_VERSION,
    fullscreen: DEFAULT_SETTINGS.fullscreen,
    darkMode: DEFAULT_SETTINGS.darkMode,
    debug: DEFAULT_SETTINGS.debug,
    games: {},
  };
  if (!isRecord(stored)) return out;
  if (typeof stored.fullscreen === "boolean") out.fullscreen = stored.fullscreen;
  if (stored.darkMode === "on" || stored.darkMode === "off") out.darkMode = stored.darkMode; // "auto" (removed) → default
  if (typeof stored.debug === "boolean") out.debug = stored.debug;
  if (isRecord(stored.games)) {
    for (const [gameId, raw] of Object.entries(stored.games)) {
      if (!isRecord(raw)) continue;
      const game = emptyGameSettings();
      if (typeof raw.enabled === "boolean") game.enabled = raw.enabled;
      if (isRecord(raw.shortcuts)) {
        for (const [id, value] of Object.entries(raw.shortcuts)) {
          if (value === null) {
            game.shortcuts[id] = null;
          } else if (typeof value === "string") {
            const combo = parseCombo(value);
            // A bare letter would type into the game; such overrides are never kept (falls back to the default).
            if (combo && !isLetterTyping(combo)) game.shortcuts[id] = serializeCombo(combo);
          }
        }
      }
      if (isRecord(raw.options)) {
        for (const [id, value] of Object.entries(raw.options)) {
          if (typeof value === "boolean" || (typeof value === "string" && value.length <= 64)) game.options[id] = value;
        }
      }
      out.games[gameId] = game;
    }
  }
  return out;
}

export function getGameSettings(settings: Settings, gameId: string): GameSettings {
  return settings.games[gameId] ?? emptyGameSettings();
}

/**
 * Whether a module may act (its own flag; always true unless an old stored value says otherwise).
 * There is deliberately no in-extension "enable" switch: turning the extension off is done from
 * chrome://extensions, like any other extension.
 */
export function isGameActive(settings: Settings, gameId: string): boolean {
  return getGameSettings(settings, gameId).enabled;
}

/** Immutable update of one game's settings. */
export function withGameSettings(settings: Settings, gameId: string, patch: Partial<GameSettings>): Settings {
  const current = getGameSettings(settings, gameId);
  return { ...settings, games: { ...settings.games, [gameId]: { ...current, ...patch } } };
}

/** The combo that currently triggers `def`, or null when disabled / unbound. */
export function resolveShortcutCombo(settings: Settings, gameId: string, def: ShortcutDefinition): KeyCombo | null {
  const override = settings.games[gameId]?.shortcuts[def.id];
  if (override === null) return null;
  if (typeof override === "string") {
    const combo = parseCombo(override);
    if (combo) return combo;
  }
  return def.defaultCombo ? parseCombo(def.defaultCombo) : null;
}

export function resolveOption(settings: Settings, gameId: string, def: ToggleOption): boolean;
export function resolveOption(settings: Settings, gameId: string, def: ChoiceOption): string;
export function resolveOption(settings: Settings, gameId: string, def: OptionDefinition): boolean | string;
/** The option's stored value when it is valid for its kind (a boolean, or one of the declared choices), else its default. */
export function resolveOption(settings: Settings, gameId: string, def: OptionDefinition): boolean | string {
  const value = settings.games[gameId]?.options[def.id];
  if (def.kind === "choice") {
    return typeof value === "string" && def.choices.some((c) => c.value === value) ? value : def.default;
  }
  return typeof value === "boolean" ? value : def.default;
}

/** Immutable update of one option. */
export function withOption(settings: Settings, gameId: string, optionId: string, value: boolean | string): Settings {
  const options = { ...getGameSettings(settings, gameId).options, [optionId]: value };
  return withGameSettings(settings, gameId, { options });
}
