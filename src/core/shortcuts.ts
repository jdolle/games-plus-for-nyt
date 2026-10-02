import { isTextEntryTarget, isWidgetTarget } from "./dom";
import { GLOBAL_SHORTCUTS } from "./global-shortcuts";
import { comboEquals, comboFromEvent, hasModifier, isModifierOnly, modifierFamily, serializeCombo, type KeyCombo } from "./keys";
import type { Logger } from "./log";
import { isSyntheticKey } from "./native-keys";
import { isAtNative, nativeCombos } from "./rebind";
import { resolveShortcutCombo, type Settings } from "./settings";
import type { GameContext, GameModule, ShortcutDefinition } from "./types";

export interface ShortcutDispatcher {
  install(ctx: GameContext): void;
  uninstall(): void;
  setBindings(settings: Settings): void;
  setEnabled(on: boolean): void;
}

export interface DispatcherOptions {
  /** Return true to leave the event alone (used for keys typed inside our own settings UI). */
  ignoreWhen?: (ev: KeyboardEvent) => boolean;
}

type EntryKind = "shortcut" | "control" | "swallow";
interface Entry {
  def: ShortcutDefinition;
  combo: KeyCombo;
  kind: EntryKind;
}

const NAV_KEYS = /^(Space|Enter|NumpadEnter|Arrow(Up|Down|Left|Right)|Home|End|PageUp|PageDown)$/;

/**
 * Whether a matched binding must leave the key to the page because of where it was pressed:
 * Alt/Ctrl/Meta chords fire anywhere; a combo without them never types over a text field; and a
 * bare Space/Enter/arrow (no Shift) never takes a focused widget's own activation or navigation
 * (buttons, links, checkboxes such as Connections cards, selects). On the crossword's
 * `<main tabindex=0>`, the clue list, a modal body or `<body>` it fires.
 */
export function heldBack(combo: KeyCombo, target: EventTarget | null): boolean {
  if (hasModifier(combo)) return false;
  if (isTextEntryTarget(target)) return true;
  if (combo.shift) return false;
  return NAV_KEYS.test(combo.code) && isWidgetTarget(target);
}

/**
 * Capture-phase keydown/keyup listeners on `window`, installed before any NYT handler runs. Entries, in
 * precedence order: global shortcuts, the game's shortcuts, rebound controls (new key → native
 * action) and finally "swallow" entries for the native keys and aliases of every rebound or unbound
 * control. A matched key is cancelled (preventDefault + stopImmediatePropagation) so NYT never sees
 * it; everything else passes through untouched. Our own synthetic keys are ignored.
 */
