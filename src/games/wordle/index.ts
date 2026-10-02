import type { GameModule } from "../../core/types";
import { controls } from "./controls";
import { selectors } from "./selectors";
import { shortcuts } from "./shortcuts";

/**
 * Wordle already has a black background: darkMode "native" means we never theme it. Our settings
 * join Wordle's own settings dialog (dialog#settings-dialog, data-testid "modal-overlay"), like the
 * crossword's; Wordle flags its dark mode with a `dark` class on <body>, which our section follows.
 */
export const wordle: GameModule = {
  id: "wordle",
  name: "Wordle",
  matches: ["https://www.nytimes.com/games/wordle/*"],
  readySelector: selectors.app,
  selectors,
  darkMode: "native",
  shortcuts,
  controls,
  options: [],
  isPageDark: (doc) => doc.body.classList.contains("dark"),
  settingsMount: {
    kind: "native-menu",
    trigger: selectors.settingsButton,
    marker: selectors.settingsMarker,
    container: selectors.settingsContainer,
    heading: { classFrom: selectors.settingsHeading },
    alignWith: selectors.settingsRow,
  },
};
