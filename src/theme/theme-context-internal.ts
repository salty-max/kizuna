import { createContext } from "react";

import { DEFAULT_THEME, type ResolvedTheme, type ThemeChoice } from "./theme";

export interface ThemeContextValue {
  /** What the reader picked, `system` included. */
  choice: ThemeChoice;
  /** What is mounted on the document right now. */
  resolved: ResolvedTheme;
  setChoice: (choice: ThemeChoice) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  choice: DEFAULT_THEME,
  resolved: "dark",
  setChoice: () => {},
});
