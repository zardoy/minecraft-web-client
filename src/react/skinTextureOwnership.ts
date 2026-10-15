import * as THREE from 'three'

type PlayerObjectWithSkin = {
  skin: {
    map?: THREE.Texture | null
  }
}

export const resolveSkinTexture = async (result: Promise<unknown>): Promise<THREE.Texture | undefined> => {
  const value = await result
  return value instanceof THREE.Texture ? value : undefined
}

export const commitSkinTexture = (playerObject: PlayerObjectWithSkin, texture: THREE.Texture, isCurrent: boolean): boolean => {
  if (!isCurrent) {
    texture.dispose()
    return false
  }

  const previousTexture = playerObject.skin.map
  playerObject.skin.map = texture
  if (previousTexture && previousTexture !== texture) {
    previousTexture.dispose()
  }
  return true
}
