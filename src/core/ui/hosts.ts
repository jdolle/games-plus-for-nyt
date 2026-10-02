/** Elements that host our own UI (gear buttons, shadow roots). Keys typed inside them never trigger shortcuts. */
const hosts = new Set<Element>();

export function registerHost(el: Element): void {
  hosts.add(el);
}

export function unregisterHost(el: Element): void {
  hosts.delete(el);
}

export function isOurUiEvent(ev: Event): boolean {
  return ev.composedPath().some((node) => node instanceof Element && hosts.has(node));
}
