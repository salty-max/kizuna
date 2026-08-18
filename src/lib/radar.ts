/**
 * Radar chart geometry.
 *
 * Lives outside the component so it can be tested on its own — and because
 * exporting anything but a component from a `.tsx` file costs Fast Refresh.
 */

/**
 * Where a value sits on the axis, as a fraction of the outer ring.
 *
 * Clamped at both ends: a stat above the ceiling used to place its vertex
 * outside the frame, drawing the polygon over the labels instead of pegging it
 * at the edge.
 */
export function axisFraction(value: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.min(1, Math.max(0, value) / max);
}
