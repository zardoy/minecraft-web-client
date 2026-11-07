import * as THREE from 'three'

type PlayerObjectWithSkin = {
  skin: {
    map?: THREE.Texture | null
  }
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
