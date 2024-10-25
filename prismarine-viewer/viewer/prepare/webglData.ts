import { join } from 'path'
import fs from 'fs'
import { JsonAtlas } from './atlas'

export type WebglData = ReturnType<typeof prepareWebglData>

export const prepareWebglData = (blockTexturesDir: string, atlas: JsonAtlas) => {
  // todo
  return Object.fromEntries(Object.entries(atlas.textures).map(([texture, { animatedFrames }]) => {
    if (!animatedFrames) return null!
    const mcMeta = JSON.parse(fs.readFileSync(join(blockTexturesDir, texture + '.png.mcmeta'), 'utf8')) as {
      animation: {
        interpolate: boolean,
        frametime: number,
        frames: Array<{
          index: number,
          time: number
        } | number>
      }
    }
    return [texture, {
      animation: {
        ...mcMeta.animation,
        framesCount: animatedFrames
      }
    }] as const
  }).filter(Boolean))
}
