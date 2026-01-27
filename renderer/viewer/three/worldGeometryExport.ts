import * as THREE from 'three'
import type { WorldRendererThree } from './worldrendererThree'

// Format for exported world geometry
export interface ExportedWorldGeometry {
  version: string
  exportedAt: string
  camera: {
    position: { x: number, y: number, z: number }
    rotation: { pitch: number, yaw: number }
  }
  sections: ExportedSection[]
  textureAtlasDataUrl?: string
}

export interface ExportedSection {
  key: string
  position: { x: number, y: number, z: number }
  geometry: {
    positions: number[]
    normals: number[]
    colors: number[]
    uvs: number[]
    indices: number[]
  }
}

/**
 * Export world geometry to a downloadable file
 */
export function exportWorldGeometry (
  worldRenderer: WorldRendererThree,
  cameraPosition: { x: number, y: number, z: number },
  cameraRotation: { pitch: number, yaw: number },
  includeTexture = false
): ExportedWorldGeometry {
  const sections: ExportedSection[] = []

  for (const [key, sectionObject] of Object.entries(worldRenderer.sectionObjects)) {
    const mesh = sectionObject.children.find(child => child.name === 'mesh') as THREE.Mesh | undefined
    if (!mesh?.geometry) continue

    const { geometry } = mesh
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const normalAttr = geometry.getAttribute('normal') as THREE.BufferAttribute
    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute
    const uvAttr = geometry.getAttribute('uv') as THREE.BufferAttribute
    const indexAttr = geometry.index!

    if (!positionAttr || !indexAttr) continue

    sections.push({
      key,
      position: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z
      },
      geometry: {
        positions: [...positionAttr.array],
        normals: normalAttr ? [...normalAttr.array] : [],
        colors: colorAttr ? [...colorAttr.array] : [],
        uvs: uvAttr ? [...uvAttr.array] : [],
        indices: [...indexAttr.array]
      }
    })
  }

  const exportData: ExportedWorldGeometry = {
    version: worldRenderer.version ?? 'unknown',
    exportedAt: new Date().toISOString(),
    camera: {
      position: cameraPosition,
      rotation: cameraRotation
    },
    sections
  }

  // Optionally include texture atlas as data URL
  if (includeTexture && worldRenderer.material.map) {
    const canvas = document.createElement('canvas')
    const texture = worldRenderer.material.map
    const { image } = texture
    if (image) {
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(image, 0, 0)
      exportData.textureAtlasDataUrl = canvas.toDataURL('image/png')
    }
  }

  return exportData
}

/**
 * Download world geometry as JSON file
 */
export function downloadWorldGeometry (
  worldRenderer: WorldRendererThree,
  cameraPosition: { x: number, y: number, z: number },
  cameraRotation: { pitch: number, yaw: number },
  filename = 'world-geometry.json',
  includeTexture = false
) {
  const exportData = exportWorldGeometry(worldRenderer, cameraPosition, cameraRotation, includeTexture)
  const json = JSON.stringify(exportData)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()

  URL.revokeObjectURL(url)
}

/**
 * Load world geometry from URL
 */
export async function loadWorldGeometryFromUrl (url: string): Promise<ExportedWorldGeometry> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch world geometry: ${response.statusText}`)
  }
  return response.json()
}

/**
 * Recreate THREE.js meshes from exported geometry
 * Returns an array of mesh groups that can be added to a scene
 */
export function createMeshesFromExport (
  exportData: ExportedWorldGeometry,
  material: THREE.Material
): THREE.Group[] {
  const groups: THREE.Group[] = []

  for (const section of exportData.sections) {
    const geometry = new THREE.BufferGeometry()

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(section.geometry.positions, 3))
    if (section.geometry.normals.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(section.geometry.normals, 3))
    }
    if (section.geometry.colors.length) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(section.geometry.colors, 3))
    }
    if (section.geometry.uvs.length) {
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(section.geometry.uvs, 2))
    }

    // Use appropriate index type based on vertex count
    const maxIndex = Math.max(...section.geometry.indices)
    const IndexArrayType = maxIndex > 65_535 ? Uint32Array : Uint16Array
    geometry.setIndex(new THREE.BufferAttribute(new IndexArrayType(section.geometry.indices), 1))

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(section.position.x, section.position.y, section.position.z)
    mesh.name = 'mesh'

    const group = new THREE.Group()
    group.name = 'chunk'
    group.add(mesh)

    groups.push(group)
  }

  return groups
}

/**
 * Load texture from data URL and create THREE.js texture
 */
export async function loadTextureFromDataUrl (dataUrl: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const texture = new THREE.Texture(image)
      texture.magFilter = THREE.NearestFilter
      texture.minFilter = THREE.NearestFilter
      texture.needsUpdate = true
      texture.flipY = false
      resolve(texture)
    }
    image.onerror = reject
    image.src = dataUrl
  })
}
