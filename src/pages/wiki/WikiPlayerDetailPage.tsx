import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";

import { CharacterModelButton, CharacterModelViewer } from "@/components/CharacterModelViewer";
import {
  AbilityIcon,
  ElementBadge,
  GenderBadge,
  PositionBadge,
  StyleBadge,
} from "@/components/GameIcon";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { StatRadar } from "@/components/StatRadar";
import { Callout, DataList, DataRow, Panel, Tab } from "@/components/ui";
import { loadPlayerDetails } from "@/data/load";
import { useDataset } from "@/data/useDataset";
import { POWER_KEYS, STAT_KEYS, computePower, type BaseStats } from "@/domain/stats";
import type { Ability, LearnedSkill, Player } from "@/domain/types";
import {
  abilityDisplayName,
  playerDetailDescription,
  playerDisplayName,
  teamDisplayName,
  useI18n,
} from "@/i18n";
import {
  abilityTypeLabel,
  buildTypeLabel,
  elementLabel,
  powerLabel,
  rarityDisplayLabel,
  statLabel,
} from "@/i18n/labels";
import { formatNumber } from "@/lib/ui";

type FormTab = "common" | "hero" | "basara";

export function WikiPlayerDetailPage() {
  const { id: rawId } = useParams();
  const id = Number(rawId);
  const { t, locale, showOriginalNames } = useI18n();
  const dataset = useDataset();
  const player = Number.isFinite(id) ? (dataset.players.find((p) => p.id === id) ?? null) : null;

  const [form, setForm] = useState<FormTab>("common");
  const [modelOpen, setModelOpen] = useState(false);
  const [details, setDetails] = useState<Awaited<ReturnType<typeof loadPlayerDetails>>>(null);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    loadPlayerDetails(player.id).then((row) => {
      if (!cancelled) setDetails(row);
    });
    return () => {
      cancelled = true;
    };
  }, [player]);

  const abilitiesById = useMemo(
    () => new Map(dataset.abilities.map((a) => [a.id, a])),
    [dataset.abilities],
  );

  if (!player) {
    return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
        <Panel title={t("wiki.players")}>
          <Callout tone="warn">{t("wiki.notFound")}</Callout>
          <Link to="/wiki/players" className="mt-3 inline-block text-sm text-bolt-400">
            {t("wiki.backToList")}
          </Link>
        </Panel>
      </div>
    );
  }

  const displayName = playerDisplayName(player, showOriginalNames, locale);
  const localName = playerDisplayName(player, false, locale);
  const description = playerDetailDescription(details, locale) || null;
  const hasHero = player.heroStats != null;
  const hasBasara = player.basaraStats != null;
  const activeForm: FormTab =
    form === "hero" && !hasHero ? "common" : form === "basara" && !hasBasara ? "common" : form;

  const stats = statsForForm(player, activeForm);
  const power = computePower(stats);
  const skills = skillsForForm(player, activeForm);

  return (
    <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <Link to="/wiki" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.title")}
        </Link>
        <span className="text-ink-700">/</span>
        <Link to="/wiki/players" className="text-ink-500 no-underline hover:text-bolt-400">
          {t("wiki.players")}
        </Link>
        <span className="text-ink-700">/</span>
        <span className="truncate text-ink-300">{displayName}</span>
      </div>

      <div className="flex flex-col gap-3">
        <Panel bodyClassName="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="relative shrink-0 self-start">
            <PlayerAvatar
              player={player}
              imageBase={dataset.imageBase}
              size={96}
              displayName={displayName}
            />
            <CharacterModelButton
              hasModel={Boolean(player.modelStem)}
              onOpen={() => setModelOpen(true)}
              className="absolute -right-1 -bottom-1 size-8 border-2 border-ink-800 bg-ink-900"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-xl font-bold uppercase italic">{displayName}</h2>
            {player.nameOriginal && player.nameOriginal !== localName && (
              <p className="text-sm text-ink-400">
                {showOriginalNames ? localName : player.nameOriginal}
              </p>
            )}
            <p className="mt-1 text-xs text-ink-500">
              {[teamDisplayName(player, locale), player.game].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <PositionBadge position={player.position} variant="badge" size={20} />
              {player.altPosition && player.altPosition !== player.position && (
                <span className="text-[11px] text-ink-500">
                  {t("wiki.altPosition")}: {player.altPosition}
                </span>
              )}
              <ElementBadge element={player.element} variant="full" size={16} />
              {player.buildType && (
                <StyleBadge buildType={player.buildType} variant="full" size={16} />
              )}
            </div>
            {description && (
              <p className="mt-3 text-sm whitespace-pre-line text-ink-300">{description}</p>
            )}
          </div>
        </Panel>

        {(hasHero || hasBasara) && (
          <div role="tablist" className="flex flex-wrap gap-1">
            <Tab active={activeForm === "common"} onClick={() => setForm("common")}>
              {rarityDisplayLabel(t, "common", player.buildType)}
            </Tab>
            {hasHero && (
              <Tab active={activeForm === "hero"} onClick={() => setForm("hero")}>
                {rarityDisplayLabel(t, "hero", player.buildType)}
              </Tab>
            )}
            {hasBasara && (
              <Tab active={activeForm === "basara"} onClick={() => setForm("basara")}>
                {rarityDisplayLabel(t, "basara", player.buildType)}
              </Tab>
            )}
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <Panel title={t("editor.baseStats")} bodyClassName="flex flex-col gap-3">
            <div className="flex justify-center">
              <StatRadar stats={stats} size={200} />
            </div>
            <DataList>
              {STAT_KEYS.map((key) => (
                <DataRow
                  key={key}
                  label={statLabel(t, key)}
                  value={formatNumber(stats[key], locale)}
                />
              ))}
              <DataRow
                label={t("wiki.field.total")}
                value={formatNumber(
                  STAT_KEYS.reduce((sum, k) => sum + stats[k], 0),
                  locale,
                )}
              />
            </DataList>
          </Panel>

          <Panel title={t("editor.power")} bodyClassName="flex flex-col gap-3">
            <DataList>
              {POWER_KEYS.map((key) => (
                <DataRow
                  key={key}
                  label={powerLabel(t, key)}
                  value={formatNumber(power[key], locale)}
                />
              ))}
            </DataList>

            <DataList>
              <DataRow
                label={t("wiki.field.id")}
                value={<code className="text-xs">{player.id}</code>}
              />
              <DataRow label={t("wiki.field.element")} value={elementLabel(t, player.element)} />
              <DataRow
                label={t("wiki.field.gender")}
                value={<GenderBadge gender={player.gender} variant="full" size={16} />}
              />
              {player.spiritDrop && (
                <DataRow label={t("wiki.field.spiritDrop")} value={t("wiki.spiritDropYes")} />
              )}
              {player.buildType && (
                <DataRow
                  label={t("editor.archetype")}
                  value={buildTypeLabel(t, player.buildType)}
                />
              )}
            </DataList>
          </Panel>
        </div>

        <Panel title={t("editor.skills")} bodyClassName="flex flex-col gap-2">
          <SkillList skills={skills.main} abilitiesById={abilitiesById} locale={locale} />
          {skills.alt.length > 0 && (
            <>
              <p className="label-display mt-2 text-ink-500">{t("editor.branchAlt")}</p>
              <SkillList skills={skills.alt} abilitiesById={abilitiesById} locale={locale} />
            </>
          )}
        </Panel>
      </div>

      {modelOpen && (
        <CharacterModelViewer
          name={displayName}
          imageBase={dataset.imageBase}
          modelStem={player.modelStem}
          characterId={player.characterId}
          onClose={() => setModelOpen(false)}
        />
      )}
    </div>
  );
}

function statsForForm(player: Player, form: FormTab): BaseStats {
  if (form === "hero" && player.heroStats) return player.heroStats.lv99;
  if (form === "basara" && player.basaraStats) return player.basaraStats.lv99;
  return player.stats;
}

function skillsForForm(
  player: Player,
  form: FormTab,
): { main: LearnedSkill[]; alt: LearnedSkill[] } {
  if (form === "hero" && player.heroSkills) {
    return { main: player.heroSkills.skills, alt: player.heroSkills.skillsAlt };
  }
  if (form === "basara" && player.basaraSkills) {
    return { main: player.basaraSkills.skills, alt: player.basaraSkills.skillsAlt };
  }
  return { main: player.skills, alt: player.skillsAlt };
}

function SkillList({
  skills,
  abilitiesById,
  locale,
}: {
  skills: LearnedSkill[];
  abilitiesById: Map<string, Ability>;
  locale: import("@/i18n").Locale;
}) {
  const { t } = useI18n();
  if (skills.length === 0) {
    return <p className="text-xs text-ink-500">{t("wiki.noSkills")}</p>;
  }

  return (
    <ul className="divide-y divide-ink-850 border-2 border-ink-800">
      {skills.map((skill) => {
        const ability = abilitiesById.get(skill.abilityId);
        const name = ability ? abilityDisplayName(ability, locale) : skill.abilityId;
        return (
          <li key={`${skill.level}-${skill.abilityId}`}>
            {ability ? (
              <Link
                to={`/wiki/abilities/${encodeURIComponent(ability.id)}`}
                className="flex items-center gap-3 px-3 py-2 no-underline transition-colors hover:bg-ink-850"
              >
                <span className="w-10 shrink-0 text-[11px] text-ink-500 tnum">
                  {t("editor.level")} {skill.level}
                </span>
                <AbilityIcon ability={ability} size={18} />
                <span className="min-w-0 flex-1 truncate font-display text-sm font-bold uppercase italic">
                  {name}
                </span>
                <span className="shrink-0 text-[11px] text-ink-500">
                  {abilityTypeLabel(t, ability.type)}
                </span>
                {ability.power > 0 && (
                  <span className="w-10 shrink-0 text-right text-sm tnum">{ability.power}</span>
                )}
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2">
                <span className="w-10 shrink-0 text-[11px] text-ink-500 tnum">
                  {t("editor.level")} {skill.level}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink-400">{name}</span>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
