import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import itemsAtlas from 'mc-assets/dist/itemsAtlasLegacy.png'
import { createItemMeshFromCanvas, createItemMesh } from 'minecraft-renderer/src/three/itemMesh'

// Create scene, camera and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Setup camera and controls
camera.position.set(0, 0, 3)
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Background and lights
scene.background = new THREE.Color(0x333333)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

// Animation loop
function animate () {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

async function setupItemMesh () {
  try {
    const loader = new THREE.TextureLoader()
    const atlasTexture = await loader.loadAsync(itemsAtlas)

    // Pixel-art configuration
    atlasTexture.magFilter = THREE.NearestFilter
    atlasTexture.minFilter = THREE.NearestFilter
    atlasTexture.generateMipmaps = false
    atlasTexture.wrapS = atlasTexture.wrapT = THREE.ClampToEdgeWrapping

    // Extract the tile at x=2, y=0 (16x16)
    const tileSize = 16
    const tileX = 2
    const tileY = 0

    const canvas = document.createElement('canvas')
    canvas.width = tileSize
    canvas.height = tileSize
    const ctx = canvas.getContext('2d')!

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(
      atlasTexture.image,
      tileX * tileSize,
      tileY * tileSize,
      tileSize,
      tileSize,
      0,
      0,
      tileSize,
      tileSize
    )

    // Test both approaches - working manual extraction:
    const meshOld = createItemMeshFromCanvas(canvas, { depth: 0.1 })
    meshOld.position.x = -1
    meshOld.rotation.x = -Math.PI / 12
    meshOld.rotation.y = Math.PI / 12
    scene.add(meshOld)

    // And new unified function:
    const atlasWidth = atlasTexture.image.width
    const atlasHeight = atlasTexture.image.height
    const u = (tileX * tileSize) / atlasWidth
    const v = (tileY * tileSize) / atlasHeight
    const sizeX = tileSize / atlasWidth
    const sizeY = tileSize / atlasHeight

    console.log('Debug texture coords:', {u, v, sizeX, sizeY, atlasWidth, atlasHeight})

    const resultNew = createItemMesh(atlasTexture, {
      u, v, sizeX, sizeY
    }, {
      faceCamera: false,
      use3D: true,
      depth: 0.1
    })

    resultNew.mesh.position.x = 1
    resultNew.mesh.rotation.x = -Math.PI / 12
    resultNew.mesh.rotation.y = Math.PI / 12
    scene.add(resultNew.mesh)

    animate()
  } catch (err) {
    console.error('Failed to create item mesh:', err)
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Start
setupItemMesh()
