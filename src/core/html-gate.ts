/**
 * Attribute gates on <html> (html[data-nyte-…]) switch page-level CSS on and off. Writes only when
 * the value actually changes: setting an attribute to its current value still queues a mutation
 * record, which would re-trigger any observer that calls this. Returns whether anything changed.
 */
export function setHtmlGate(attr: string, value: string | null, doc: Document = document): boolean {
  const html = doc.documentElement;
  if (html.getAttribute(attr) === value) return false;
  if (value === null) html.removeAttribute(attr);
  else html.setAttribute(attr, value);
  return true;
}
