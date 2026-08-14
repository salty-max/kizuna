import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/ui";

type Kind = "portrait" | "model" | "equipment";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "onLoad" | "onError" | "src"> {
  src: string;
  /** Visual shell while the remote asset is still on the wire. */
  kind?: Kind;
  /**
   * When the CDN 404s (routine for Inazugle joins), render this instead of a
   * broken glyph. Defaults to nothing — parent decides the empty state.
   */
  fallback?: ReactNode;
  /**
   * Classes for the outer frame that holds the loader + image. Size the frame
   * here (or via width/height on the img for intrinsic layout).
   */
  frameClassName?: string;
}

/**
 * Remote Inazugle artwork with a branded loading surface.
 *
 * CDN latency is normal, not exceptional: the frame fills with the scan/sigil
 * loader, then the image cross-fades in. Failures fall through to `fallback`
 * (or an empty frame) rather than a broken-image icon.
 */
export function InazugleImage({
  src,
  kind = "portrait",
  fallback = null,
  frameClassName,
  className,
  alt = "",
  ...imgProps
}: Props) {
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!src) {
      setPhase("error");
      return;
    }
    let cancelled = false;
    setPhase("loading");

    const probe = new Image();
    const markReady = () => {
      if (!cancelled) setPhase("ready");
    };
    const markError = () => {
      if (!cancelled) setPhase("error");
    };

    probe.onload = markReady;
    probe.onerror = markError;
    probe.src = src;

    // Already in cache: complete fires synchronously before handlers attach.
    if (probe.complete) {
      if (probe.naturalWidth > 0) markReady();
      else if (probe.currentSrc) markError();
    }

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!src || phase === "error") {
    if (!fallback) return null;
    return (
      <span className={cn("relative inline-flex overflow-hidden", frameClassName)}>{fallback}</span>
    );
  }

  return (
    <span className={cn("relative inline-flex overflow-hidden", frameClassName)}>
      <span
        aria-hidden
        className={cn(
          "inazugle-loader absolute inset-0 transition-opacity duration-200",
          phase === "ready" && "pointer-events-none opacity-0",
        )}
      />
      <img
        {...imgProps}
        src={src}
        alt={alt}
        decoding="async"
        data-inazugle-image={kind}
        data-loading={phase === "ready" ? "false" : "true"}
        className={cn(
          "relative z-[1] transition-opacity duration-200",
          phase === "ready" ? "opacity-100" : "opacity-0",
          className,
        )}
        onLoad={() => setPhase("ready")}
        onError={() => setPhase("error")}
      />
    </span>
  );
}
