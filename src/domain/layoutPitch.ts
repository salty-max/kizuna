/**
 * Place formation slots so player cards read as an even, non-overlapping pitch.
 *
 * Official Victory Road coordinates were designed for small markers, not our
 * 124×60 sheared cards. They also pack the defensive third tightly and leave
 * large voids between midfield and attack. This layout:
 *
 *  1. clusters nearby depths into "lines" (staggered DFs stay one unit);
 *  2. redistributes those lines evenly from own goal to opposition;
 *  3. preserves relative left/right order, then separates any remaining AABB hits.
 */

export interface PitchSlotPoint {
  id: string;
  /** 0 left … 100 right. */
  x: number;
  /** 0 own goal … 100 opposition. */
  y: number;
}

export interface PitchLayoutOptions {
  /** Playable width in px (board minus horizontal card insets). */
  playableW: number;
  /** Playable height in px (board minus vertical card insets). */
  playableH: number;
  cardW: number;
  cardH: number;
  /**
   * Extra horizontal clearance for CSS `skewX` (AABB grows by height·tanθ).
   * Defaults to ~10px for a −9° shear on a 60px card.
   */
  shearExtraW?: number;
  /** Minimum gap between card AABBs, in px. */
  gap?: number;
  /**
   * Max official-y *span* (0–100) for depths to share one line. Diameter-based
   * so staggered CBs (~9%) merge, but a wing-back row 14% deeper stays its own
   * line (single-linkage would chain them into one fat band).
   */
  lineClusterPct?: number;
}

interface Point {
  id: string;
  x: number;
  y: number;
  ox: number;
  oy: number;
}

/**
 * Return percentage positions for each slot, free of card AABB collisions and
 * with roughly even depth spacing. Pure function — safe to call every render.
 */
export function layoutPitchSlots(
  slots: readonly PitchSlotPoint[],
  options: PitchLayoutOptions,
): PitchSlotPoint[] {
  const {
    playableW: W,
    playableH: H,
    cardW,
    cardH,
    shearExtraW = Math.ceil(cardH * Math.tan((9 * Math.PI) / 180)),
    gap = 6,
    // ~6%: true micro-staggers (1–5%) merge; wing-backs / CAM / wide-FW stay
    // distinct lines so the formation shape still reads.
    lineClusterPct = 6,
  } = options;

  if (W <= 0 || H <= 0 || slots.length === 0) {
    return slots.map((s) => ({ id: s.id, x: s.x, y: s.y }));
  }

  const halfW = (cardW + shearExtraW + gap) / 2;
  const halfH = (cardH + gap) / 2;
  const minDxPct = ((cardW + shearExtraW + gap) / W) * 100;

  const remapped = redistributeDepths(slots, lineClusterPct, minDxPct);

  const pts: Point[] = remapped.map((s) => {
    const x = (s.x / 100) * W;
    const y = (s.y / 100) * H;
    return { id: s.id, x, y, ox: x, oy: y };
  });

  // Soft separation with a decaying spring back to the redistributed targets.
  for (let iter = 0; iter < 80; iter++) {
    separatePairs(pts, halfW, halfH, 0.5);
    const pull = 0.03 * (1 - iter / 80);
    for (const p of pts) {
      p.x += (p.ox - p.x) * pull;
      p.y += (p.oy - p.y) * pull;
      clamp(p, W, H);
    }
  }

  // Hard pass — guarantee zero remaining collisions.
  for (let iter = 0; iter < 60; iter++) {
    if (!separatePairs(pts, halfW, halfH, 0.25)) break;
    for (const p of pts) clamp(p, W, H);
  }

  return pts.map((p) => ({
    id: p.id,
    x: (p.x / W) * 100,
    y: (p.y / H) * 100,
  }));
}

/**
 * Cluster official y values into lines, then space those lines evenly across
 * 0–100. Official markers often stagger a line by a few percent (CBs vs FBs);
 * that offset is smaller than a card, so we collapse each line onto one depth
 * and let left/right carry the shape — re-inflating the stagger was what
 * crushed GK↔DF and opened empty MF↔FW voids.
 */
