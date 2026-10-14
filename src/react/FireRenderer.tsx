/* eslint-disable no-await-in-loop */
import { useSnapshot } from 'valtio'
import { useEffect, useState } from 'react'
import { getLoadedImage } from 'mc-assets/dist/utils'
import { createCanvas } from 'minecraft-renderer/src/lib/utils'

const TEXTURE_UPDATE_INTERVAL = 100 // 5 times per second

export default () => {
  const { onFire, perspective } = useSnapshot(appViewer.playerState.reactive)
  const [fireTextures, setFireTextures] = useState<string[]>([])
  const [currentTextureIndex, setCurrentTextureIndex] = useState(0)

  useEffect(() => {
    let animationFrameId: number
    let lastTextureUpdate = 0

    const updateTexture = (timestamp: number) => {
      if (onFire && fireTextures.length > 0) {
        if (timestamp - lastTextureUpdate >= TEXTURE_UPDATE_INTERVAL) {
          setCurrentTextureIndex(prev => (prev + 1) % fireTextures.length)
          lastTextureUpdate = timestamp
        }
      }
      animationFrameId = requestAnimationFrame(updateTexture)
    }

    animationFrameId = requestAnimationFrame(updateTexture)
    return () => cancelAnimationFrame(animationFrameId)
  }, [onFire, fireTextures])

  useEffect(() => {
    const loadTextures = async () => {
      const fireImageUrls: string[] = []

      const { resourcesManager } = appViewer
      const { blocksAtlasParser } = resourcesManager
      if (!blocksAtlasParser?.atlas?.latest) {
        console.warn('FireRenderer: Blocks atlas parser not available')
        return
      }

      const keys = Object.keys(blocksAtlasParser.atlas.latest.textures).filter(key => /^fire_\d+$/.exec(key))
      for (const key of keys) {
        const textureInfo = blocksAtlasParser.getTextureInfo(key) as { u: number, v: number, width?: number, height?: number }
        if (textureInfo) {
          const defaultSize = blocksAtlasParser.atlas.latest.tileSize
          const imageWidth = blocksAtlasParser.atlas.latest.width
          const imageHeight = blocksAtlasParser.atlas.latest.height
          const textureWidth = textureInfo.width ?? defaultSize
          const textureHeight = textureInfo.height ?? defaultSize

          // Create a temporary canvas for the full texture
          const tempCanvas = createCanvas(textureWidth, textureHeight)
          const tempCtx = tempCanvas.getContext('2d')
          if (tempCtx && blocksAtlasParser.latestImage) {
            const image = await getLoadedImage(blocksAtlasParser.latestImage)
            tempCtx.drawImage(
              image,
              textureInfo.u * imageWidth,
              textureInfo.v * imageHeight,
              textureWidth,
              textureHeight,
              0,
              0,
              textureWidth,
              textureHeight
            )

            // Create final canvas with only top 20% of the texture
            const finalHeight = Math.ceil(textureHeight * 0.4)
            const canvas = createCanvas(textureWidth, finalHeight)
            const ctx = canvas.getContext('2d')
            if (ctx) {
              // Draw only the top portion
              ctx.drawImage(
                tempCanvas,
                0,
                0, // Start from top
                textureWidth,
                finalHeight,
                0,
                0,
                textureWidth,
                finalHeight
              )

              const blob = await canvas.convertToBlob()
              const url = URL.createObjectURL(blob)
              fireImageUrls.push(url)
            }
          }
        }
      }

      setFireTextures(fireImageUrls)
    }

    // Load textures initially
    if (appViewer.resourcesManager.currentResources) {
      void loadTextures()
    }

    // Set up listener for texture updates
    const onAssetsUpdated = () => {
      void loadTextures()
    }
    appViewer.resourcesManager.on('assetsTexturesUpdated', onAssetsUpdated)

    // Cleanup
    return () => {
      appViewer.resourcesManager.off('assetsTexturesUpdated', onAssetsUpdated)
      // Cleanup texture URLs
      for (const url of fireTextures) URL.revokeObjectURL(url)
    }
  }, [])

  if (!onFire || fireTextures.length === 0 || perspective !== 'first_person') return null

  return (
    <div
      className='fire-renderer-container'
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: '20dvh',
        pointerEvents: 'none',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        overflow: 'hidden',
        zIndex: -1
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          backgroundImage: `url(${fireTextures[currentTextureIndex]})`,
          backgroundSize: '50% 100%',
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat-x',
          opacity: 0.7,
          filter: 'brightness(1.2) contrast(1.2)',
          mixBlendMode: 'screen'
        }}
      />
    </div>
  )
}
