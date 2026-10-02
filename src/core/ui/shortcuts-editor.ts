import { formatCombo, isLetterTyping, isModifierCode, modifierFamily, modifierOnlyCombo, parseCombo, serializeCombo, type KeyCombo, type ModifierOnlyCode } from "../keys";
import { detectPlatform } from "../platform";
import { reservedCombos } from "../platform";
import { recordKeydown, setBinding, takeBinding } from "../rebind";
import { resolveOption, resolveShortcutCombo, withOption, type Settings } from "../settings";
import type { ShortcutDefinition, ShortcutScope } from "../types";
import type { UiBlock, UiDeps } from "./types";

type Note = { text: string; kind: "info" | "warn" | "error" };

export interface ShortcutsEditorOptions {
  heading?: string;
  /** Help line under the heading. */
  hint?: string;
  emptyText?: string;
  /** "shortcut" (default) or "control": used in the button titles and notes. */
  noun?: string;
  /**
   * Every scope that binds keys on this surface, in dispatcher precedence order (global, the game's
   * shortcuts, its controls); must include `scope`. Binding a key unsets any row in these scopes that
   * held it. Defaults to `[scope]`.
   */
  scopes?: readonly ShortcutScope[];
}

const DEFAULT_HINT =
  "Click a key, then press the new keys (a modifier such as Shift may be used on its own); Backspace unbinds it, Esc cancels. " +
  "Letters on their own can't be bound; a key already in use moves to the row you bind it to. For the game's own keys, rebinding stops the original key working here; pressing the original key resets it.";

/**
 * Binding table: one row per shortcut (or native control) with its title, an optional description,
 * its default as a tag ("Default: ⌥G") and the current binding; click the binding to record a new
 * one. Deliberately no Unbind / Reset buttons: Backspace unbinds, pressing the default resets.
 */
