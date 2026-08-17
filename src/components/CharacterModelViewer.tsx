import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { Box, ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from "lucide-react";

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

/**
 * Inazugle renders both poses with a lot of empty margin: measured across six
 * characters, the subject fills 32–66% of a bust frame's width and 23–51% of a
 * full-body one. Shown untouched, the character sat at about a third of the
 * viewer. These bases lift the typical character to roughly two thirds of the
 * frame while still leaving the widest sampled one uncropped — the rest is the
 * reader's to adjust, which is what the zoom buttons are for.
 */
const POSE_BASE_SCALE: Record<ModelPose, number> = { bust: 1.5, full: 1.25 };

/**
 * The subject's vertical centre sits at 54–70% of the frame, never above it, so
 * every pose carries more dead space overhead than underfoot. Nudging the image
 * up re-centres the character instead of the transparent padding.
 */
const VERTICAL_BIAS = "-6%";

const ZOOM_STEP = 0.25;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value * 100) / 100));
}

interface Props {
  name: string;
  imageBase: string;
  modelStem: string;
  characterId: string;
  onClose: () => void;
}

function preloadUrls(urls: string[]): Promise<"ready" | "error"> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<"ok" | "err">((resolve) => {
          const img = new Image();
          img.onload = () => resolve("ok");
          img.onerror = () => resolve("err");
          img.src = url;
          if (img.complete && img.naturalWidth > 0) resolve("ok");
        }),
    ),
  ).then((results) => (results.every((r) => r === "ok") ? "ready" : "error"));
}

/**
 * Turntable for Inazugle pre-rendered frames.
 *
 * All frames for the active pose load once up front. Rotation never re-enters
 * a loading state — only pose changes re-prefetches the ring.
 */
export function CharacterModelViewer({ name, imageBase, modelStem, characterId, onClose }: Props) {
  const { t, locale } = useI18n();
  const titleId = useId();
  const dialogRef = useDialogFocus<HTMLDivElement>(onClose);
  const [pose, setPose] = useState<ModelPose>("bust");
  const [frame, setFrame] = useState(0);
  const [ring, setRing] = useState<"loading" | "ready" | "error">("loading");
  // A multiplier on the pose base, not an absolute scale: switching pose then
  // keeps whatever the reader chose instead of snapping back.
  const [zoom, setZoom] = useState(1);
  const drag = useRef<{ active: boolean; startX: number; origin: number } | null>(null);

  const hasModel = modelStem.length > 0;
  const frameUrls = useMemo(() => {
    if (!hasModel) return [] as string[];
    return Array.from({ length: MODEL_FRAME_COUNT }, (_, i) =>
      modelFrameUrl(imageBase, modelStem, i, pose, "webp"),
    );
  }, [hasModel, imageBase, modelStem, pose]);

  useEffect(() => {
    if (!hasModel || frameUrls.length === 0) {
      setRing(hasModel ? "error" : "loading");
      return;
    }
    let cancelled = false;
    setRing("loading");
    setFrame(0);
    void preloadUrls(frameUrls).then((status) => {
      if (!cancelled) setRing(status);
    });
    return () => {
      cancelled = true;
    };
  }, [frameUrls, hasModel]);

  const step = useCallback((delta: number) => {
    setFrame((current) => (current + delta + MODEL_FRAME_COUNT) % MODEL_FRAME_COUNT);
  }, []);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (ring !== "ready") return;
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

  const ready = ring === "ready";
  const currentSrc = ready ? frameUrls[frame] : "";
  const scale = POSE_BASE_SCALE[pose] * zoom;

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
            if (ready) step(1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            if (ready) step(-1);
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
            <Tab
              active={pose === "bust"}
              onClick={() => setPose("bust")}
              disabled={ring === "loading"}
            >
              {t("viewer.poseBust")}
            </Tab>
            <Tab
              active={pose === "full"}
              onClick={() => setPose("full")}
              disabled={ring === "loading"}
            >
              {t("viewer.poseFull")}
            </Tab>
          </div>

          <div
            className={cn(
              "relative mx-auto w-full max-w-[15.5rem] overflow-hidden border-2 border-ink-800 bg-ink-950",
              // Square, because the full-body frames are square and the bust
              // ones landscape: a portrait box letterboxed both of them.
              "aspect-square",
              ready && "cursor-grab active:cursor-grabbing touch-none",
            )}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {!hasModel ? (
              <p className="flex h-full items-center justify-center px-4 text-center text-sm text-ink-500">
                {t("viewer.unavailable")}
              </p>
            ) : ring === "loading" ? (
              <span aria-hidden className="inazugle-loader absolute inset-0" />
            ) : ring === "error" ? (
              <p className="flex h-full items-center justify-center px-3 text-center text-sm text-ink-500">
                {t("viewer.loadError")}
              </p>
            ) : (
              <img
                src={currentSrc}
                alt=""
                draggable={false}
                decoding="async"
                data-inazugle-image="model"
                style={{ transform: `translateY(${VERTICAL_BIAS}) scale(${scale})` }}
                className="absolute inset-0 m-auto max-h-full max-w-full origin-center select-none object-contain"
              />
            )}
          </div>

          {/* One row, one control height. Icon-only throughout: the display font
              is uppercase italic, which turned a `<` into a leaning glyph and
              made the cluster read as two unrelated toolbars. */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <IconButton
                onClick={() => step(1)}
                disabled={!ready}
                aria-label={t("viewer.rotateLeft")}
              >
                <ChevronLeft className="size-4" />
              </IconButton>
              <IconButton
                onClick={() => step(-1)}
                disabled={!ready}
                aria-label={t("viewer.rotateRight")}
              >
                <ChevronRight className="size-4" />
              </IconButton>
              <IconButton
                onClick={() => {
                  setFrame(0);
                  setZoom(1);
                }}
                disabled={!ready || (frame === 0 && zoom === 1)}
                aria-label={t("viewer.reset")}
              >
                <RotateCcw className="size-4" />
              </IconButton>
            </div>

            <div className="flex items-center gap-1 border-l-2 border-ink-800 pl-2">
              <IconButton
                onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))}
                disabled={!ready || zoom <= ZOOM_MIN}
                aria-label={t("viewer.zoomOut")}
              >
                <Minus className="size-4" />
              </IconButton>
              <IconButton
                onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))}
                disabled={!ready || zoom >= ZOOM_MAX}
                aria-label={t("viewer.zoomIn")}
              >
                <Plus className="size-4" />
              </IconButton>
            </div>

            <span className="ml-auto text-right font-display text-[11px] font-bold tracking-wide text-ink-500 uppercase italic tnum">
              <span className="block">
                {ready ? t("viewer.frame", { n: frame + 1, total: MODEL_FRAME_COUNT }) : null}
              </span>
              <span data-model-zoom className="block">
                {ready ? t("viewer.zoomLevel", { n: Math.round(zoom * 100) }) : null}
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t-2 border-ink-800 pt-2.5">
            <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-ink-500">
              {t("viewer.hint")}
            </p>
            <Button onClick={onClose} icon={<X className="size-4" />}>
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
      // Every call site overlays this on a portrait, and `InazugleImage` raises
      // its `<img>` to `z-[1]` — without a higher layer the image swallows the
      // click across everything but the few pixels outside the avatar box.
      className={cn("z-[2]", className)}
    >
      <Box className="size-4" />
    </IconButton>
  );
}
