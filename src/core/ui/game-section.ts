import { resolveOption, withOption, type Settings } from "../settings";
import type { ChoiceOption, GameModule, ShortcutScope } from "../types";
import { keyScope, pageScopes } from "./scopes";
import { renderShortcutsEditor } from "./shortcuts-editor";
import type { UiBlock, UiDeps } from "./types";

export interface GameSectionOptions {
  heading?: boolean;
  /** Scopes used for conflict / shadow checks (dispatcher order); defaults to this game's page scopes. */
  scopes?: readonly ShortcutScope[];
}



/** A labelled checkbox row (label text + optional help line, checkbox on the right). */
export function toggleRow(title: string, help: string | undefined): { row: HTMLElement; input: HTMLInputElement } {
  const row = document.createElement("label");
  row.className = "nyte-row nyte-check";
  const label = document.createElement("span");
  label.className = "nyte-label";
  label.textContent = title;
  if (help) {
    const p = document.createElement("p");
    p.className = "nyte-help";
    p.textContent = help;
    label.append(p);
  }
  const input = document.createElement("input");
  input.type = "checkbox";
  row.append(label, input);
  return { row, input };
}

/** A labelled dropdown row (label text + optional help line, <select> on the right). */
function selectRow(def: ChoiceOption): { row: HTMLElement; select: HTMLSelectElement } {
  const row = document.createElement("label");
  row.className = "nyte-row nyte-select";
  const label = document.createElement("span");
  label.className = "nyte-label";
  label.textContent = def.title;
  if (def.description) {
    const p = document.createElement("p");
    p.className = "nyte-help";
    p.textContent = def.description;
    label.append(p);
  }
  const select = document.createElement("select");
  for (const choice of def.choices) {
    const option = document.createElement("option");
    option.value = choice.value;
    option.textContent = choice.label;
    select.append(option);
  }
  row.append(label, select);
  return { row, select };
}

/**
 * Per-game settings: declared options and one "Shortcuts" editor holding both our shortcuts and the
 * game's own (native) keys, always inline. Used by the page panel and the popup; neither surface ever
 * opens a further dialog for editing.
 */
export function renderGameSection(module: GameModule, deps: UiDeps, opts: GameSectionOptions = {}): UiBlock {
  const el = document.createElement("section");
  el.className = "nyte-section nyte-game";
  if (opts.heading !== false) {
    const heading = document.createElement("h3");
    heading.className = "nyte-game-title";
    heading.textContent = module.name;
    el.append(heading);
  }

  const keys = keyScope(module);
  const hasShortcuts = keys.shortcuts.length > 0;
  const optionControls: Array<(settings: Settings) => void> = [];
  for (const def of module.options) {
    if (def.kind === "choice") {
      const { row, select } = selectRow(def);
      select.addEventListener("change", () => deps.save(withOption(deps.get(), module.id, def.id, select.value)));
      el.append(row);
      optionControls.push((settings) => (select.value = resolveOption(settings, module.id, def)));
    } else {
      const { row, input } = toggleRow(def.title, def.description);
      input.addEventListener("change", () => deps.save(withOption(deps.get(), module.id, def.id, input.checked)));
      el.append(row);
      optionControls.push((settings) => (input.checked = resolveOption(settings, module.id, def)));
    }
  }

  const scopes = opts.scopes ?? pageScopes(module);
  const shortcuts = hasShortcuts ? renderShortcutsEditor(keys, deps, { scopes }) : null;
  if (shortcuts) el.append(shortcuts.el);

  const update = (settings: Settings) => {
    for (const sync of optionControls) sync(settings);
    shortcuts?.update(settings);
  };
  update(deps.get());
  return { el, update };
}
