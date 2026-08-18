import { useContext } from "react";

import { ThemeContext, type ThemeContextValue } from "./theme-context-internal";

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
