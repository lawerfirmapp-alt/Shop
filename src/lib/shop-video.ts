/** How the shop video introduces itself: it pops up on open, hides, pops up once more, then waits to be pressed. */
export const SHOP_VIDEO = {
  /** Seconds the video stays on screen each time it pops up by itself. */
  showSeconds: 8,
  /** Seconds it stays hidden between the two automatic pop-ups. */
  gapSeconds: 12,
  /** Automatic pop-ups per visit; after these it plays only when pressed. */
  autoShows: 2,
} as const;

/** Start and end times (seconds after the page opens) of each automatic pop-up. */
export function autoShowWindows(plan: { showSeconds: number; gapSeconds: number; autoShows: number } = SHOP_VIDEO) {
  return Array.from({ length: plan.autoShows }, (_, i) => {
    const start = i * (plan.showSeconds + plan.gapSeconds);
    return { start, end: start + plan.showSeconds };
  });
}
