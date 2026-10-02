function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Converts a Chrome match pattern (the subset we use) into a RegExp. */
export function matchPatternToRegExp(pattern: string): RegExp {
  if (pattern === "<all_urls>") return /^(?:https?|file|ftp):\/\/.*$/;
  const m = /^(\*|https?|file|ftp|wss?):\/\/([^/]*)(\/.*)$/.exec(pattern);
  if (!m) throw new Error(`Invalid match pattern: ${pattern}`);
  const [, scheme, host, path] = m as unknown as [string, string, string, string];
  const schemeRe = scheme === "*" ? "https?" : scheme;
  let hostRe: string;
  if (host === "*" || host === "") hostRe = "[^/]*";
  else if (host.startsWith("*.")) hostRe = `(?:[^/]+\\.)?${escapeRegExp(host.slice(2))}`;
  else hostRe = escapeRegExp(host);
  if (!host.includes(":")) hostRe += "(?::\\d+)?"; // no port in the pattern = any port
  const pathRe = path.split("*").map(escapeRegExp).join(".*");
  return new RegExp(`^${schemeRe}://${hostRe}${pathRe}$`);
}

export function urlMatches(url: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => matchPatternToRegExp(p).test(url));
}

export function findModuleForUrl<T extends { matches: readonly string[] }>(
  modules: readonly T[],
  url: string,
): T | undefined {
  return modules.find((m) => urlMatches(url, m.matches));
}
