import { Monitor, Moon, Sun } from "lucide-react";

import { Tab } from "@/components/ui";
import { useI18n } from "@/i18n";
import { THEME_CHOICES, useTheme, type ThemeChoice } from "@/theme";

const ICON: Record<ThemeChoice, typeof Sun> = {
  system: Monitor,
  dark: Moon,
  light: Sun,
};

const LABEL: Record<ThemeChoice, "theme.system" | "theme.dark" | "theme.light"> = {
  system: "theme.system",
  dark: "theme.dark",
  light: "theme.light",
};

/**
 * Three states, not a two-way switch: `system` has to stay reachable, or a
 * reader who tries the other theme can never hand the choice back to the OS.
 */
export function ThemeSwitch() {
  const { t } = useI18n();
  const { choice, setChoice } = useTheme();

  return (
    <div role="tablist" aria-label={t("theme.label")} className="flex items-center">
      {THEME_CHOICES.map((value) => {
        const Icon = ICON[value];
        return (
          <Tab
            key={value}
            active={choice === value}
            onClick={() => setChoice(value)}
            aria-label={t(LABEL[value])}
            title={t(LABEL[value])}
            className="px-2"
          >
            <Icon className="size-3.5" aria-hidden />
          </Tab>
        );
      })}
    </div>
  );
}