export function renderShortcutsEditor(scope: ShortcutScope, deps: UiDeps, opts: ShortcutsEditorOptions = {}): UiBlock {
  const platform = detectPlatform();
  const reserved = new Set(reservedCombos(platform));
  const scopes = opts.scopes ?? [scope];
  const noun = opts.noun ?? "shortcut";
  const el = document.createElement("section");
  el.className = "nyte-section nyte-shortcuts";
  let recording: string | null = null;
  /** A modifier key pressed by itself while recording: becomes the binding if released without another key. */
  let pendingModifier: ModifierOnlyCode | null = null;
  const notes = new Map<string, Note>();

  function focusRecording(): void {
    el.querySelector<HTMLElement>(".nyte-kbd.is-recording")?.focus();
  }

  function onRecordKey(ev: KeyboardEvent, def: ShortcutDefinition): void {
    if (recording !== def.id) return;
    ev.preventDefault();
    ev.stopPropagation();
    if (isModifierCode(ev.code)) {
      if (!ev.repeat) pendingModifier = modifierFamily(ev.code);
      return;
    }
    pendingModifier = null; // another key joined: it is a chord, recorded on this keydown
    const result = recordKeydown(ev, { defaultCombo: def.defaultCombo });
    if (result.kind === "ignored") return;
    if (result.kind === "cancelled") {
      recording = null;
      notes.delete(def.id);
      render();
      return;
    }
    if (result.kind === "cleared") {
      recording = null;
      notes.delete(def.id);
      deps.save(setBinding(deps.get(), scope.id, def.id, null));
      return;
    }
    accept(def, result.combo);
  }

  /** A modifier released on its own (no other key in between) records that modifier alone. */
  function onRecordKeyUp(ev: KeyboardEvent, def: ShortcutDefinition): void {
    if (recording !== def.id || !pendingModifier) return;
    if (modifierFamily(ev.code) !== pendingModifier) return;
    ev.preventDefault();
    ev.stopPropagation();
    const combo = modifierOnlyCombo(pendingModifier);
    pendingModifier = null;
    accept(def, combo);
  }

  function accept(def: ShortcutDefinition, combo: KeyCombo): void {
    const result = { combo };
    if (isLetterTyping(result.combo)) {
      notes.set(def.id, {
        text: "Letters on their own are typing keys; add Option/Alt or Ctrl, or pick a special key such as Space.",
        kind: "error",
      });
      render();
      focusRecording();
      return;
    }
    recording = null;
    // The key moves here: any other row that held it is unset, so one key never fires two actions.
    const { settings, unset } = takeBinding(deps.get(), scopes, scope.id, def, result.combo);
    const key = serializeCombo(result.combo);
    if (reserved.has(key)) {
      const os = platform === "mac" ? "macOS" : "Windows";
      notes.set(def.id, { text: `${formatCombo(result.combo, platform)} is a browser shortcut on ${os}; it may not reach the page.`, kind: "warn" });
    } else if (unset.length > 0) {
      const names = unset.map((t) => `“${t.def.title}”`).join(", ");
      notes.set(def.id, { text: `${formatCombo(result.combo, platform)} was taken from ${names}, now unbound.`, kind: "info" });
    } else {
      notes.delete(def.id);
    }
    deps.save(settings);
  }

  function renderRow(def: ShortcutDefinition, settings: Settings): HTMLElement {
    const row = document.createElement("div");
    row.className = "nyte-shortcut";
    const title = document.createElement("div");
    title.className = "nyte-label";
    title.textContent = def.title;
    const defaultCombo = def.defaultCombo ? parseCombo(def.defaultCombo) : null;
    const tag = document.createElement("span");
    tag.className = "nyte-tag";
    tag.textContent = defaultCombo ? `Default: ${formatCombo(defaultCombo, platform)}` : "No default";
    title.append(" ", tag);
    if (def.description) {
      const p = document.createElement("p");
      p.className = "nyte-help";
      p.textContent = def.description;
      title.append(p);
    }

    const combo = resolveShortcutCombo(settings, scope.id, def);
    const isRecording = recording === def.id;
    const kbd = document.createElement("button");
    kbd.type = "button";
    kbd.className = "nyte-kbd";
    kbd.classList.toggle("is-recording", isRecording);
    kbd.textContent = isRecording ? "Press keys…" : combo ? formatCombo(combo, platform) : "—";
    kbd.title = isRecording ? "Esc cancels, Backspace unbinds" : "Click to change";
    kbd.setAttribute("aria-label", isRecording ? `Recording a ${noun} for ${def.title}` : `Change the ${noun} for ${def.title}`);
    kbd.addEventListener("click", () => {
      recording = isRecording ? null : def.id;
      notes.delete(def.id);
      if (recording) notes.set(def.id, { text: `Press the new ${noun}. Esc cancels, Backspace unbinds.`, kind: "info" });
      render();
      if (recording) focusRecording();
    });
    kbd.addEventListener("keydown", (ev) => onRecordKey(ev, def));
    kbd.addEventListener("keyup", (ev) => onRecordKeyUp(ev, def));
    kbd.addEventListener("blur", () => {
      pendingModifier = null;
    });

    const controls = document.createElement("div");
    controls.className = "nyte-shortcut-controls";
    if (def.option) {
      const option = def.option;
      const label = document.createElement("label");
      label.className = "nyte-inline-option";
      const text = document.createElement("span");
      text.textContent = option.title;
      const select = document.createElement("select");
      for (const choice of option.choices) {
        const o = document.createElement("option");
        o.value = choice.value;
        o.textContent = choice.label;
        select.append(o);
      }
      select.value = resolveOption(settings, scope.id, option);
      select.addEventListener("change", () => deps.save(withOption(deps.get(), scope.id, option.id, select.value)));
      label.append(text, select);
      controls.append(label);
    }
    controls.append(kbd);
    row.append(title, controls);

    const note = notes.get(def.id);
    if (note) {
      const n = document.createElement("div");
      n.className = `nyte-note is-${note.kind}`;
      n.textContent = note.text;
      row.append(n);
    }
    return row;
  }

  function render(): void {
    const settings = deps.get();
    el.replaceChildren();
    const heading = document.createElement("h3");
    heading.textContent = opts.heading ?? "Shortcuts";
    el.append(heading);
    if (scope.shortcuts.length > 0) {
      const hint = document.createElement("p");
      hint.className = "nyte-help nyte-shortcuts-hint";
      hint.textContent = opts.hint ?? DEFAULT_HINT;
      el.append(hint);
    }
    if (scope.shortcuts.length === 0) {
      const p = document.createElement("p");
      p.className = "nyte-muted";
      p.textContent = opts.emptyText ?? "This game has no shortcuts yet.";
      el.append(p);
      return;
    }
    for (const def of scope.shortcuts) el.append(renderRow(def, settings));
  }

  render();
  return { el, update: () => render() };
}
