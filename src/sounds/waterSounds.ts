export const SWIM_SOUND = 'entity.player.swim'
export const SPLASH_SOUND = 'entity.player.splash'
export const SPLASH_HIGH_SPEED_SOUND = 'entity.player.splash.high_speed'
export const UNDERWATER_ENTER_SOUND = 'ambient.underwater.enter'
export const UNDERWATER_EXIT_SOUND = 'ambient.underwater.exit'

/** Vanilla `Entity.moveDist` grows by 0.6 per block moved and a swim sound plays each time it crosses the next whole number. */
const MOVE_DIST_PER_BLOCK = 0.6
const SWIM_VOLUME_FACTOR = 0.35
const SPLASH_VOLUME_FACTOR = 0.2

export type Vec3Like = { x: number; y: number; z: number }

export type WaterSound = { sound: string; volume: number; pitch: number }

/** Blocks per tick, same units as `bot.entity.velocity`. */
const speedScale = (velocity: Vec3Like) => Math.sqrt(velocity.x * velocity.x * 0.2 + velocity.y * velocity.y + velocity.z * velocity.z * 0.2)

const randomPitch = (random: () => number) => 1 + (random() - random()) * 0.4

/**
 * Port of vanilla `Entity.doWaterSplashEffect` + `waterSwimSound`.
 * Feed it one sample per physics tick while the body-in-water state is known.
 */
export class WaterSoundTracker {
  private wasInWater = false
  private lastPosition: Vec3Like | undefined
  private moveDist = 0

  constructor (private readonly random: () => number = Math.random) {}

  reset () {
    this.wasInWater = false
    this.lastPosition = undefined
    this.moveDist = 0
  }

  update (position: Vec3Like, velocity: Vec3Like, inWater: boolean): WaterSound[] {
    const sounds: WaterSound[] = []
    const last = this.lastPosition
    this.lastPosition = { x: position.x, y: position.y, z: position.z }

    if (inWater && !this.wasInWater) {
      const volume = Math.min(1, speedScale(velocity) * SPLASH_VOLUME_FACTOR)
      sounds.push({
        sound: volume < 0.25 ? SPLASH_SOUND : SPLASH_HIGH_SPEED_SOUND,
        volume,
        pitch: randomPitch(this.random)
      })
      this.moveDist = 0
    }
    this.wasInWater = inWater

    if (!inWater || !last) return sounds

    const before = Math.floor(this.moveDist)
    this.moveDist += Math.hypot(position.x - last.x, position.y - last.y, position.z - last.z) * MOVE_DIST_PER_BLOCK
    if (Math.floor(this.moveDist) > before) {
      sounds.push({
        sound: SWIM_SOUND,
        volume: Math.min(1, speedScale(velocity) * SWIM_VOLUME_FACTOR),
        pitch: randomPitch(this.random)
      })
    }
    return sounds
  }
}

const WATER_BLOCKS = new Set(['water', 'bubble_column', 'kelp', 'kelp_plant', 'seagrass', 'tall_seagrass'])

/** Blocks that contain water for the purposes of swimming/diving: water itself, water plants and waterlogged blocks. */
export const isWaterBlock = (block: { name: string; getProperties?: () => Record<string, unknown> } | null | undefined): boolean => {
  if (!block) return false
  if (WATER_BLOCKS.has(block.name)) return true
  return block.getProperties?.().waterlogged === true
}
