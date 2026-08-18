import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Crosshair,
  Gauge,
  Link2,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  X,
} from "lucide-react";
import { useId, useMemo, useState, type ComponentType } from "react";

import { Button, Callout, Chip, IconButton, Panel, Select, Toggle } from "@/components/ui";
import type { Dataset } from "@/domain/types";
import {
  GENERATION_GOALS,
  GENERATION_PLAYSTYLES,
  availableGenerationFormations,
  generateTeamCandidates,
  type GeneratedTeamCandidate,
  type GenerationGoal,
  type GenerationPlaystyle,
  type TeamGenerationOptions,
} from "@/domain/teamGenerator";
import type { Team } from "@/domain/team";
import { useI18n, type MessageKey } from "@/i18n";
import { buildTypeLabel, formationLabel } from "@/i18n/labels";
import { cn } from "@/lib/ui";
import { useDialogFocus } from "./useDialogFocus";

interface Props {
  team: Team;
  dataset: Dataset;
  onApply: (candidate: GeneratedTeamCandidate) => void;
  onClose: () => void;
}

const GOAL_ICONS: Record<GenerationGoal, ComponentType<{ className?: string }>> = {
  competitive: Swords,
  tournament: Trophy,
  pve: Bot,
};

const STYLE_ICONS: Record<GenerationPlaystyle, ComponentType<{ className?: string }>> = {
  auto: Sparkles,
  stable: ShieldCheck,
  counter: Crosshair,
  tension: Gauge,
  bond: Link2,
  aggressive: Swords,
};

