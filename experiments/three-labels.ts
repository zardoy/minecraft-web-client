import * as THREE from 'three'
import { FirstPersonControls } from 'three/addons/controls/FirstPersonControls.js'
import { createWaypointSprite, WAYPOINT_CONFIG } from 'minecraft-renderer/src/three/waypointSprite'

// Create scene, camera and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Add FirstPersonControls
const controls = new FirstPersonControls(camera, renderer.domElement)
controls.lookSpeed = 0.1
controls.movementSpeed = 10
controls.lookVertical = true
controls.constrainVertical = true
controls.verticalMin = 0.1
controls.verticalMax = Math.PI - 0.1

// Position camera
camera.position.y = 1.6 // Typical eye height
camera.lookAt(0, 1.6, -1)

// Create a helper grid and axes
const grid = new THREE.GridHelper(20, 20)
scene.add(grid)
const axes = new THREE.AxesHelper(5)
scene.add(axes)

// Create waypoint sprite via utility
const waypoint = createWaypointSprite({
  position: new THREE.Vector3(0, 0, -5),
  color: 0xff0000,
  label: 'Target',
})
scene.add(waypoint.group)

// Use built-in offscreen arrow from utils
waypoint.enableOffscreenArrow(true)
waypoint.setArrowParent(scene)

// Animation loop
function animate() {
  requestAnimationFrame(animate)

  const delta = Math.min(clock.getDelta(), 0.1)
  controls.update(delta)

  // Unified camera update (size, distance text, arrow, visibility)
  const sizeVec = renderer.getSize(new THREE.Vector2())
  waypoint.updateForCamera(camera.position, camera, sizeVec.width, sizeVec.height)

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

animate()
