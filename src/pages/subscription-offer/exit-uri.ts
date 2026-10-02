/** Path of NYT's games upgrade-offer interstitial. */
export const OFFER_PATH = "/subscription/games-offer";
/** Every destination is built on this prefix, so it can only ever point at nytimes.com. */
export const NYT_PREFIX = "https://www.nytimes.com/";

export type ExitResolution = { url: string; reason?: undefined } | { url: null; reason: string };

/**
 * Finds the `EXIT_URI` query parameter (name matched case-insensitively) and turns it into the
 * destination: `https://www.nytimes.com/` + the value (leading slashes dropped). A value that is
 * already an absolute `https://www.nytimes.com/` URL is used as is. The result must parse to that
 * origin without credentials and must not point back at the offer page or the current page.
 */
export function resolveExitUrl(search: string, currentHref: string): ExitResolution {
  let raw: string | null = null;
  for (const [key, value] of new URLSearchParams(search)) {
    if (key.toLowerCase() === "exit_uri") {
      raw = value;
      break;
    }
  }
  if (raw === null) return { url: null, reason: "no EXIT_URI query parameter" };
  const value = raw.trim();
  if (!value) return { url: null, reason: "EXIT_URI is empty" };
  const candidate = value.startsWith(NYT_PREFIX) ? value : NYT_PREFIX + value.replace(/^[/\\]+/, "");
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { url: null, reason: "EXIT_URI does not form a valid URL" };
  }
  if (parsed.origin !== "https://www.nytimes.com" || parsed.username || parsed.password) {
    return { url: null, reason: "EXIT_URI does not resolve to https://www.nytimes.com" };
  }
  if (parsed.pathname.startsWith(OFFER_PATH)) return { url: null, reason: "EXIT_URI points back to the offer page" };
  try {
    if (new URL(currentHref).href === parsed.href) return { url: null, reason: "EXIT_URI is the current page" };
  } catch {
    /* unparsable current URL: ignore */
  }
  return { url: parsed.href };
}
