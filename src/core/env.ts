/** True in `pnpm dev` builds (esbuild `define`), false in production builds and in unit tests. */
export const DEV: boolean = typeof __DEV__ !== "undefined" && __DEV__;

export function extensionVersion(): string {
  try {
    return chrome.runtime.getManifest().version;
  } catch {
    return "?";
  }
}

/** Short description of an element for log lines: "div#pz-game-root.pz-game-field". */
export function describeElement(el: Element | null | undefined): string {
  if (!el) return "(none)";
  const id = el.id ? `#${el.id}` : "";
  const cls = typeof el.className === "string" && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${el.tagName.toLowerCase()}${id}${cls}`;
}
