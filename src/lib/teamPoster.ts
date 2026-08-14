import { imageUrl } from "@/data/load";
import { layoutPitchSlots } from "@/domain/layoutPitch";
import type { ResolvedSlot, ResolvedTeam } from "@/domain/team";
import type { Element, Rarity } from "@/domain/types";
import { createTranslator, playerCardName, playerDisplayName, type Locale } from "@/i18n";
import { buildTypeLabel, formationLabel } from "@/i18n/labels";

const WIDTH = 1600;
const HEIGHT = 900;
const FIELD = { x: 36, y: 116, width: 1038, height: 744 };
const FIELD_CARD = { width: 168, height: 70 };
const RAIL_X = 1110;
const RAIL_CARD = { width: 212, height: 64 };
const PORTRAIT_LOAD_CONCURRENCY = 6;
const PORTRAIT_LOAD_TIMEOUT_MS = 12_000;
const PORTRAIT_LOAD_ATTEMPTS = 2;

const RARITY_COLORS: Record<Rarity, string> = {
  common: "#7f8790",
  rising: "#56c596",
  advanced: "#5aa9ff",
  top: "#be7cff",
  legendary: "#ffd400",
  hero: "#ff5b62",
  basara: "#ff45bd",
};

const ELEMENT_COLORS: Record<Element, string> = {
  Fire: "#ff6247",
  Wind: "#5eb6ff",
  Mountain: "#dca63c",
  Forest: "#83d633",
};

function posterFilename(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return `kizuna-${slug || "team"}.png`;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 1 && ctx.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, "#0d1016");
  gradient.addColorStop(0.58, "#16121a");
  gradient.addColorStop(1, "#0b0c10");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const facets = [
    ["#ff4b34", 0.1, 0.05, 0.48, 0.42, 0.12],
    ["#ffc400", 0.38, 0.0, 0.8, 0.3, 0.07],
    ["#4f76ff", 0.57, 0.25, 1.0, 0.08, 0.06],
    ["#e9366f", 0.35, 1.0, 0.85, 0.62, 0.05],
  ] as const;
  for (const [color, x1, y1, x2, y2, alpha] of facets) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(WIDTH * x1, HEIGHT * y1);
    ctx.lineTo(WIDTH * x2, HEIGHT * y2);
    ctx.lineTo(WIDTH * (x2 - 0.24), HEIGHT * (y2 + 0.32));
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

async function loadPortraits(
  slots: readonly ResolvedSlot[],
  imageBase: string,
): Promise<Map<number, HTMLImageElement>> {
  const players = new Map(
    slots.flatMap((slot) => (slot.player?.image ? [[slot.player.id, slot.player] as const] : [])),
  );
  const loaded = new Map<number, HTMLImageElement>();

  const queue = [...players.values()];
  let cursor = 0;
  const loadOne = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const image = new Image();
      let settled = false;
      const finish = (result: HTMLImageElement | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        resolve(result);
      };
      const timeout = window.setTimeout(() => finish(null), PORTRAIT_LOAD_TIMEOUT_MS);
      image.crossOrigin = "anonymous";
      image.onload = () => finish(image);
      image.onerror = () => finish(null);
      image.src = src;
    });

  const worker = async () => {
    while (cursor < queue.length) {
      const player = queue[cursor++];
      if (!player) return;
      const src = imageUrl(imageBase, player.image, 180);
      for (let attempt = 0; attempt < PORTRAIT_LOAD_ATTEMPTS; attempt += 1) {
        const image = await loadOne(src);
        if (image) {
          loaded.set(player.id, image);
          break;
        }
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(PORTRAIT_LOAD_CONCURRENCY, queue.length) }, () => worker()),
  );
  return loaded;
}

function drawCard(
  ctx: CanvasRenderingContext2D,
  slot: ResolvedSlot,
  x: number,
  y: number,
  width: number,
  height: number,
  portraits: ReadonlyMap<number, HTMLImageElement>,
  locale: Locale,
  showOriginalNames: boolean,
  slotLabel: string,
) {
  const player = slot.player;
  ctx.save();
  roundedRect(ctx, x + 5, y + 6, width, height, 8);
  ctx.fillStyle = `${RARITY_COLORS[slot.rarity]}55`;
  ctx.fill();
  roundedRect(ctx, x, y, width, height, 8);
  ctx.fillStyle = "rgba(9, 10, 14, 0.94)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = player ? RARITY_COLORS[slot.rarity] : "#363a44";
  ctx.stroke();

  ctx.font = "700 15px system-ui, sans-serif";
  ctx.fillStyle = "#9ca3af";
  ctx.fillText(slotLabel.toUpperCase(), x + 12, y + 20);

  if (!player) {
    ctx.font = "italic 700 17px system-ui, sans-serif";
    ctx.fillStyle = "#555b66";
    ctx.fillText("—", x + 12, y + height - 14);
    ctx.restore();
    return;
  }

  const portrait = portraits.get(player.id);
  const portraitSize = height - 6;
  if (portrait) {
    ctx.save();
    roundedRect(ctx, x + width - portraitSize - 3, y + 3, portraitSize, portraitSize, 6);
    ctx.clip();
    ctx.drawImage(portrait, x + width - portraitSize - 3, y + 3, portraitSize, portraitSize);
    ctx.restore();
  } else {
    ctx.fillStyle = ELEMENT_COLORS[player.element];
    ctx.beginPath();
    ctx.arc(x + width - height / 2, y + height / 2, height * 0.32, 0, Math.PI * 2);
    ctx.fill();
    const initials = playerDisplayName(player, showOriginalNames, locale)
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("");
    ctx.fillStyle = "#08090c";
    ctx.font = "800 18px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(initials, x + width - height / 2, y + height / 2 + 6);
    ctx.textAlign = "left";
  }

  ctx.fillStyle = "#f7f7f4";
  const name = playerCardName(player, showOriginalNames, locale).toUpperCase();
  const nameWidth = width - portraitSize - 24;
  let nameSize = 21;
  do {
    ctx.font = `italic 800 ${nameSize}px system-ui, sans-serif`;
    nameSize -= 1;
  } while (nameSize >= 12 && ctx.measureText(name).width > nameWidth);
  ctx.fillText(name, x + 12, y + height - 13);
  ctx.restore();
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG export failed"))),
      "image/png",
    );
  });
}

