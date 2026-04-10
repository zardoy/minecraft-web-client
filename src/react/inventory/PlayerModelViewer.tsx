import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { createPlayerObject, applySkinToPlayerObject, PlayerObjectType } from '../../../renderer/viewer/lib/createPlayerObject'

const setupMaterialTransparency = (material: THREE.Material): void => {
  if (
    material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshPhongMaterial
  ) {
    const hasAlpha = material.alphaMap ||
      (material.opacity !== undefined && material.opacity < 1) ||
      (material.map && material.map.format === THREE.RGBAFormat)
    if (hasAlpha) {
      material.transparent = true
      material.alphaTest = 0.01
      material.side = THREE.DoubleSide
    } else {
      material.transparent = false
      material.side = THREE.FrontSide
    }
    material.needsUpdate = true
  }
}

export function PlayerModelViewer ({ width, height }: { width: number; height: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer
    camera: THREE.PerspectiveCamera
    scene: THREE.Scene
    controls: OrbitControls
    playerObject: PlayerObjectType
    wrapper: THREE.Object3D
    disposed: boolean
  } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Scene
    const scene = new THREE.Scene()
    scene.background = null

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 0, 3)

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.useLegacyLights = false
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.minPolarAngle = Math.PI / 2
    controls.maxPolarAngle = Math.PI / 2
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Lights
    const ambientLight = new THREE.AmbientLight(0xff_ff_ff, 3)
    scene.add(ambientLight)
    const cameraLight = new THREE.PointLight(0xff_ff_ff, 0.6)
    camera.add(cameraLight)
    scene.add(camera)

    // Player model
    const { playerObject, wrapper } = createPlayerObject({ scale: 1 })
    playerObject.ears.visible = false
    playerObject.cape.visible = false

    wrapper.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        if (Array.isArray(child.material)) {
          for (const mat of child.material) setupMaterialTransparency(mat)
        } else {
          setupMaterialTransparency(child.material)
        }
      }
    })

    // Scale to fit camera view
    const box = new THREE.Box3().setFromObject(wrapper)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const cameraDistance = camera.position.z
    const fov = camera.fov * Math.PI / 180
    const visibleHeight = 2 * Math.tan(fov / 2) * cameraDistance
    const visibleWidth = visibleHeight * (width / height)
    const scaleFactor = Math.min(visibleHeight / size.y, visibleWidth / size.x)
    wrapper.scale.multiplyScalar(scaleFactor)
    wrapper.position.sub(center.multiplyScalar(scaleFactor))
    wrapper.rotation.set(0, 0, 0)
    scene.add(wrapper)

    // Render helper
    const render = () => { renderer.render(scene, camera) }

    // Apply skin
    const skinUrl = (appViewer?.playerState?.reactive as any)?.playerSkin ?? ''
    void applySkinToPlayerObject(playerObject, skinUrl).then(() => { render() })

    // Render on orbit change
    controls.addEventListener('change', render)
    render()

    // Cursor following
    let waitingRender = false
    const handlePointerMove = (event: PointerEvent) => {
      const el = containerRef.current
      if (!el) return

      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const normalizedX = (event.clientX - centerX) / (rect.width / 2)
      const normalizedY = (event.clientY - centerY) / (rect.height / 2)

      const maxAngle = Math.PI * (60 / 180)
      const clampedX = THREE.MathUtils.clamp(normalizedX, -1, 1)
      const clampedY = THREE.MathUtils.clamp(normalizedY, -1, 1)
      const headYaw = clampedX * maxAngle
      const headPitch = clampedY * maxAngle

      playerObject.skin.head.rotation.y = THREE.MathUtils.lerp(playerObject.skin.head.rotation.y, headYaw, 0.1)
      playerObject.skin.head.rotation.x = THREE.MathUtils.lerp(playerObject.skin.head.rotation.x, headPitch, 0.1)
      playerObject.rotation.y = THREE.MathUtils.lerp(playerObject.rotation.y, headYaw * 0.3, 0.05)

      if (!waitingRender) {
        requestAnimationFrame(() => {
          render()
          waitingRender = false
        })
        waitingRender = true
      }
    }
    window.addEventListener('pointermove', handlePointerMove)

    stateRef.current = { renderer, camera, scene, controls, playerObject, wrapper, disposed: false }

    return () => {
      if (stateRef.current) stateRef.current.disposed = true
      window.removeEventListener('pointermove', handlePointerMove)
      controls.removeEventListener('change', render)
      controls.dispose()

      wrapper.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (Array.isArray(child.material)) {
            for (const mat of child.material) mat.dispose()
          } else {
            child.material?.dispose()
          }
          child.geometry?.dispose()
        }
      })
      if (playerObject.skin.map) {
        (playerObject.skin.map as unknown as THREE.Texture).dispose()
      }
      renderer.dispose()
      renderer.domElement?.remove()
      stateRef.current = null
    }
  }, [])

  // Handle resize
  useEffect(() => {
    const s = stateRef.current
    if (!s || s.disposed) return
    s.renderer.setSize(width, height)
    s.camera.aspect = width / height
    s.camera.updateProjectionMatrix()
    s.renderer.render(s.scene, s.camera)
  }, [width, height])

  return <div ref={containerRef} style={{ width, height, overflow: 'hidden', pointerEvents: 'auto' }} />
}
