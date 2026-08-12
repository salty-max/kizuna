import { LOCALES, LOCALE_LABELS, useI18n, type Locale } from "@/i18n";
import { cn } from "@/lib/ui";
import { Select, Toggle } from "./ui";

/** Choix de langue et bascule des noms d'origine — même chrome que le reste. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, setLocale, showOriginalNames, setShowOriginalNames, t } = useI18n();

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <Select
        value={locale}
        options={LOCALES.map((code) => ({ value: code, label: LOCALE_LABELS[code] }))}
        onChange={(next) => setLocale(next as Locale)}
        aria-label={t("app.language")}
        className="w-28"
      />

      <Toggle
        checked={showOriginalNames}
        onChange={setShowOriginalNames}
        hint={t("app.originalNamesHint")}
      >
        {t("app.originalNames")}
      </Toggle>
    </div>
  );
}
