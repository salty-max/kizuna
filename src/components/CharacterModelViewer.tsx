import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Box, RotateCcw, X } from "lucide-react";

import {
  MODEL_FRAME_COUNT,
  inazugleModelViewerUrl,
  modelFrameUrl,
  type ModelPose,
} from "@/lib/inazugleModel";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/ui";
import { Button, IconButton, Panel, Tab } from "@/components/ui";
import { useDialogFocus } from "./useDialogFocus";

const DRAG_THRESHOLD_PX = 14;

interface Props {
  /** Display title (localised player name). */
  name: string;
  imageBase: string;
  /** Relative CDN stem; empty when no turntable is indexed. */
  modelStem: string;
  /** Inazugle catalogue id for the external link fallback. */
  characterId: string;
  onClose: () => void;
}

/**
 * In-house turntable for Inazugle pre-rendered character frames.
 *
 * Drag (or arrow keys) to spin; tabs switch bust / full-body. Same CDN and
 * asset model as portraits — no WebGL dependency.
 */
export function CharacterModelViewer({ name, imageBase, modelStem, characterId, onClose }: Props) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const [pose, setPose] = useState<ModelPose>("bust");
  const [frame, setFrame] = useState(0);
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ active: boolean; startX: number; origin: number } | null>(null);

  const hasModel = modelStem.length > 0;
  const src = hasModel ? modelFrameUrl(imageBase, modelStem, frame, pose, "webp") : "";

  useEffect(() => {
    setFailed(false);
  }, [src]);

  // Prefetch the rest of the ring once the first frame is known good.
  useEffect(() => {
    if (!hasModel || failed) return;
    for (let i = 0; i < MODEL_FRAME_COUNT; i++) {
      const img = new Image();
      img.src = modelFrameUrl(imageBase, modelStem, i, pose, "webp");
    }
  }, [hasModel, failed, imageBase, modelStem, pose]);

  const step = useCallback((delta: number) => {
    setFrame((current) => (current + delta + MODEL_FRAME_COUNT) % MODEL_FRAME_COUNT);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasModel || failed) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { active: true, startX: event.clientX, origin: frame };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state?.active) return;
    const diff = event.clientX - state.startX;
    if (Math.abs(diff) < DRAG_THRESHOLD_PX) return;
    const steps = Math.trunc(diff / DRAG_THRESHOLD_PX);
    setFrame(
      (((state.origin - steps) % MODEL_FRAME_COUNT) + MODEL_FRAME_COUNT) % MODEL_FRAME_COUNT,
    );
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
    drag.current = null;
  };

  const externalUrl = characterId
    ? inazugleModelViewerUrl(characterId, locale === "ja" ? "ja" : locale === "fr" ? "fr" : "en")
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md outline-none"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            step(-1);
          }
        }}
      >
        <Panel
          title={
            <span id={titleId} className="flex min-w-0 items-center gap-2">
              <Box className="size-4 shrink-0 text-bolt-400" aria-hidden />
              <span className="truncate">{name}</span>
            </span>
          }
          action={
            <IconButton onClick={onClose} aria-label={t("app.importClose")}>
              <X className="size-4" />
            </IconButton>
          }
          bodyClassName="flex flex-col gap-3"
        >
          <div role="tablist" className="flex gap-1">
            <Tab active={pose === "bust"} onClick={() => setPose("bust")}>
              {t("viewer.poseBust")}
            </Tab>
            <Tab active={pose === "full"} onClick={() => setPose("full")}>
              {t("viewer.poseFull")}
            </Tab>
          </div>

          <div
            className={cn(
              "relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden",
              "border-2 border-ink-800 bg-ink-950",
              hasModel && !failed && "cursor-grab active:cursor-grabbing touch-none",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {hasModel && !failed ? (
              <img
                src={src}
                alt=""
                draggable={false}
                className="max-h-full max-w-full select-none object-contain"
                onError={() => setFailed(true)}
              />
            ) : (
              <p className="px-4 text-center text-sm text-ink-500">
                {hasModel ? t("viewer.loadError") : t("viewer.unavailable")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => step(1)}
              disabled={!hasModel || failed}
              aria-label={t("viewer.rotateLeft")}
            >
              ‹
            </Button>
            <Button
              size="sm"
              onClick={() => step(-1)}
              disabled={!hasModel || failed}
              aria-label={t("viewer.rotateRight")}
            >
              ›
            </Button>
            <Button
              size="sm"
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => setFrame(0)}
              disabled={!hasModel || failed || frame === 0}
            >
              {t("viewer.reset")}
            </Button>
            <span className="ml-auto font-display text-[11px] font-bold tracking-wide text-ink-500 uppercase italic tnum">
              {hasModel && !failed
                ? t("viewer.frame", { n: frame + 1, total: MODEL_FRAME_COUNT })
                : null}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-ink-500">{t("viewer.hint")}</p>

          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="text-xs text-bolt-400 no-underline hover:underline"
            >
              {t("viewer.openInazugle")}
            </a>
          )}
        </Panel>
      </div>
    </div>
  );
}

/** Compact control that opens the turntable when a model stem is available. */
export function CharacterModelButton({
  hasModel,
  onOpen,
  className,
}: {
  hasModel: boolean;
  onOpen: () => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <IconButton
      onClick={onOpen}
      disabled={!hasModel}
      title={hasModel ? t("viewer.open") : t("viewer.unavailable")}
      aria-label={hasModel ? t("viewer.open") : t("viewer.unavailable")}
      className={className}
    >
      <Box className="size-4" />
    </IconButton>
  );
}
