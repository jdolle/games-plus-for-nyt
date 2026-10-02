import { getGameSettings, resolveOption, withGameSettings } from "../../core/settings";
import { updateSettings } from "../../core/storage";
import type { GameContext, GameModule, ToggleOption } from "../../core/types";
import { mountDontAskAgain, type DontAskControl } from "./dont-ask";
import { resolveExitUrl } from "./exit-uri";

export const BYPASS_OPTION: ToggleOption = {
  id: "bypassUpgradeOffer",
  title: "Bypass Upgrade Offer",
  description:
    "Skip the games upgrade offer and continue straight to where you were going: https://www.nytimes.com/ followed by the page's EXIT_URI.",
  default: false,
};

const isOn = (ctx: GameContext): boolean => resolveOption(ctx.settings, ctx.module.id, BYPASS_OPTION);

/** Redirects when the option is on and EXIT_URI resolves; returns whether a redirect was issued. */
function maybeBypass(ctx: GameContext): boolean {
  if (!isOn(ctx)) {
    ctx.log.debug("bypass upgrade offer: off");
    return false;
  }
  const result = resolveExitUrl(location.search, location.href);
  if (!result.url) {
    ctx.log.info("bypass upgrade offer: staying on the page —", result.reason);
    return false;
  }
  ctx.log.info("bypass upgrade offer: continuing to", result.url);
  // replace(): the offer page must not remain in history, or Back would land on it again.
  location.replace(result.url);
  return true;
}

let dontAsk: DontAskControl | null = null;

/**
 * NYT's games upgrade-offer interstitial (/subscription/games-offer). This only automates the
 * page's own "continue" destination (EXIT_URI); it never grants access to anything, and a gated
 * destination stays gated. In-page control: a "Don't ask again" checkbox next to the continue link.
 */
export const subscriptionOffer: GameModule = {
  id: "subscription-offer",
  name: "Upgrade offer page",
  matches: ["https://www.nytimes.com/subscription/games-offer*"],
  selectors: {},
  darkMode: "native",
  shortcuts: [],
  options: [BYPASS_OPTION],
  settingsMount: { kind: "none" },
  init(ctx) {
    if (maybeBypass(ctx)) return;
    dontAsk = mountDontAskAgain({
      isOn: () => isOn(ctx),
      onChange: (on) => {
        void updateSettings((s) =>
          withGameSettings(s, ctx.module.id, { options: { ...getGameSettings(s, ctx.module.id).options, [BYPASS_OPTION.id]: on } }),
        );
      },
      log: ctx.log,
    });
  },
  onSettingsChanged(ctx) {
    dontAsk?.update(isOn(ctx));
  },
  teardown() {
    dontAsk?.dispose();
    dontAsk = null;
  },
};
