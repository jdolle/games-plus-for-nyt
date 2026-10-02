import type { Settings } from "../settings";

/** How a UI block reads and writes settings. `save` must update the UI optimistically and persist. */
export interface UiDeps {
  get(): Settings;
  save(next: Settings): void;
}

export interface UiBlock {
  el: HTMLElement;
  update(settings: Settings): void;
}
