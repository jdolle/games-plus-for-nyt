import { comboEquals, comboFromEvent, isModifierCode, parseCombo, serializeCombo, type KeyCombo } from "./keys";
import { getGameSettings, resolveShortcutCombo, type Settings } from "./settings";
import type { ControlDefinition, ShortcutDefinition, ShortcutScope } from "./types";

export type RecordResult =
  | { kind: "recorded"; combo: KeyCombo }
  | { kind: "cancelled" }
  | { kind: "cleared" }
  | { kind: "ignored" };

export interface RecordOptions {
  /** The row's default: pressing it always records (resets), even for Escape / Backspace / Delete. */
  defaultCombo?: string | null;
}

/**
 * Interprets one keydown while recording a binding: modifier-only presses are ignored, the row's
 * own default always records (so a control on Escape or Backspace can be reset), otherwise a bare
 * Escape cancels and a bare Backspace/Delete clears (unbinds).
 */
export function recordKeydown(
  e: Pick<KeyboardEvent, "code" | "altKey" | "ctrlKey" | "shiftKey" | "metaKey">,
  opts: RecordOptions = {},
): RecordResult {
  if (!e.code || isModifierCode(e.code)) return { kind: "ignored" };
  const combo = comboFromEvent(e);
  const fallback = opts.defaultCombo ? parseCombo(opts.defaultCombo) : null;
  if (fallback && comboEquals(combo, fallback)) return { kind: "recorded", combo };
  const bare = !e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey;
  if (e.code === "Escape" && bare) return { kind: "cancelled" };
  if ((e.code === "Backspace" || e.code === "Delete") && bare) return { kind: "cleared" };
  return { kind: "recorded", combo };
}

export function isControl(def: ShortcutDefinition): def is ControlDefinition {
  return (def as ControlDefinition).native === true;
}

/** A control's native key plus its aliases, parsed. */
export function nativeCombos(def: ControlDefinition): KeyCombo[] {
  return [def.defaultCombo, ...(def.aliases ?? [])].map(parseCombo).filter((c): c is KeyCombo => c !== null);
}

/** A control still at its native key: the extension adds nothing and NYT handles it. */
export function isAtNative(settings: Settings, scopeId: string, def: ControlDefinition): boolean {
  const bound = resolveShortcutCombo(settings, scopeId, def);
  const native = parseCombo(def.defaultCombo);
  return bound !== null && native !== null && comboEquals(bound, native);
}

/**
 * Keys a definition claims on the page right now: its effective binding, plus — for a control still at
 * its native key — the aliases, which keep reaching the game.
 */
export function claimedCombos(settings: Settings, scopeId: string, def: ShortcutDefinition): KeyCombo[] {
  if (isControl(def) && isAtNative(settings, scopeId, def)) return nativeCombos(def);
  const bound = resolveShortcutCombo(settings, scopeId, def);
  return bound ? [bound] : [];
}

export interface Taker {
  scope: ShortcutScope;
  def: ShortcutDefinition;
}

/**
 * Every other row on the page currently holding `combo` (searching every scope in `scopes`, which
 * must include the row's own), ignoring `exceptId`. Binding a key moves it: the editor unsets each of
 * these so one key never fires two actions. A row's own default never counts as taken by itself.
 */
export function findConflicts(settings: Settings, scopes: readonly ShortcutScope[], combo: KeyCombo, exceptId: string): Taker[] {
  const takers: Taker[] = [];
  for (const scope of scopes) {
    for (const def of scope.shortcuts) {
      if (def.id === exceptId) continue;
      if (claimedCombos(settings, scope.id, def).some((c) => comboEquals(c, combo))) takers.push({ scope, def });
    }
  }
  return takers;
}

/** Binds `combo` to `def` and unsets every other row that held it (see findConflicts). */
export function takeBinding(settings: Settings, scopes: readonly ShortcutScope[], scopeId: string, def: ShortcutDefinition, combo: KeyCombo): { settings: Settings; unset: Taker[] } {
  const unset = findConflicts(settings, scopes, combo, def.id);
  let next = setBinding(settings, scopeId, def.id, combo);
  for (const taker of unset) next = setBinding(next, taker.scope.id, taker.def.id, null);
  return { settings: next, unset };
}

export type BindingState = "default" | "custom" | "disabled";

export function bindingState(settings: Settings, gameId: string, def: ShortcutDefinition): BindingState {
  const override = settings.games[gameId]?.shortcuts[def.id];
  if (override === null) return "disabled";
  if (typeof override === "string") {
    const custom = parseCombo(override);
    const fallback = def.defaultCombo ? parseCombo(def.defaultCombo) : null;
    return custom && fallback && comboEquals(custom, fallback) ? "default" : "custom";
  }
  return "default";
}

/** `combo` = bind, `null` = disable, `undefined` = reset to the module default. Immutable. */
export function setBinding(
  settings: Settings,
  gameId: string,
  shortcutId: string,
  combo: KeyCombo | null | undefined,
): Settings {
  const game = getGameSettings(settings, gameId);
  const shortcuts = { ...game.shortcuts };
  if (combo === undefined) delete shortcuts[shortcutId];
  else shortcuts[shortcutId] = combo === null ? null : serializeCombo(combo);
  return { ...settings, games: { ...settings.games, [gameId]: { ...game, shortcuts } } };
}

export function resetGameBindings(settings: Settings, gameId: string): Settings {
  const game = getGameSettings(settings, gameId);
  return { ...settings, games: { ...settings.games, [gameId]: { ...game, shortcuts: {} } } };
}
