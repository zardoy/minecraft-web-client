import * as THREE from 'three'

// Create scene, camera and renderer
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// Position camera
camera.position.z = 5

// Create a canvas with some content
const canvas = document.createElement('canvas')
canvas.width = 256
canvas.height = 256
const ctx = canvas.getContext('2d')

scene.background = new THREE.Color(0x444444)

// Draw something on the canvas
ctx.fillStyle = '#444444'
// ctx.fillRect(0, 0, 256, 256)
ctx.fillStyle = 'red'
ctx.font = '48px Arial'
ctx.textAlign = 'center'
ctx.textBaseline = 'middle'
ctx.fillText('Hello!', 128, 128)

// Create bitmap and texture
async function createTexturedBox() {
    const canvas2 = new OffscreenCanvas(256, 256)
    const ctx2 = canvas2.getContext('2d')!
    ctx2.drawImage(canvas, 0, 0)
    const texture = new THREE.Texture(canvas2)
    texture.magFilter = THREE.NearestFilter
    texture.minFilter = THREE.NearestFilter
    texture.needsUpdate = true
    texture.flipY = false

    // Create box with texture
    const geometry = new THREE.BoxGeometry(2, 2, 2)
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        premultipliedAlpha: false,
    })
    const cube = new THREE.Mesh(geometry, material)
    scene.add(cube)
}

// Create the textured box
createTexturedBox()

// Animation loop
function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
}
animate()