export function TeamGenerationWizard({ team, dataset, onApply, onClose }: Props) {
  const { t } = useI18n();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const hasExisting = Object.values(team.slots).some((slot) => slot.playerId != null);
  const [step, setStep] = useState(0);
  const [options, setOptions] = useState<TeamGenerationOptions>({
    goal: team.rulesetId === "tournament" ? "tournament" : "competitive",
    playstyle: "auto",
    formationId: "auto",
    allowAlternatePositions: true,
    preserveExisting: hasExisting,
  });
  const candidates = useMemo(
    () => (step === 2 ? generateTeamCandidates(team, dataset, options) : []),
    [dataset, options, step, team],
  );

  const optionText = (group: "goals" | "styles", id: string, field: "title" | "hint") =>
    t(`generator.${group}.${id}.${field}` as MessageKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/85" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 max-h-[94dvh] w-full max-w-5xl overflow-y-auto outline-none"
      >
        <Panel
          title={
            <span id={titleId} className="flex items-center gap-2">
              <Sparkles className="size-4 text-bolt-ink" aria-hidden />
              {t("generator.title")}
            </span>
          }
          action={
            <IconButton aria-label={t("generator.close")} onClick={onClose}>
              <X className="size-4" />
            </IconButton>
          }
          bodyClassName="flex flex-col gap-4 p-3 sm:p-4"
        >
          <WizardProgress step={step} />

          {step === 0 && (
            <section aria-labelledby={`${titleId}-goal`}>
              <p id={`${titleId}-goal`} className="label-display mb-2 text-ink-300">
                {t("generator.goalTitle")}
              </p>
              <div className="grid gap-2 md:grid-cols-3">
                {GENERATION_GOALS.map((goal) => (
                  <ChoiceCard
                    key={goal}
                    active={options.goal === goal}
                    icon={GOAL_ICONS[goal]}
                    title={optionText("goals", goal, "title")}
                    hint={optionText("goals", goal, "hint")}
                    onClick={() => setOptions((current) => ({ ...current, goal }))}
                  />
                ))}
              </div>
              {options.goal === "tournament" && (
                <Callout tone="warn" className="mt-3">
                  {t("generator.seasonalWarning")}
                </Callout>
              )}
            </section>
          )}

          {step === 1 && (
            <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <section aria-labelledby={`${titleId}-style`}>
                <p id={`${titleId}-style`} className="label-display mb-2 text-ink-300">
                  {t("generator.styleTitle")}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {GENERATION_PLAYSTYLES.map((style) => (
                    <ChoiceCard
                      key={style}
                      compact
                      active={options.playstyle === style}
                      icon={STYLE_ICONS[style]}
                      title={optionText("styles", style, "title")}
                      hint={optionText("styles", style, "hint")}
                      onClick={() => setOptions((current) => ({ ...current, playstyle: style }))}
                    />
                  ))}
                </div>
              </section>

              <section className="flex flex-col gap-3 border-t-2 border-ink-800 pt-3 lg:border-t-0 lg:border-l-2 lg:pt-0 lg:pl-4">
                <label className="flex flex-col gap-1">
                  <span className="label-display text-ink-300">{t("generator.formation")}</span>
                  <Select
                    value={options.formationId}
                    options={[
                      { value: "auto", label: t("generator.formationAuto") },
                      ...availableGenerationFormations().map((formation) => ({
                        value: formation.id,
                        label: formationLabel(t, formation),
                      })),
                    ]}
                    onChange={(formationId) =>
                      setOptions((current) => ({ ...current, formationId }))
                    }
                    aria-label={t("generator.formation")}
                  />
                </label>

                <Toggle
                  checked={options.allowAlternatePositions}
                  onChange={(allowAlternatePositions) =>
                    setOptions((current) => ({ ...current, allowAlternatePositions }))
                  }
                  className="justify-start"
                >
                  {t("generator.allowAlternate")}
                </Toggle>
                <p className="-mt-2 text-[11px] leading-relaxed text-ink-500">
                  {t("generator.allowAlternateHint")}
                </p>

                {hasExisting && (
                  <>
                    <Toggle
                      checked={options.preserveExisting}
                      onChange={(preserveExisting) =>
                        setOptions((current) => ({ ...current, preserveExisting }))
                      }
                      className="justify-start"
                    >
                      {t("generator.preserveExisting")}
                    </Toggle>
                    <p className="-mt-2 text-[11px] leading-relaxed text-ink-500">
                      {t("generator.preserveExistingHint")}
                    </p>
                  </>
                )}
              </section>
            </div>
          )}

          {step === 2 && (
            <section aria-labelledby={`${titleId}-results`}>
              <div className="mb-3">
                <p id={`${titleId}-results`} className="label-display text-ink-300">
                  {t("generator.resultsTitle")}
                </p>
                <p className="mt-1 text-xs text-ink-500">{t("generator.resultsHint")}</p>
              </div>
              <div className="grid gap-3 lg:grid-cols-3">
                {candidates.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} onApply={onApply} />
                ))}
              </div>
              {options.goal === "tournament" && (
                <Callout tone="warn" className="mt-3">
                  {t("generator.seasonalResultWarning")}
                </Callout>
              )}
            </section>
          )}

          <div className="flex items-center justify-between border-t-2 border-ink-800 pt-3">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? onClose() : setStep((current) => current - 1))}
              icon={step > 0 ? <ArrowLeft className="size-4" /> : undefined}
            >
              {step === 0 ? t("app.cancel") : t("generator.back")}
            </Button>
            {step < 2 && (
              <Button
                variant="primary"
                onClick={() => setStep((current) => current + 1)}
                icon={<ArrowRight className="size-4" />}
              >
                {step === 0 ? t("generator.configure") : t("generator.generate")}
              </Button>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function WizardProgress({ step }: { step: number }) {
  const { t } = useI18n();
  const labels = [
    t("generator.steps.goal"),
    t("generator.steps.plan"),
    t("generator.steps.results"),
  ];
  return (
    <ol className="grid grid-cols-3 gap-1" aria-label={t("generator.progress")}>
      {labels.map((label, index) => (
        <li
          key={label}
          aria-current={index === step ? "step" : undefined}
          className={cn(
            "border-b-2 px-1 pb-1 text-center font-display text-[10px] font-bold tracking-wide uppercase italic",
            index <= step ? "border-bolt-ink text-bolt-ink" : "border-ink-800 text-ink-600",
          )}
        >
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function ChoiceCard({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
  compact = false,
}: {
  active: boolean;
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "pressable flex gap-3 border-2 text-left transition-colors",
        compact ? "p-2" : "p-3",
        active
          ? "border-bolt-ink bg-bolt-400/10 text-ink-50"
          : "border-ink-800 bg-ink-900/70 text-ink-300 hover:border-ink-600",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center border-2",
          active ? "border-bolt-ink text-bolt-ink" : "border-ink-700 text-ink-500",
        )}
      >
        <Icon className="size-4" />
      </span>
      <span>
        <span className="flex items-center gap-1 font-display text-sm font-bold uppercase italic">
          {title} {active && <Check className="size-3.5 text-bolt-ink" />}
        </span>
        <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">{hint}</span>
      </span>
    </button>
  );
}

function CandidateCard({
  candidate,
  onApply,
}: {
  candidate: GeneratedTeamCandidate;
  onApply: (candidate: GeneratedTeamCandidate) => void;
}) {
  const { t } = useI18n();
  const profileKey = `generator.profiles.${candidate.id}` as MessageKey;
  const formation = findFormationForCandidate(candidate);
  return (
    <article className="flex flex-col border-2 border-ink-800 bg-ink-900/80 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg font-black text-ink-50 uppercase italic">
            {t(`${profileKey}.title` as MessageKey)}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-ink-500">
            {t(`${profileKey}.hint` as MessageKey)}
          </p>
        </div>
        <Chip>{formationLabel(t, formation)}</Chip>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        <Chip>{buildTypeLabel(t, candidate.primaryBuild)}</Chip>
        <Chip>{`+ ${buildTypeLabel(t, candidate.secondaryBuild)}`}</Chip>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-px bg-ink-800">
        <Metric
          value={`${candidate.metrics.starters}/11`}
          label={t("generator.metrics.starters")}
        />
        <Metric value={candidate.metrics.heroStarters} label={t("generator.metrics.heroes")} />
        <Metric value={candidate.metrics.basaraCount} label={t("generator.metrics.basaras")} />
        <Metric
          value={candidate.metrics.alternatePositions}
          label={t("generator.metrics.alternate")}
        />
        <Metric value={candidate.metrics.elements} label={t("generator.metrics.elements")} />
        <Metric
          value={candidate.metrics.buildMatches}
          label={t("generator.metrics.buildMatches")}
        />
      </dl>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-400">
        <ShieldCheck className="size-3.5 text-[var(--color-good)]" aria-hidden />
        {candidate.metrics.reserveKeeper
          ? t("generator.reserveKeeper")
          : t("generator.noReserveKeeper")}
      </p>

      <Button variant="primary" className="mt-3 justify-center" onClick={() => onApply(candidate)}>
        {t("generator.apply")}
      </Button>
    </article>
  );
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="bg-ink-950/80 p-2 text-center">
      <dt className="text-[9px] tracking-wide text-ink-600 uppercase">{label}</dt>
      <dd className="font-display text-lg font-black text-ink-100 tnum">{value}</dd>
    </div>
  );
}

function findFormationForCandidate(candidate: GeneratedTeamCandidate) {
  return (
    availableGenerationFormations().find(
      (formation) => formation.id === candidate.team.formationId,
    ) ?? availableGenerationFormations()[0]!
  );
}
