import * as THREE from 'three'
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js'
import { FireworksManager } from 'minecraft-renderer/src/three/fireworks'

// Create scene, camera and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setClearColor(new THREE.Color(0x000020), 1)
document.body.appendChild(renderer.domElement)

// Add FirstPersonControls
const controls = new FirstPersonControls(camera, renderer.domElement)
controls.lookSpeed = 0.1
controls.movementSpeed = 20
controls.lookVertical = true
controls.constrainVertical = true
controls.verticalMin = 0.1
controls.verticalMax = Math.PI - 0.1

// Position camera
camera.position.set(0, -40, 170)
camera.lookAt(0, 0, 0)

// Create a helper grid
const grid = new THREE.GridHelper(200, 20, 0x444444, 0x222222)
grid.position.y = -50
scene.add(grid)

// Add ambient light
const ambientLight = new THREE.AmbientLight(0x666666)
scene.add(ambientLight)

// Create fireworks manager with custom config
const fireworksManager = new FireworksManager(scene, {
  maxActiveFireworks: 8,
  defaultParticleSize: 300
})

// Auto-launch settings
let isAutoLaunch = true
let autoLaunchInterval: number | undefined

const startAutoLaunch = () => {
  if (autoLaunchInterval) return
  autoLaunchInterval = window.setInterval(() => {
    if (isAutoLaunch && Math.random() > 0.7) {
      fireworksManager.launchFirework()
    }
  }, 100)
}

const stopAutoLaunch = () => {
  if (autoLaunchInterval) {
    clearInterval(autoLaunchInterval)
    autoLaunchInterval = undefined
  }
}

// Manual launch on click
window.addEventListener('click', () => {
  if (!isAutoLaunch) {
    fireworksManager.launchFirework()
  }
})

// Toggle auto-launch with spacebar
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    isAutoLaunch = !isAutoLaunch
    if (isAutoLaunch) {
      console.log('Auto-launch enabled')
      renderer.domElement.style.cursor = 'auto'
    } else {
      console.log('Auto-launch disabled - click to launch fireworks')
      renderer.domElement.style.cursor = 'pointer'
    }
  }
})

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  const delta = Math.min(clock.getDelta(), 0.1)
  controls.update(delta)

  // Update fireworks
  fireworksManager.update()

  renderer.render(scene, camera)
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// Add clock for controls
const clock = new THREE.Clock()

// Start auto-launch and animation
startAutoLaunch()
animate()

// Log controls
console.log('Controls:')
console.log('- WASD/Arrow keys: Move camera')
console.log('- Mouse: Look around')
console.log('- Space: Toggle auto-launch')
console.log('- Click: Launch firework (when auto-launch is off)')
