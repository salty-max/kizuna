import { STAT_KEYS, type BaseStats, type StatKey } from "@/domain/stats";
import { useI18n } from "@/i18n";
import { statLabel } from "@/i18n/labels";
import { cn } from "@/lib/ui";

/**
 * Heptagon radar for the seven base stats.
 *
 * No chart library — a few SVG polys keep the dependency surface flat and match
 * the hard-edged hissatsu look better than a soft d3 blob.
 */

interface Props {
  /** Outer shape — rarity-scaled stats plus equipment. */
  stats: BaseStats;
  /**
   * Optional inner shape (rarity only, no gear). Drawn as a dashed outline so
   * the green equipment lift is visible as the gap between the two.
   */
  base?: BaseStats;
  size?: number;
  className?: string;
}

const SHORT: Record<StatKey, string> = {
  kick: "KIC",
  control: "CTR",
  technique: "TEC",
  pressure: "PRS",
  physical: "PHY",
  agility: "AGI",
  intelligence: "INT",
};

function polar(cx: number, cy: number, radius: number, index: number, n: number) {
  // Start at top, clock-wise.
  const angle = -Math.PI / 2 + (index / n) * Math.PI * 2;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

function polygonPoints(
  values: number[],
  max: number,
  cx: number,
  cy: number,
  radius: number,
): string {
  return values
    .map((value, i) => {
      const r = max > 0 ? (Math.max(0, value) / max) * radius : 0;
      const { x, y } = polar(cx, cy, r, i, values.length);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function StatRadar({ stats, base, size = 220, className }: Props) {
  const { t } = useI18n();
  const n = STAT_KEYS.length;
  const values = STAT_KEYS.map((key) => stats[key]);
  const baseValues = base ? STAT_KEYS.map((key) => base[key]) : null;

  // Absolute scale so a 100-total common and a 250 basara stay comparable.
  // Peak observed basara lines sit ~256; 280 leaves a little headroom.
  const max = 280;

  const pad = 28;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - pad;

  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className={cn("mx-auto block", className)}
      role="img"
      aria-label={t("editor.baseStats")}
    >
      {/* Grid rings */}
      {rings.map((fraction) => (
        <polygon
          key={fraction}
          points={Array.from({ length: n }, (_, i) => {
            const { x, y } = polar(cx, cy, radius * fraction, i, n);
            return `${x},${y}`;
          }).join(" ")}
          fill="none"
          stroke="var(--color-ink-800)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines + labels */}
      {STAT_KEYS.map((key, i) => {
        const tip = polar(cx, cy, radius, i, n);
        const label = polar(cx, cy, radius + 16, i, n);
        return (
          <g key={key}>
            <line
              x1={cx}
              y1={cy}
              x2={tip.x}
              y2={tip.y}
              stroke="var(--color-ink-800)"
              strokeWidth={1}
            />
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-ink-500)"
              fontSize={9}
              fontWeight={700}
              letterSpacing="0.04em"
            >
              <title>{`${statLabel(t, key)}: ${stats[key]}`}</title>
              {SHORT[key]}
            </text>
          </g>
        );
      })}

      {/* Rarity-only outline (no gear) */}
      {baseValues && (
        <polygon
          points={polygonPoints(baseValues, max, cx, cy, radius)}
          fill="none"
          stroke="var(--color-ink-500)"
          strokeWidth={1.5}
          strokeDasharray="3 3"
          opacity={0.85}
        />
      )}

      {/* Final stats fill */}
      <polygon
        points={polygonPoints(values, max, cx, cy, radius)}
        fill="color-mix(in srgb, var(--color-bolt-ink) 22%, transparent)"
        stroke="var(--color-bolt-ink)"
        strokeWidth={2}
        strokeLinejoin="miter"
      />

      {/* Value dots */}
      {values.map((value, i) => {
        const r = (value / max) * radius;
        const { x, y } = polar(cx, cy, r, i, n);
        return <circle key={STAT_KEYS[i]} cx={x} cy={y} r={2.5} fill="var(--color-bolt-ink)" />;
      })}
    </svg>
  );
}
