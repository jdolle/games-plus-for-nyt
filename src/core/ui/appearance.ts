import type { DarkModeSetting, Settings } from "../settings";
import type { UiBlock, UiDeps } from "./types";

const CHOICES: ReadonlyArray<{ value: DarkModeSetting; label: string; help: string }> = [
  { value: "on", label: "Dark", help: "Use the dark theme (#121213 background). The default." },
  { value: "off", label: "NYT Default", help: "Leave the page exactly as NYT ships it." },
];

let counter = 0;

/** Theme radio group: Dark / NYT Default. */
export function renderAppearance(deps: UiDeps): UiBlock {
  const el = document.createElement("section");
  el.className = "nyte-section nyte-appearance";
  const heading = document.createElement("h3");
  heading.textContent = "Theme";
  const fieldset = document.createElement("fieldset");
  fieldset.className = "nyte-radios";
  const name = `nyte-appearance-${counter++}`;
  const inputs: HTMLInputElement[] = [];
  for (const choice of CHOICES) {
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = name;
    input.value = choice.value;
    input.title = choice.help;
    input.addEventListener("change", () => {
      if (input.checked) deps.save({ ...deps.get(), darkMode: choice.value });
    });
    label.append(input, document.createTextNode(choice.label));
    fieldset.append(label);
    inputs.push(input);
  }
  el.append(heading, fieldset);
  const update = (settings: Settings) => {
    for (const input of inputs) input.checked = input.value === settings.darkMode;
  };
  update(deps.get());
  return { el, update };
}
