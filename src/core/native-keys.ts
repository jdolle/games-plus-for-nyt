import type { KeyCombo } from "./keys";
import { parseCombo } from "./keys";
import type { ControlDefinition, GameContext } from "./types";

/**
 * Re-creating a game's native key action: NYT's handlers read `event.key` (and React falls back to
 * `keyCode`), none checks `isTrusted`, so a synthetic keydown dispatched where the game listens
 * (the crossword's <main>, or document.body for the window listeners of Spelling Bee and Wordle)
 * triggers the action. Untrusted keydowns have no browser default action, which is exactly right.
 * Letters are never re-created (they are typing, and the crossword needs a keypress for them).
 */
const NAMED_KEYS: Record<string, string> = {
  Space: " ",
  Tab: "Tab",
  Enter: "Enter",
  NumpadEnter: "Enter",
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Escape: "Escape",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
};
const LEGACY_KEY_CODES: Record<string, number> = {
  Space: 32, Tab: 9, Enter: 13, NumpadEnter: 13, Backspace: 8, Delete: 46, Insert: 45, Escape: 27,
  Home: 36, End: 35, PageUp: 33, PageDown: 34, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40,
};

/** The `KeyboardEvent.key` value for a `code` we can re-create, or null (letters, unknown keys). */
export function keyForCode(code: string): string | null {
  return NAMED_KEYS[code] ?? null;
}

const synthetic = new WeakSet<Event>();

/** Our own re-dispatched keydowns: the dispatcher must ignore them (no re-entrancy, no self-swallow). */
export function isSyntheticKey(ev: Event): boolean {
  return synthetic.has(ev);
}

/**
 * Dispatches a keydown carrying `combo` — always the control's NATIVE combo, never the modifiers of
 * the key the user actually pressed (Spelling Bee and Wordle skip keys held with Meta/Ctrl).
 * `keyCode`/`which` are set through the init dictionary so page scripts see them too. Returns false
 * when the code has no key value (nothing dispatched).
 */
export function dispatchNativeKey(target: EventTarget, combo: KeyCombo, opts: { repeat?: boolean } = {}): boolean {
  const key = keyForCode(combo.code);
  if (!key) return false;
  const init: KeyboardEventInit = {
    key,
    code: combo.code,
    shiftKey: combo.shift,
    altKey: combo.alt,
    ctrlKey: combo.ctrl,
    metaKey: combo.meta,
    repeat: opts.repeat ?? false,
    bubbles: true,
    cancelable: true,
    composed: true,
  };
  const legacy = LEGACY_KEY_CODES[combo.code];
  if (legacy !== undefined) {
    init.keyCode = legacy;
    init.which = legacy;
  }
  const ev = new KeyboardEvent("keydown", init);
  synthetic.add(ev);
  target.dispatchEvent(ev);
  return true;
}

export interface NativeControlSpec {
  /** Globally unique, e.g. "crossword.control.nextClue". */
  id: string;
  title: string;
  /** NYT's key (serialized combo), e.g. "Tab". */
  key: string;
  aliases?: readonly string[];
  description?: string;
  /** Replaces the default "re-dispatch the native key" action (e.g. click the Submit button). */
  perform?(ctx: GameContext, ev: KeyboardEvent): void;
  /** Replaces the host's `when` for this control only. */
  when?(ctx: GameContext, ev: KeyboardEvent): boolean;
}

export interface NativeControlHost {
  /** Whether NYT would handle the key right now (board focused, no modal, not inside a widget…). */
  when(ctx: GameContext, ev: KeyboardEvent): boolean;
  /** Where the game listens: the element to dispatch the synthetic key on. */
  target(ctx: GameContext, ev: KeyboardEvent): EventTarget | null;
}

/** Builds a game's control list; the default `run` re-dispatches the native key at `host.target`. */
export function defineNativeControls(specs: readonly NativeControlSpec[], host: NativeControlHost): ControlDefinition[] {
  return specs.map((spec) => ({
    id: spec.id,
    title: spec.title,
    description: spec.description,
    defaultCombo: spec.key,
    aliases: spec.aliases,
    native: true,
    when: spec.when ?? host.when,
    run(ctx, ev) {
      if (spec.perform) {
        spec.perform(ctx, ev);
        return;
      }
      const target = host.target(ctx, ev);
      const combo = parseCombo(spec.key);
      if (!target || !combo) {
        ctx.log.debug(`control ${spec.id}: nothing to dispatch to`);
        return;
      }
      ctx.log.debug(`control ${spec.id}: re-dispatching ${spec.key}`);
      dispatchNativeKey(target, combo, { repeat: ev.repeat });
    },
  }));
}
