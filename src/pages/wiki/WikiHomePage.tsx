import { Link } from "react-router";
import { HeartHandshake, Map, Package, Shield, Sword, Users } from "lucide-react";

import { Panel, PanelHint } from "@/components/ui";
import { useDataset } from "@/data/useDataset";
import { useI18n } from "@/i18n";
import { formatNumber } from "@/lib/ui";

const SECTIONS = [
  {
    to: "/wiki/players",
    labelKey: "wiki.players" as const,
    hintKey: "wiki.playersHint" as const,
    icon: Users,
    countKey: "players" as const,
  },
  {
    to: "/wiki/abilities",
    labelKey: "wiki.abilities" as const,
    hintKey: "wiki.abilitiesHint" as const,
    icon: Sword,
    countKey: "abilities" as const,
  },
  {
    to: "/wiki/equipment",
    labelKey: "wiki.equipment" as const,
    hintKey: "wiki.equipmentHint" as const,
    icon: Package,
    countKey: "equipment" as const,
  },
  {
    to: "/wiki/tactics",
    labelKey: "wiki.tactics" as const,
    hintKey: "wiki.tacticsHint" as const,
    icon: Map,
    countKey: "tactics" as const,
  },
  {
    to: "/wiki/passives",
    labelKey: "wiki.passives" as const,
    hintKey: "wiki.passivesHint" as const,
    icon: Shield,
    countKey: "passives" as const,
  },
  {
    to: "/wiki/bonds",
    labelKey: "wiki.bonds" as const,
    hintKey: "wiki.bondsHint" as const,
    icon: HeartHandshake,
    countKey: "bonds" as const,
  },
] as const;

/** Wiki landing — pick a catalogue to browse. */
export function WikiHomePage() {
  const { t, locale } = useI18n();
  const dataset = useDataset();

  const counts = {
    players: dataset.players.length,
    abilities: dataset.abilities.length,
    equipment: dataset.equipment.length,
    tactics: dataset.tactics.length,
    passives: dataset.passives.length,
    bonds: dataset.synergies.length,
  };

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <Panel title={t("wiki.title")} bodyClassName="flex flex-col gap-4">
        <PanelHint>{t("wiki.homeHint")}</PanelHint>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            return (
              <Link
                key={section.to}
                to={section.to}
                className="panel-flat flex items-start gap-3 p-3 no-underline transition-colors hover:border-bolt-400 hover:bg-ink-850"
              >
                <span className="flex size-10 shrink-0 items-center justify-center border-2 border-ink-700 bg-ink-950 text-bolt-400">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold tracking-wide text-ink-50 uppercase italic">
                    {t(section.labelKey)}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-400">{t(section.hintKey)}</span>
                  <span className="mt-2 block font-display text-[11px] font-bold text-ink-500 tnum uppercase">
                    {formatNumber(counts[section.countKey], locale)}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
