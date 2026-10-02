import { setFullscreen } from "../fullscreen";
import type { Settings } from "../settings";
import { toggleRow } from "./game-section";
import type { UiBlock, UiDeps } from "./types";

/** The global "Fullscreen mode" switch (same state as the toolbar ⤢ button), shown beside the Theme. */
export function renderFullscreenMode(deps: UiDeps): UiBlock {
  const el = document.createElement("section");
  el.className = "nyte-section nyte-fullscreen-mode";
  const { row, input } = toggleRow("Fullscreen mode", "Stretch the game and its toolbar over the whole window, on every game that supports it.");
  input.addEventListener("change", () => deps.save(setFullscreen(deps.get(), input.checked)));
  el.append(row);
  const update = (settings: Settings) => {
    input.checked = settings.fullscreen;
  };
  update(deps.get());
  return { el, update };
}
