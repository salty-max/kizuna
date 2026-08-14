/**
 * Inazugle character turntable helpers.
 *
 * The official "3D" viewer is eight pre-rendered frames on the same CDN as
 * portraits — not GLB/WebGL. We hotlink those frames the same way we do
 * portraits (`imageBase` + relative path).
 */

export const MODEL_FRAME_COUNT = 8;
export type ModelPose = "bust" | "full";

/** Encode the `q` query used by Inazugle's character viewer pages. */
export function encodeInazugleCharacterQuery(characterId: string): string {
  const payload = JSON.stringify({ character_id: [characterId] });
  const bytes = new Uint8Array(payload.length);
  for (let i = 0; i < payload.length; i++) bytes[i] = payload.charCodeAt(i)! ^ 0xff;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function inazugleModelViewerUrl(
  characterId: string,
  locale: "en" | "fr" | "ja" = "en",
): string {
  const lang = locale === "ja" ? "" : `/${locale}`;
  return `https://zukan.inazuma.jp${lang}/chara_model_view/?q=${encodeInazugleCharacterQuery(characterId)}`;
}

/**
 * Relative CDN stem without extension, e.g. `1/k/q/l/qluc-tlklmm`.
 * Frame URLs append `_r{n}` or `_r{n}_fullbody` + `.webp`/`.png`.
 */
export function modelFrameUrl(
  imageBase: string,
  modelStem: string,
  frameIndex: number,
  pose: ModelPose,
  format: "webp" | "png" = "webp",
): string {
  const base = imageBase.endsWith("/") ? imageBase : `${imageBase}/`;
  const stem = modelStem.replace(/^\/+/, "").replace(/\.webp$|\.png$/i, "");
  const index = ((frameIndex % MODEL_FRAME_COUNT) + MODEL_FRAME_COUNT) % MODEL_FRAME_COUNT;
  const suffix = pose === "full" ? "_fullbody" : "";
  return `${base}${stem}_r${index}${suffix}.${format}`;
}

/** Extract the turntable stem from an Inazugle model-view HTML page. */
export function parseModelStemFromHtml(html: string): string | null {
  const match =
    html.match(/cloudfront\.net\/(1\/k\/[^`"'\s]+?)`\s*\+\s*`_r/) ??
    html.match(/cloudfront\.net\/(1\/k\/[a-z0-9/_-]+)_r\d/);
  return match?.[1] ?? null;
}
