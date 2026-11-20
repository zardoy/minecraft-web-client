const FULL_TURN = Math.PI * 2

/**
 * Next rotation (radians) for the minimap canvas, continuous with the shown one. The canvas turns with a CSS transition, which
 * animates the number itself, while the player's yaw wraps between 0 and 2π: passing that point (a small turn) jumped the number by
 * almost 2π and the map spun all the way round. Turning the shown angle by the shortest way keeps a small turn small.
 */
export const nextMinimapRotation = (shown: number | undefined, yaw: number): number => {
  if (shown === undefined) return yaw
  const delta = ((((yaw - shown) % FULL_TURN) + FULL_TURN * 1.5) % FULL_TURN) - Math.PI
  return shown + delta
}