function redistributeDepths(
  slots: readonly PitchSlotPoint[],
  clusterPct: number,
  minDxPct: number,
): PitchSlotPoint[] {
  const uniqueYs = [...new Set(slots.map((s) => s.y))].sort((a, b) => a - b);
  if (uniqueYs.length <= 1) {
    return slots.map((s) => ({ ...s }));
  }

  // Diameter clustering: a depth joins the current line only if the whole line
  // stays within `clusterPct`. Prevents wing-backs chaining onto CBs.
  const lines: number[][] = [[uniqueYs[0]!]];
  for (let i = 1; i < uniqueYs.length; i++) {
    const y = uniqueYs[i]!;
    const prev = lines[lines.length - 1]!;
    if (y - prev[0]! <= clusterPct) {
      prev.push(y);
    } else {
      lines.push([y]);
    }
  }

  // Even line centres from own goal (0) to opposition (100).
  const lineCount = lines.length;
  const centres = lines.map((_, i) => (lineCount === 1 ? 50 : (i / (lineCount - 1)) * 100));

  const yMap = new Map<number, number>();
  for (let li = 0; li < lines.length; li++) {
    const centre = centres[li]!;
    for (const y of lines[li]!) yMap.set(y, centre);
  }

  const mapped = slots.map((s) => ({
    id: s.id,
    x: s.x,
    y: yMap.get(s.y) ?? s.y,
  }));

  // Horizontal: keep official x, but if same-line slots are closer than a card
  // width in %, spread them while preserving order and centre of mass.
  return spreadCrowdedLines(mapped, minDxPct);
}

/**
 * For each depth band (slots sharing nearly the same y), ensure left-to-right
 * neighbours clear `minDxPct`. Spreads outward from the group's centre of mass
 * so a tight pair of strikers opens without drifting the whole line offside.
 */
function spreadCrowdedLines(slots: PitchSlotPoint[], minDxPct: number): PitchSlotPoint[] {
  // Group by rounded y so floating-point staggers from remapping stay together.
  const groups = new Map<number, PitchSlotPoint[]>();
  for (const s of slots) {
    const key = Math.round(s.y * 100) / 100;
    const g = groups.get(key);
    if (g) g.push(s);
    else groups.set(key, [s]);
  }

  const out: PitchSlotPoint[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      out.push(group[0]!);
      continue;
    }

    const sorted = [...group].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
    const xs = sorted.map((s) => s.x);
    const com = xs.reduce((a, b) => a + b, 0) / xs.length;

    // Iteratively push neighbours apart.
    for (let iter = 0; iter < 40; iter++) {
      let moved = false;
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = xs[i + 1]! - xs[i]!;
        if (gap >= minDxPct) continue;
        const need = (minDxPct - gap) / 2;
        xs[i]! -= need;
        xs[i + 1]! += need;
        moved = true;
      }
      if (!moved) break;
    }

    // Re-centre on original centre of mass, then clamp into 0–100 without
    // reintroducing overlaps if possible.
    const newCom = xs.reduce((a, b) => a + b, 0) / xs.length;
    const shift = com - newCom;
    for (let i = 0; i < xs.length; i++) xs[i]! += shift;

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    if (minX < 0) for (let i = 0; i < xs.length; i++) xs[i]! -= minX;
    if (maxX + (minX < 0 ? -minX : 0) > 100) {
      const overflow = Math.max(...xs) - 100;
      for (let i = 0; i < xs.length; i++) xs[i]! -= overflow;
    }
    for (let i = 0; i < xs.length; i++) {
      xs[i] = Math.max(0, Math.min(100, xs[i]!));
    }

    for (let i = 0; i < sorted.length; i++) {
      out.push({ id: sorted[i]!.id, x: xs[i]!, y: sorted[i]!.y });
    }
  }

  // Restore a stable order matching the input id set (callers map by id).
  const byId = new Map(out.map((s) => [s.id, s]));
  return slots.map((s) => byId.get(s.id) ?? s);
}

/** @returns true if any pair was pushed. */
function separatePairs(pts: Point[], halfW: number, halfH: number, pad: number): boolean {
  let moved = false;
  for (let i = 0; i < pts.length; i++) {
    for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i]!;
      const b = pts[j]!;
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      const overlapX = 2 * halfW - Math.abs(dx);
      const overlapY = 2 * halfH - Math.abs(dy);
      if (overlapX <= 0 || overlapY <= 0) continue;

      moved = true;
      // Resolve along the axis of least penetration so pairs mainly slide
      // sideways or up/down rather than diagonal-jumping out of their line.
      if (overlapX < overlapY) {
        if (Math.abs(dx) < 0.01) dx = a.ox <= b.ox ? 1 : -1;
        const push = (overlapX / 2 + pad) * Math.sign(dx);
        a.x -= push;
        b.x += push;
      } else {
        if (Math.abs(dy) < 0.01) dy = a.oy <= b.oy ? 1 : -1;
        const push = (overlapY / 2 + pad) * Math.sign(dy);
        a.y -= push;
        b.y += push;
      }
    }
  }
  return moved;
}

function clamp(p: Point, W: number, H: number): void {
  p.x = Math.max(0, Math.min(W, p.x));
  p.y = Math.max(0, Math.min(H, p.y));
}
