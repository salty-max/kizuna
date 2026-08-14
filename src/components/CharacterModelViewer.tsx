import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
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
import { InazugleImage } from "./InazugleImage";
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
 * Compact turntable for Inazugle pre-rendered character frames.
 *
 * Dialog card (not a full-height sheet). Drag or arrow keys spin; bust /
 * full-body tabs swap pose. Explicit close in the title bar and footer.
 */
export function CharacterModelViewer({ name, imageBase, modelStem, characterId, onClose }: Props) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const [pose, setPose] = useState<ModelPose>("bust");
  const [frame, setFrame] = useState(0);
  const drag = useRef<{ active: boolean; startX: number; origin: number } | null>(null);

  const hasModel = modelStem.length > 0;
  const src = hasModel ? modelFrameUrl(imageBase, modelStem, frame, pose, "webp") : "";

  useEffect(() => {
    if (!hasModel) return;
    for (let i = 0; i < MODEL_FRAME_COUNT; i++) {
      const img = new Image();
      img.src = modelFrameUrl(imageBase, modelStem, i, pose, "webp");
    }
  }, [hasModel, imageBase, modelStem, pose]);

  const step = useCallback((delta: number) => {
    setFrame((current) => (current + delta + MODEL_FRAME_COUNT) % MODEL_FRAME_COUNT);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!hasModel) return;
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

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-ink-950/80" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        data-testid="character-model-viewer"
        className="relative z-10 w-full max-w-sm outline-none"
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
              <Box className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{name}</span>
            </span>
          }
          action={
            <IconButton
              onClick={onClose}
              aria-label={t("viewer.close")}
              className="border-ink-950/50 bg-ink-950/20 text-ink-950 hover:border-ink-950 hover:bg-ink-950/30 hover:text-ink-950"
            >
              <X className="size-4" strokeWidth={2.75} />
            </IconButton>
          }
          bodyClassName="flex flex-col gap-2.5"
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
              "relative mx-auto w-full max-w-[15.5rem] overflow-hidden border-2 border-ink-800 bg-ink-950",
              "aspect-[3/4]",
              hasModel && "cursor-grab active:cursor-grabbing touch-none",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {hasModel ? (
              <InazugleImage
                key={src}
                src={src}
                kind="model"
                alt=""
                draggable={false}
                frameClassName="absolute inset-0 flex items-center justify-center"
                className="max-h-full max-w-full select-none object-contain"
                fallback={
                  <span className="flex h-full w-full items-center justify-center px-3 text-center text-sm text-ink-500">
                    {t("viewer.loadError")}
                  </span>
                }
              />
            ) : (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-ink-500">
                {t("viewer.unavailable")}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => step(1)}
              disabled={!hasModel}
              aria-label={t("viewer.rotateLeft")}
            >
              ‹
            </Button>
            <Button
              size="sm"
              onClick={() => step(-1)}
              disabled={!hasModel}
              aria-label={t("viewer.rotateRight")}
            >
              ›
            </Button>
            <Button
              size="sm"
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => setFrame(0)}
              disabled={!hasModel || frame === 0}
            >
              {t("viewer.reset")}
            </Button>
            <span className="ml-auto font-display text-[11px] font-bold tracking-wide text-ink-500 uppercase italic tnum">
              {hasModel ? t("viewer.frame", { n: frame + 1, total: MODEL_FRAME_COUNT }) : null}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink-800 pt-2.5">
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-ink-500">
              {t("viewer.hint")}
            </p>
            <Button size="sm" onClick={onClose} icon={<X className="size-3.5" />}>
              {t("viewer.close")}
            </Button>
          </div>

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
    </div>,
    document.body,
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
