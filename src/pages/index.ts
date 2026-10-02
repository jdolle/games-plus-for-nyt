import type { GameModule } from "../core/types";
import { crosswordsArchive } from "./crosswords-archive/index";
import { crosswordsHub } from "./crosswords-hub/index";
import { subscriptionOffer } from "./subscription-offer/index";

/** Non-game nytimes.com pages the extension enhances. Same module shape as a game. */
export const ALL_PAGES: readonly GameModule[] = [crosswordsHub, crosswordsArchive, subscriptionOffer];
