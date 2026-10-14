import blocksAtlas from 'mc-assets/dist/blocksAtlases.json'
import itemsAtlas from 'mc-assets/dist/itemsAtlases.json'
import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

interface AtlasFile {
  latest: {
    suSv: number
    tileSize: number
    width: number
    height: number
    textures: {
      [key: string]: {
        u: number
        v: number
        su: number
        sv: number
        tileIndex: number
      }
    }
  }
}

async function patchTextureAtlas(
  atlasType: 'blocks' | 'items',
  atlasData: AtlasFile,
  customTexturesDir: string,
  distDir: string
) {
  // Check if custom textures directory exists and has files
  if (!fs.existsSync(customTexturesDir) || fs.readdirSync(customTexturesDir).length === 0) {
    return
  }

  // Find the latest atlas file
  const atlasFiles = fs.readdirSync(distDir)
    .filter(file => file.startsWith(`${atlasType}AtlasLatest`) && file.endsWith('.png'))
    .sort()

  if (atlasFiles.length === 0) {
    console.log(`No ${atlasType}AtlasLatest.png found in ${distDir}`)
    return
  }

  const latestAtlasFile = atlasFiles[atlasFiles.length - 1]
  const atlasPath = path.join(distDir, latestAtlasFile)
  console.log(`Patching ${atlasPath}`)

  // Get atlas dimensions
  const atlasMetadata = await sharp(atlasPath).metadata()
  if (!atlasMetadata.width || !atlasMetadata.height) {
    throw new Error(`Failed to get atlas dimensions for ${atlasPath}`)
  }

  // Process each custom texture
  const customTextureFiles = fs.readdirSync(customTexturesDir)
    .filter(file => file.endsWith('.png'))

  if (customTextureFiles.length === 0) return

  // Prepare composite operations
  const composites: sharp.OverlayOptions[] = []

  for (const textureFile of customTextureFiles) {
    const textureName = path.basename(textureFile, '.png')

    if (atlasData.latest.textures[textureName]) {
      const textureData = atlasData.latest.textures[textureName]
      const customTexturePath = path.join(customTexturesDir, textureFile)

      try {
        // Convert UV coordinates to pixel coordinates
        const x = Math.round(textureData.u * atlasMetadata.width)
        const y = Math.round(textureData.v * atlasMetadata.height)
        const width = Math.round((textureData.su ?? atlasData.latest.suSv) * atlasMetadata.width)
        const height = Math.round((textureData.sv ?? atlasData.latest.suSv) * atlasMetadata.height)

        // Resize custom texture to match atlas dimensions and add to composite operations
        const resizedTextureBuffer = await sharp(customTexturePath)
          .resize(width, height, {
            fit: 'fill',
            kernel: 'nearest' // Preserve pixel art quality
          })
          .png()
          .toBuffer()

        composites.push({
          input: resizedTextureBuffer,
          left: x,
          top: y,
          blend: 'over'
        })

        console.log(`Prepared ${textureName} at (${x}, ${y}) with size (${width}, ${height})`)
      } catch (error) {
        console.error(`Failed to prepare ${textureName}:`, error)
      }
    } else {
      console.warn(`Texture ${textureName} not found in ${atlasType} atlas`)
    }
  }

  if (composites.length > 0) {
    // Apply all patches at once using Sharp's composite
    await sharp(atlasPath)
      .composite(composites)
      .png()
      .toFile(atlasPath + '.tmp')

    // Replace original with patched version
    fs.renameSync(atlasPath + '.tmp', atlasPath)
    console.log(`Saved patched ${atlasType} atlas to ${atlasPath}`)
  }
}

async function main() {
  const customBlocksDir = './assets/customTextures/blocks'
  const customItemsDir = './assets/customTextures/items'
  const distDir = './dist/static/image'

  try {
    // Patch blocks atlas
    await patchTextureAtlas('blocks', blocksAtlas as unknown as AtlasFile, customBlocksDir, distDir)

    // Patch items atlas
    await patchTextureAtlas('items', itemsAtlas as unknown as AtlasFile, customItemsDir, distDir)

    console.log('Texture atlas patching completed!')
  } catch (error) {
    console.error('Failed to patch texture atlases:', error)
    process.exit(1)
  }
}

// Run the script
main()
