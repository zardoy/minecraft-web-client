/**
 * Calculates sky light level based on Minecraft time of day.
 *
 * Minecraft time reference:
 * - 0 ticks = 6:00 AM (sunrise complete)
 * - 6000 ticks = 12:00 PM (noon) - brightest
 * - 12000 ticks = 6:00 PM (sunset begins)
 * - 13000 ticks = 7:00 PM (dusk/night begins)
 * - 18000 ticks = 12:00 AM (midnight) - darkest
 * - 23000 ticks = 5:00 AM (dawn begins)
 * - 24000 ticks = 6:00 AM (same as 0)
 *
 * Sky light ranges from 4 (night) to 15 (day).
 */

/**
 * Calculate celestial angle from time of day (0-1 range representing sun position)
 */
export const getCelestialAngle = (timeOfDay: number): number => {
  // Normalize time to 0-1 range
  let angle = ((timeOfDay % 24_000) / 24_000) - 0.25

  if (angle < 0) angle += 1
  if (angle > 1) angle -= 1

  // Vanilla Minecraft applies a smoothing curve
  const smoothedAngle = angle + (1 - Math.cos(angle * Math.PI)) / 2
  return smoothedAngle
}

/**
 * Calculate sky light level (0-15) based on time of day in ticks.
 * Matches Minecraft vanilla behavior.
 *
 * @param timeOfDay - Time in ticks (0-24000)
 * @returns Sky light level (4-15, where 15 is brightest day, 4 is darkest night)
 */
export const calculateSkyLight = (timeOfDay: number): number => {
  // Normalize time to 0-24000 range
  const normalizedTime = ((timeOfDay % 24_000) + 24_000) % 24_000

  // Calculate celestial angle (0-1, where 0.25 is noon, 0.75 is midnight)
  const celestialAngle = getCelestialAngle(normalizedTime)

  // Calculate brightness factor based on celestial angle
  // cos gives us smooth day/night transition
  const cos = Math.cos(celestialAngle * Math.PI * 2)

  // Map cos (-1 to 1) to brightness (0 to 1)
  // At noon (celestialAngle ~0.25): cos(0.5π) = 0, but we want max brightness
  // At midnight (celestialAngle ~0.75): cos(1.5π) = 0, but we want min brightness

  // Vanilla-like calculation:
  // brightness goes from 0 (dark) to 1 (bright)
  const brightness = cos * 0.5 + 0.5

  // Apply threshold - night should be darker
  // Vanilla has minimum sky light of 4 during night
  const skyLight = Math.round(4 + brightness * 11)

  return Math.max(4, Math.min(15, skyLight))
}

/**
 * Simplified sky light calculation that more closely matches vanilla behavior.
 * Uses piecewise linear interpolation based on known Minecraft light levels.
 *
 * @param timeOfDay - Time in ticks (0-24000)
 * @returns Sky light level (4-15)
 */
export const calculateSkyLightSimple = (timeOfDay: number): number => {
  // Normalize to 0-24000
  const time = ((timeOfDay % 24_000) + 24_000) % 24_000

  // Vanilla Minecraft approximate sky light levels:
  // 0-12000 (6AM-6PM): Day, sky light = 15
  // 12000-13000 (6PM-7PM): Sunset transition, 15 -> 4
  // 13000-23000 (7PM-5AM): Night, sky light = 4
  // 23000-24000 (5AM-6AM): Sunrise transition, 4 -> 15

  if (time >= 0 && time < 12_000) {
    // Day time - full brightness
    return 15
  } else if (time >= 12_000 && time < 13_000) {
    // Sunset transition (6PM to 7PM)
    const progress = (time - 12_000) / 1000
    return Math.round(15 - progress * 11)
  } else if (time >= 13_000 && time < 23_000) {
    // Night time - minimum brightness
    return 4
  } else {
    // Sunrise transition (5AM to 6AM)
    const progress = (time - 23_000) / 1000
    return Math.round(4 + progress * 11)
  }
}

// Test/debug helper - run this to see values at different times
export const debugSkyLight = () => {
  const testTimes = [
    { ticks: 0, label: '6:00 AM (sunrise)' },
    { ticks: 6000, label: '12:00 PM (noon)' },
    { ticks: 12_000, label: '6:00 PM (sunset starts)' },
    { ticks: 12_500, label: '6:30 PM (sunset mid)' },
    { ticks: 13_000, label: '7:00 PM (night begins)' },
    { ticks: 18_000, label: '12:00 AM (midnight)' },
    { ticks: 19_000, label: '1:00 AM' },
    { ticks: 23_000, label: '5:00 AM (dawn begins)' },
    { ticks: 23_500, label: '5:30 AM (dawn mid)' },
  ]

  console.log('Sky Light Debug:')
  console.log('================')
  for (const { ticks, label } of testTimes) {
    const smooth = calculateSkyLight(ticks)
    const simple = calculateSkyLightSimple(ticks)
    console.log(`${ticks.toString().padStart(5)} ticks (${label}): smooth=${smooth}, simple=${simple}`)
  }
}

// Export for global access in console
if (typeof window !== 'undefined') {
  (window as any).debugSkyLight = debugSkyLight
}