async function createTeamPoster(
  resolved: ResolvedTeam,
  imageBase: string,
  locale: Locale,
  showOriginalNames: boolean,
): Promise<Blob> {
  await document.fonts?.ready;
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  const { t } = createTranslator(locale);
  const portraits = await loadPortraits(resolved.slots, imageBase);

  drawBackground(ctx);
  ctx.fillStyle = "#ff4b34";
  ctx.fillRect(36, 88, 1038, 7);
  ctx.fillStyle = "#ffd400";
  ctx.fillRect(RAIL_X, 88, 454, 7);

  ctx.font = "italic 900 28px system-ui, sans-serif";
  ctx.fillStyle = "#ff4b34";
  ctx.fillText("KIZUNA", 36, 48);
  ctx.font = "italic 900 42px system-ui, sans-serif";
  ctx.fillStyle = "#f7f7f4";
  ctx.fillText(fitText(ctx, resolved.team.name || t("team.defaultName"), 720), 36, 82);
  ctx.font = "700 18px system-ui, sans-serif";
  ctx.fillStyle = "#a7abb4";
  const metadata = [
    formationLabel(t, resolved.formation),
    t(`rulesets.${resolved.team.rulesetId}`),
    resolved.team.teamBuildType ? buildTypeLabel(t, resolved.team.teamBuildType) : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  ctx.fillText(metadata, 800, 70);

  roundedRect(ctx, FIELD.x, FIELD.y, FIELD.width, FIELD.height, 14);
  ctx.fillStyle = "rgba(7, 9, 13, 0.68)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const playableW = FIELD.width - FIELD_CARD.width - 48;
  const playableH = FIELD.height - FIELD_CARD.height - 56;
  const laidOut = layoutPitchSlots(resolved.formation.slots, {
    playableW,
    playableH,
    cardW: FIELD_CARD.width,
    cardH: FIELD_CARD.height,
  });
  const positions = new Map(laidOut.map((slot) => [slot.id, slot]));
  for (const formationSlot of resolved.formation.slots) {
    const slot = resolved.slots.find((candidate) => candidate.slotId === formationSlot.id);
    if (!slot) continue;
    const position = positions.get(formationSlot.id) ?? formationSlot;
    const x = FIELD.x + 24 + (position.x / 100) * playableW;
    const y = FIELD.y + FIELD.height - 28 - FIELD_CARD.height - (position.y / 100) * playableH;
    drawCard(
      ctx,
      slot,
      x,
      y,
      FIELD_CARD.width,
      FIELD_CARD.height,
      portraits,
      locale,
      showOriginalNames,
      slot.expectedPosition ?? "",
    );
  }

  const groups = [
    { label: t("pitch.bench"), slots: resolved.slots.filter((slot) => slot.kind === "bench") },
    {
      label: t("pitch.staff"),
      slots: resolved.slots.filter((slot) => slot.kind === "coach" || slot.kind === "manager"),
    },
  ];
  let sectionY = 132;
  for (const group of groups) {
    ctx.font = "italic 900 24px system-ui, sans-serif";
    ctx.fillStyle = "#f7f7f4";
    ctx.fillText(group.label.toUpperCase(), RAIL_X, sectionY);
    sectionY += 18;
    group.slots.forEach((slot, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const label =
        slot.kind === "coach"
          ? t("pitch.coach")
          : slot.kind === "manager"
            ? t("pitch.manager", { n: slot.slotId.replace("manager", "") })
            : t("pitch.benchSlot", { n: slot.slotId.replace("bench", "") });
      drawCard(
        ctx,
        slot,
        RAIL_X + column * (RAIL_CARD.width + 16),
        sectionY + 14 + row * (RAIL_CARD.height + 14),
        RAIL_CARD.width,
        RAIL_CARD.height,
        portraits,
        locale,
        showOriginalNames,
        label,
      );
    });
    sectionY += Math.ceil(group.slots.length / 2) * (RAIL_CARD.height + 14) + 60;
  }

  ctx.font = "700 16px system-ui, sans-serif";
  ctx.fillStyle = "#686d77";
  ctx.fillText("KIZUNA · INAZUMA ELEVEN: VICTORY ROAD TEAM BUILDER", RAIL_X, 870);
  return canvasToBlob(canvas);
}

export async function downloadTeamPoster(
  resolved: ResolvedTeam,
  imageBase: string,
  locale: Locale,
  showOriginalNames: boolean,
): Promise<void> {
  const blob = await createTeamPoster(resolved, imageBase, locale, showOriginalNames);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = posterFilename(resolved.team.name);
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const teamPosterInternals = { posterFilename };
