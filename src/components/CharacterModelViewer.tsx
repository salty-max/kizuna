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
              "aspect-[3/4]",
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
                className="absolute inset-0 m-auto max-h-full max-w-full select-none object-contain"
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => step(1)}
              disabled={!ready}
              aria-label={t("viewer.rotateLeft")}
            >
              ‹
            </Button>
            <Button
              size="sm"
              onClick={() => step(-1)}
              disabled={!ready}
              aria-label={t("viewer.rotateRight")}
            >
              ›
            </Button>
            <Button
              size="sm"
              icon={<RotateCcw className="size-3.5" />}
              onClick={() => setFrame(0)}
              disabled={!ready || frame === 0}
            >
              {t("viewer.reset")}
            </Button>
            <span className="ml-auto font-display text-[11px] font-bold tracking-wide text-ink-500 uppercase italic tnum">
              {ready ? t("viewer.frame", { n: frame + 1, total: MODEL_FRAME_COUNT }) : null}
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
