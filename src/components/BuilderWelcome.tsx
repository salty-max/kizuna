import { Share2, SlidersHorizontal, UserPlus, WandSparkles } from "lucide-react";

import { useI18n } from "@/i18n";
import { Button, Panel } from "./ui";

interface Props {
  onGenerateExample: () => void;
  onStartManually: () => void;
}

export function BuilderWelcome({ onGenerateExample, onStartManually }: Props) {
  const { t } = useI18n();
  const steps = [
    { icon: WandSparkles, title: t("onboarding.compose"), text: t("onboarding.composeHint") },
    {
      icon: SlidersHorizontal,
      title: t("onboarding.adjust"),
      text: t("onboarding.adjustHint"),
    },
    { icon: Share2, title: t("onboarding.share"), text: t("onboarding.shareHint") },
  ];

  return (
    <Panel title={t("onboarding.title")} raised bodyClassName="flex flex-col gap-4 p-4">
      <div>
        <p className="label-display text-bolt-400">{t("onboarding.eyebrow")}</p>
        <h2 className="mt-1 font-display text-2xl leading-tight font-bold text-ink-50 uppercase italic">
          {t("onboarding.headline")}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{t("onboarding.description")}</p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className="flex gap-3 border-t border-ink-800 pt-2 first:border-0 first:pt-0"
          >
            <span className="flex size-8 shrink-0 items-center justify-center border-2 border-ink-700 bg-ink-950 text-bolt-400">
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-xs font-bold tracking-wide text-ink-100 uppercase italic">
                {index + 1}. {title}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
        <Button
          variant="primary"
          onClick={onGenerateExample}
          icon={<WandSparkles className="size-4" />}
          className="justify-center"
        >
          {t("onboarding.generate")}
        </Button>
        <Button
          onClick={onStartManually}
          icon={<UserPlus className="size-4" />}
          className="justify-center"
        >
          {t("onboarding.manual")}
        </Button>
      </div>
    </Panel>
  );
}