export function createShortcutDispatcher(module: GameModule, log: Logger, opts: DispatcherOptions = {}): ShortcutDispatcher {
  let entries: Entry[] = [];
  let ctx: GameContext | null = null;
  let enabled = true;
  let installed = false;
  /** A "hold" binding whose key is down right now (released on keyup of that key or on blur). */
  let held: Entry | null = null;
  /** A lone-modifier "toggle" binding whose key went down and has not been joined by another key yet. */
  let pendingLone: Entry | null = null;

  const invoke = (entry: Entry, ev: KeyboardEvent, what: "run" | "release"): void => {
    if (!ctx) return;
    log.debug(`${entry.kind} ${what === "run" ? "fired" : "released"}`, entry.def.id, serializeCombo(entry.combo));
    try {
      const result = what === "run" ? entry.def.run(ctx, ev) : entry.def.release?.(ctx, ev);
      void Promise.resolve(result).catch((e) => log.warn(`${entry.kind} ${entry.def.id} failed`, e));
    } catch (e) {
      log.warn(`${entry.kind} ${entry.def.id} failed`, e);
    }
  };

  const releaseHeld = (ev: KeyboardEvent | null): void => {
    const entry = held;
    held = null;
    if (!entry || !ctx) return;
    log.debug("shortcut released", entry.def.id);
    try {
      entry.def.release?.(ctx, ev);
    } catch (e) {
      log.warn(`shortcut ${entry.def.id} release failed`, e);
    }
  };

  const onKeyDown = (ev: KeyboardEvent): void => {
    if (!enabled || !ctx || ev.isComposing) return;
    if (isSyntheticKey(ev)) return;
    if (opts.ignoreWhen?.(ev)) return;
    const pressed = comboFromEvent(ev);
    // Any other key after a lone modifier went down makes it a chord: the toggle is off.
    if (pendingLone && !isModifierOnly(pressed)) pendingLone = null;
    for (const entry of entries) {
      if (!comboEquals(entry.combo, pressed)) continue;
      // A guarded entry that declines leaves the key to the page (and to later entries).
      if (entry.def.when && !entry.def.when(ctx, ev)) continue;
      if (heldBack(entry.combo, ev.target)) continue;
      const behavior = entry.kind === "shortcut" ? entry.def.behavior?.(ctx) : undefined;
      if (isModifierOnly(pressed)) {
        // A modifier key by itself is never cancelled: NYT reads e.shiftKey on the keys that follow.
        if (ev.repeat) return;
        if (behavior === "hold") {
          if (!held) {
            held = entry;
            invoke(entry, ev, "run");
          }
        } else {
          pendingLone = entry; // decided on keyup, if no other key joins in
        }
        return;
      }
      ev.preventDefault();
      ev.stopImmediatePropagation();
      // A held key: an ordinary shortcut runs once (repeats are still cancelled so they never leak to
      // the page); a control repeats like the native key would; a swallow keeps swallowing.
      if (entry.kind === "swallow") return;
      if (ev.repeat && entry.kind === "shortcut") return;
      if (behavior === "hold") {
        if (!held) {
          held = entry;
          invoke(entry, ev, "run");
        }
        return;
      }
      invoke(entry, ev, "run");
      return;
    }
  };

  const onKeyUp = (ev: KeyboardEvent): void => {
    if (!ctx) return;
    const code = modifierFamily(ev.code) ?? ev.code;
    if (held && held.combo.code === code) {
      releaseHeld(ev);
      return;
    }
    if (pendingLone && pendingLone.combo.code === code) {
      const entry = pendingLone;
      pendingLone = null;
      if (enabled && !opts.ignoreWhen?.(ev)) invoke(entry, ev, "run");
    }
  };

  const onBlur = (): void => {
    pendingLone = null;
    releaseHeld(null);
  };

  return {
    install(c) {
      ctx = c;
      if (!installed) {
        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("keyup", onKeyUp, true);
        window.addEventListener("blur", onBlur);
        installed = true;
      }
    },
    uninstall() {
      if (installed) {
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("keyup", onKeyUp, true);
        window.removeEventListener("blur", onBlur);
        installed = false;
      }
      releaseHeld(null);
      pendingLone = null;
    },
    setBindings(settings) {
      entries = [];
      for (const { scopeId, defs } of [
        { scopeId: GLOBAL_SHORTCUTS.id, defs: GLOBAL_SHORTCUTS.shortcuts },
        { scopeId: module.id, defs: module.shortcuts },
      ]) {
        for (const def of defs) {
          const combo = resolveShortcutCombo(settings, scopeId, def);
          if (combo) entries.push({ def, combo, kind: "shortcut" });
        }
      }
      const swallows: Entry[] = [];
      for (const control of module.controls ?? []) {
        if (isAtNative(settings, module.id, control)) continue; // NYT's key, untouched
        const combo = resolveShortcutCombo(settings, module.id, control);
        if (combo) entries.push({ def: control, combo, kind: "control" });
        for (const native of nativeCombos(control)) swallows.push({ def: control, combo: native, kind: "swallow" });
      }
      entries.push(...swallows);
      log.debug(
        "key bindings",
        entries.map((e) => `${e.kind}: ${e.def.id} = ${serializeCombo(e.combo)}`),
      );
    },
    setEnabled(on) {
      enabled = on;
      if (!on) {
        pendingLone = null;
        releaseHeld(null);
      }
    },
  };
}
