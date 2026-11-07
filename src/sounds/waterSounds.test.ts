import { expect, test } from 'vitest'
import { isWaterBlock, SPLASH_HIGH_SPEED_SOUND, SPLASH_SOUND, SWIM_SOUND, WaterSoundTracker } from './waterSounds'

const still = { x: 0, y: 0, z: 0 }
const mid = () => 0.5 // pitch becomes exactly 1

test('gentle entry plays the normal splash, a fast fall the high speed one', () => {
  const gentle = new WaterSoundTracker(mid)
  expect(gentle.update({ x: 0, y: 64, z: 0 }, { x: 0.05, y: -0.1, z: 0 }, false)).toEqual([])
  const [soft] = gentle.update({ x: 0, y: 63.9, z: 0 }, { x: 0.05, y: -0.1, z: 0 }, true)
  expect(soft.sound).toBe(SPLASH_SOUND)
  expect(soft.pitch).toBe(1)

  const fast = new WaterSoundTracker(mid)
  fast.update({ x: 0, y: 80, z: 0 }, still, false)
  const [hard] = fast.update({ x: 0, y: 64, z: 0 }, { x: 0, y: -3, z: 0 }, true)
  expect(hard.sound).toBe(SPLASH_HIGH_SPEED_SOUND)
  expect(hard.volume).toBeCloseTo(0.6)
})

test('splash only fires on the transition, not every tick in the water', () => {
  const tracker = new WaterSoundTracker(mid)
  tracker.update(still, still, false)
  expect(tracker.update(still, still, true)).toHaveLength(1)
  expect(tracker.update(still, still, true)).toHaveLength(0)
  tracker.update(still, still, false)
  expect(tracker.update(still, still, true)).toHaveLength(1)
})

test('swim sound plays once per ~1.67 blocks travelled in water and never on land', () => {
  const tracker = new WaterSoundTracker(mid)
  const velocity = { x: 0.2, y: 0, z: 0 }
  tracker.update({ x: 0, y: 64, z: 0 }, velocity, true) // splash
  let swims = 0
  for (let i = 1; i <= 55; i++) {
    swims += tracker.update({ x: i * 0.2, y: 64, z: 0 }, velocity, true).filter(s => s.sound === SWIM_SOUND).length
  }
  // 11 blocks * 0.6 = 6.6 -> 6 whole crossings
  expect(swims).toBe(6)

  const land = new WaterSoundTracker(mid)
  land.update(still, velocity, false)
  expect(land.update({ x: 5, y: 0, z: 0 }, velocity, false)).toEqual([])
})

test('swim volume follows vanilla formula and is capped at 1', () => {
  const tracker = new WaterSoundTracker(mid)
  tracker.update(still, still, true)
  const sounds = tracker.update({ x: 0, y: -2, z: 0 }, { x: 0, y: -5, z: 0 }, true)
  expect(sounds.find(s => s.sound === SWIM_SOUND)?.volume).toBe(1)
})

test('water detection covers waterlogged blocks and water plants', () => {
  expect(isWaterBlock({ name: 'water' })).toBe(true)
  expect(isWaterBlock({ name: 'kelp' })).toBe(true)
  expect(isWaterBlock({ name: 'oak_stairs', getProperties: () => ({ waterlogged: true }) })).toBe(true)
  expect(isWaterBlock({ name: 'oak_stairs', getProperties: () => ({ waterlogged: false }) })).toBe(false)
  expect(isWaterBlock({ name: 'air' })).toBe(false)
  expect(isWaterBlock(null)).toBe(false)
})
