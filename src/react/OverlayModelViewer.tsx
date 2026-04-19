import { proxy, useSnapshot, subscribe } from 'valtio'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { applySkinToPlayerObject, createPlayerObject, PlayerObjectType } from '../../renderer/viewer/lib/createPlayerObject'
import { currentScaling } from '../scaleInterface'
import { activeModalStack } from '../globalState'


export const modelViewerState = proxy({
  model: undefined as undefined | {
    models?: string[] // Array of model URLs (URL itself is the cache key)
    steveModelSkin?: string
    debug?: boolean
    // absolute positioning
    positioning: {
      windowWidth: number
      windowHeight: number
      x: number
      y: number
      width: number
      height: number
      scaled?: boolean
      onlyInitialScale?: boolean
    }
    followCursor?: boolean
    followCursorCenter?: {
      x: number
      y: number
    }
    modelCustomization?: { [modelUrl: string]: { color?: string, opacity?: number, metalness?: number, roughness?: number, rotation?: { x?: number, y?: number, z?: number } } }
    resetRotationOnReleae?: boolean
    continiousRender?: boolean
    alwaysRender?: boolean
    playModelAnimation?: string
    playModelAnimationSpeed?: number
    playModelAnimationLoop?: boolean
    followCursorCenterDebug?: boolean
    zIndex?: number
  }
})
globalThis.modelViewerState = modelViewerState

// Global debug function to get camera and model values
globalThis.getModelViewerValues = () => {
  const scene = globalThis.sceneRef?.current
  if (!scene) return null

  const { camera, playerObject } = scene
  if (!playerObject) return null

  const wrapper = playerObject.parent
  if (!wrapper) return null

  const box = new THREE.Box3().setFromObject(wrapper)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())

  return {
    camera: {
      position: camera.position.clone(),
      fov: camera.fov,
      aspect: camera.aspect
    },
    model: {
      position: wrapper.position.clone(),
      rotation: wrapper.rotation.clone(),
      scale: wrapper.scale.clone(),
      size,
      center
    },
    cursor: {
      position: globalThis.cursorPosition || { x: 0, y: 0 },
      normalized: globalThis.cursorPosition ? {
        x: globalThis.cursorPosition.x * 2 - 1,
        y: globalThis.cursorPosition.y * 2 - 1
      } : { x: 0, y: 0 }
    },
    visibleArea: {
      height: 2 * Math.tan(camera.fov * Math.PI / 180 / 2) * camera.position.z,
      width: 2 * Math.tan(camera.fov * Math.PI / 180 / 2) * camera.position.z * camera.aspect
    }
  }
}

subscribe(activeModalStack, () => {
  if (!modelViewerState.model || !modelViewerState.model?.alwaysRender) {
    return
  }
  if (activeModalStack.length === 0) {
    modelViewerState.model = undefined
  }
})

// Helper function to setup material transparency
const setupMaterialTransparency = (material: THREE.Material): void => {
  if (material instanceof THREE.MeshStandardMaterial ||
    material instanceof THREE.MeshBasicMaterial ||
    material instanceof THREE.MeshPhongMaterial) {
    // Check if material should be transparent
    const hasAlpha = material.alphaMap ||
      (material.opacity !== undefined && material.opacity < 1) ||
      (material.map && material.map.format === THREE.RGBAFormat)

    if (hasAlpha) {
      // Configure transparency properly
      material.transparent = true
      material.alphaTest = 0.01 // Lower threshold for better transparency
      material.side = THREE.DoubleSide // Show both sides for transparent materials
      // Keep depthWrite enabled as requested - don't disable it
    } else {
      // Opaque materials
      material.transparent = false
      material.side = THREE.FrontSide
    }
    material.needsUpdate = true
  }
}

// Helper function to check if mesh is transparent
const isMeshTransparent = (mesh: THREE.Mesh): boolean => {
  if (Array.isArray(mesh.material)) {
    return mesh.material.some(mat => mat.transparent)
  }
  return mesh.material.transparent
}

/**
 * Shared player model renderer that mounts directly into its host container.
 * Unlike the default OverlayModelViewer (which uses position:fixed + global modelViewerState),
 * this component renders at the given dimensions without any absolute positioning —
 * suitable for embedding inside inventory UI slots or any other container.
 *
 * The `skinUrl` prop is reactive: changing it re-applies the skin on the already-running scene.
 */
export const PlayerModelCanvas = ({
  width,
  height,
  skinUrl = '',
  followCursor = true,
  computeNormalized,
}: {
  width: number
  height: number
  skinUrl?: string
  followCursor?: boolean
  /** Optional override for cursor normalisation. Receives raw clientX/Y and must return
   *  values in [-1, 1] relative to the desired center point. When omitted the canvas
   *  bounding-rect center is used (correct for inline/container mounting). Pass this when
   *  the viewer is inside a scaled overlay so cursor coords can be projected relative to
   *  the virtual window instead of the physical canvas element. */
  computeNormalized?: (clientX: number, clientY: number) => { normalizedX: number; normalizedY: number }
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [skinReady, setSkinReady] = useState(false)
  const playerObjectRef = useRef<PlayerObjectType | null>(null)
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    camera: THREE.PerspectiveCamera
    scene: THREE.Scene
    controls: OrbitControls
    render: () => void
  } | null>(null)
  // Always-fresh ref so the pointer-move closure never goes stale
  const computeNormalizedRef = useRef(computeNormalized)
  useEffect(() => { computeNormalizedRef.current = computeNormalized })

  // Three.js scene setup — runs once on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.background = null

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 0, 3)

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.useLegacyLights = false
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.setSize(width, height)
    container.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.minPolarAngle = Math.PI / 2
    controls.maxPolarAngle = Math.PI / 2
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    const ambientLight = new THREE.AmbientLight(0xff_ff_ff, 3)
    scene.add(ambientLight)
    const cameraLight = new THREE.PointLight(0xff_ff_ff, 0.6)
    camera.add(cameraLight)
    scene.add(camera)

    const { playerObject, wrapper } = createPlayerObject({ scale: 1 })
    playerObject.ears.visible = false
    playerObject.cape.visible = false

    wrapper.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        for (const mat of mats) setupMaterialTransparency(mat)
      }
    })

    // Scale to fill camera view
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

    playerObjectRef.current = playerObject
    const render = () => { renderer.render(scene, camera) }
    sceneRef.current = { renderer, camera, scene, controls, render }

    controls.addEventListener('change', render)
    render()

    // Cursor-following: rotate head/body toward pointer
    let waitingRender = false
    const handlePointerMove = (event: PointerEvent) => {
      const el = containerRef.current
      if (!el) return
      let nx: number
      let ny: number
      if (computeNormalizedRef.current) {
        const result = computeNormalizedRef.current(event.clientX, event.clientY)
        nx = THREE.MathUtils.clamp(result.normalizedX, -1, 1)
        ny = THREE.MathUtils.clamp(result.normalizedY, -1, 1)
      } else {
        const rect = el.getBoundingClientRect()
        nx = THREE.MathUtils.clamp((event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2), -1, 1)
        ny = THREE.MathUtils.clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1)
      }
      const maxAngle = Math.PI * (60 / 180)
      playerObject.skin.head.rotation.y = THREE.MathUtils.lerp(playerObject.skin.head.rotation.y, nx * maxAngle, 0.1)
      playerObject.skin.head.rotation.x = THREE.MathUtils.lerp(playerObject.skin.head.rotation.x, ny * maxAngle, 0.1)
      playerObject.rotation.y = THREE.MathUtils.lerp(playerObject.rotation.y, nx * maxAngle * 0.3, 0.05)
      if (!waitingRender) {
        requestAnimationFrame(() => { render(); waitingRender = false })
        waitingRender = true
      }
    }
    if (followCursor) window.addEventListener('pointermove', handlePointerMove)

    return () => {
      if (followCursor) window.removeEventListener('pointermove', handlePointerMove)
      controls.removeEventListener('change', render)
      controls.dispose()
      wrapper.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material]
          for (const mat of mats) (mat as THREE.Material).dispose()
          child.geometry?.dispose()
        }
      })
      if ((playerObject.skin as any).map) {
        ((playerObject.skin as any).map as THREE.Texture).dispose()
      }
      renderer.dispose()
      renderer.domElement?.remove()
      sceneRef.current = null
      playerObjectRef.current = null
    }
  }, [])

  // Reactively re-apply skin whenever the skinUrl prop changes (including initial mount)
  useEffect(() => {
    const playerObject = playerObjectRef.current
    const s = sceneRef.current
    if (!playerObject || !s) return
    void applySkinToPlayerObject(playerObject, skinUrl).then(() => {
      s.render()
      setSkinReady(true)
    })
  }, [skinUrl])

  // Propagate size changes to the running renderer
  useEffect(() => {
    const s = sceneRef.current
    if (!s) return
    s.renderer.setSize(width, height)
    s.camera.aspect = width / height
    s.camera.updateProjectionMatrix()
    s.render()
  }, [width, height])

  return <div ref={containerRef} style={{ width, height, overflow: 'hidden', pointerEvents: 'auto', visibility: skinReady ? 'visible' : 'hidden' }} />
}

export default () => {
  const { model } = useSnapshot(modelViewerState)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    dispose: () => void
  }>()
  const initialScale = useMemo(() => {
    return currentScaling.scale
  }, [])
  globalThis.sceneRef = sceneRef

  const getUiScaleFactor = (scaled?: boolean, onlyInitialScale?: boolean) => {
    return scaled ? (onlyInitialScale ? initialScale : currentScaling.scale) : 1
  }
  const windowRef = useRef<HTMLDivElement>(null)
  // Compute normalised cursor coords relative to the virtual window space (used by PlayerModelCanvas
  // when mounted inside the overlay so head-tracking works across the scaled inventory window).
  const computeNormalizedFromClient = (clientX: number, clientY: number) => {
    const { positioning, followCursorCenter } = modelViewerState.model!
    const { windowWidth, windowHeight } = positioning
    const rect = windowRef.current?.getBoundingClientRect()
    const effectiveScale = rect ? (rect.width / windowWidth) : getUiScaleFactor(positioning.scaled, positioning.onlyInitialScale)

    const centerPxX = (followCursorCenter?.x ?? (windowWidth / 2)) * effectiveScale
    const centerPxY = (followCursorCenter?.y ?? (windowHeight / 2)) * effectiveScale

    const localX = rect ? (clientX - rect.left) : clientX
    const localY = rect ? (clientY - rect.top) : clientY

    const denomX = rect ? (rect.width / 2) : (window.innerWidth / 2)
    const denomY = rect ? (rect.height / 2) : (window.innerHeight / 2)
    const normalizedX = (localX - centerPxX) / denomX
    const normalizedY = (localY - centerPxY) / denomY
    return { normalizedX, normalizedY }
  }


  // Model management state
  const loadedModels = useRef<Map<string, THREE.Object3D>>(new Map())
  const modelLoaders = useRef<Map<string, GLTFLoader | OBJLoader>>(new Map())
  const animationMixers = useRef<Map<string, THREE.AnimationMixer>>(new Map())
  const gltfClips = useRef<Map<string, THREE.AnimationClip[]>>(new Map())
  const activeActions = useRef<Map<string, THREE.AnimationAction>>(new Map())
  const clockRef = useRef(new THREE.Clock())
  const mixersAnimatingRef = useRef(false)
  const rafIdRef = useRef<number | undefined>(undefined)

  const updateAllMixers = (delta: number) => {
    for (const mixer of animationMixers.current.values()) {
      mixer.update(delta)
    }
  }

  const anyActionActive = () => {
    // Consider actions active as soon as they're enabled, even before first mixer.update
    for (const action of activeActions.current.values()) {
      if (action.enabled) return true
    }
    return false
  }

  const ensureMixerLoop = (render: () => void) => {
    if (mixersAnimatingRef.current) return
    mixersAnimatingRef.current = true
    const tick = () => {
      const delta = clockRef.current.getDelta()
      updateAllMixers(delta)
      render()
      if (anyActionActive()) {
        rafIdRef.current = requestAnimationFrame(tick)
      } else {
        mixersAnimatingRef.current = false
        rafIdRef.current = undefined
      }
    }
    rafIdRef.current = requestAnimationFrame(tick)
  }

  const playAnimationForModel = (modelUrl: string, animName: string | undefined, render: () => void) => {
    const clips = gltfClips.current.get(modelUrl)
    const mixer = animationMixers.current.get(modelUrl)
    if (!clips || !mixer) {
      return
    }
    // stop previous
    const prev = activeActions.current.get(modelUrl)
    if (prev) {
      prev.stop()
      activeActions.current.delete(modelUrl)
    }
    if (!animName) {
      return
    }
    const clip = clips.find(c => c.name === animName)
    if (!clip) return
    const action = mixer.clipAction(clip)
    const loop = modelViewerState.model?.playModelAnimationLoop ?? true
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    const speed = modelViewerState.model?.playModelAnimationSpeed ?? 1
    action.timeScale = speed
    action.reset().fadeIn(0.1).play()
    activeActions.current.set(modelUrl, action)
    ensureMixerLoop(render)
  }

  const applyAnimationParamsToAll = () => {
    const loop = modelViewerState.model?.playModelAnimationLoop ?? true
    const speed = modelViewerState.model?.playModelAnimationSpeed ?? 1
    for (const [modelUrl, action] of activeActions.current) {
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
      action.timeScale = speed
    }
  }

  // Model management functions
  const loadModel = (modelUrl: string) => {
    if (loadedModels.current.has(modelUrl)) return // Already loaded

    const isGLTF = modelUrl.toLowerCase().endsWith('.gltf') || modelUrl.toLowerCase().endsWith('.glb')
    const loader = isGLTF ? new GLTFLoader() : new OBJLoader()
    modelLoaders.current.set(modelUrl, loader)

    const onLoad = (object: THREE.Object3D, animations?: THREE.AnimationClip[]) => {
      // Apply customization if available
      const customization = model?.modelCustomization?.[modelUrl]
      if (customization?.rotation) {
        object.rotation.set(customization.rotation.x ?? 0, customization.rotation.y ?? 0, customization.rotation.z ?? 0)
      }
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | THREE.MeshPhongMaterial

          if (material && customization) {
            if (customization.color) {
              material.color.setHex(parseInt(customization.color.replace('#', ''), 16))
            }
            if (customization.opacity !== undefined) {
              material.opacity = customization.opacity
              material.transparent = customization.opacity < 1
            }
            if (material instanceof THREE.MeshStandardMaterial) {
              if (customization.metalness !== undefined) {
                material.metalness = customization.metalness
              }
              if (customization.roughness !== undefined) {
                material.roughness = customization.roughness
              }
            }
          }

          // Enable transparency for materials that need it
          if (material) {
            if (Array.isArray(material)) {
              for (const mat of material) {
                setupMaterialTransparency(mat)
              }
            } else {
              setupMaterialTransparency(material)
            }
          }
        }
      })

      // Center and scale model
      const box = new THREE.Box3().setFromObject(object)
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 2 / maxDim
      object.scale.setScalar(scale)
      object.position.sub(center.multiplyScalar(scale))

      // Store the model using URL as key
      loadedModels.current.set(modelUrl, object)
      sceneRef.current?.scene.add(object)

      // Setup animations for GLTF
      if (animations && animations.length > 0) {
        const mixer = new THREE.AnimationMixer(object)
        animationMixers.current.set(modelUrl, mixer)
        gltfClips.current.set(modelUrl, animations)
        // Auto-play current requested animation if set
        const render = () => sceneRef.current?.renderer.render(sceneRef.current.scene, sceneRef.current.camera)
        playAnimationForModel(modelUrl, modelViewerState.model?.playModelAnimation, render)
      }

      // Trigger render
      if (sceneRef.current) {
        setTimeout(() => {
          const render = () => sceneRef.current?.renderer.render(sceneRef.current.scene, sceneRef.current.camera)
          render()
        }, 0)
      }
    }

    if (isGLTF) {
      (loader as GLTFLoader).load(modelUrl, (gltf) => {
        onLoad(gltf.scene, gltf.animations)
      })
    } else {
      (loader as OBJLoader).load(modelUrl, onLoad)
    }
  }

  const removeModel = (modelUrl: string) => {
    const model = loadedModels.current.get(modelUrl)
    if (model) {
      sceneRef.current?.scene.remove(model)
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.material) {
            if (Array.isArray(child.material)) {
              for (const mat of child.material) {
                mat.dispose()
              }
            } else {
              child.material.dispose()
            }
          }
          if (child.geometry) {
            child.geometry.dispose()
          }
        }
      })
      loadedModels.current.delete(modelUrl)
    }
    modelLoaders.current.delete(modelUrl)
    // Clear animations
    const action = activeActions.current.get(modelUrl)
    action?.stop()
    activeActions.current.delete(modelUrl)
    animationMixers.current.delete(modelUrl)
    gltfClips.current.delete(modelUrl)
  }

  // Subscribe to model changes
  useEffect(() => {
    if (!modelViewerState.model?.models) return

    const modelsChanged = () => {
      const currentModels = modelViewerState.model?.models || []
      const currentModelUrls = new Set(currentModels)
      const loadedModelUrls = new Set(loadedModels.current.keys())

      // Remove models that are no longer in the state
      for (const modelUrl of loadedModelUrls) {
        if (!currentModelUrls.has(modelUrl)) {
          removeModel(modelUrl)
        }
      }

      // Add new models
      for (const modelUrl of currentModels) {
        if (!loadedModelUrls.has(modelUrl)) {
          loadModel(modelUrl)
        }
      }
    }
    const unsubscribe = subscribe(modelViewerState.model.models, modelsChanged)

    let unmounted = false
    setTimeout(() => {
      if (unmounted) return
      modelsChanged()
    })

    return () => {
      unmounted = true
      unsubscribe?.()
    }
  }, [model?.models])

  useEffect(() => {
    // Steve/player model is handled declaratively by <PlayerModelCanvas> in the JSX below.
    // This effect only manages the Three.js scene for GLTF/OBJ external models.
    if (!model || !containerRef.current || model.steveModelSkin !== undefined) return

    // Setup scene
    const scene = new THREE.Scene()
    scene.background = null // Transparent background

    // Setup camera with optimal settings for player model viewing
    const camera = new THREE.PerspectiveCamera(
      50, // Reduced FOV for better model viewing
      model.positioning.width / model.positioning.height,
      0.1,
      1000
    )
    camera.position.set(0, 0, 3) // Position camera to view player model optimally

    // Setup renderer with pixel density awareness
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
    renderer.useLegacyLights = false
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    let scale = window.devicePixelRatio || 1
    if (modelViewerState.model?.positioning.scaled) {
      scale *= currentScaling.scale
    }
    renderer.setPixelRatio(scale)
    renderer.setSize(model.positioning.width, model.positioning.height)

    containerRef.current.appendChild(renderer.domElement)

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement)
    // controls.enableZoom = false
    // controls.enablePan = false
    controls.minPolarAngle = Math.PI / 2 // Lock vertical rotation
    controls.maxPolarAngle = Math.PI / 2
    controls.enableDamping = true
    controls.dampingFactor = 0.05

    // Add ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xff_ff_ff, 3)
    scene.add(ambientLight)

    // Add camera light (matching skinview3d cameraLight)
    const cameraLight = new THREE.PointLight(0xff_ff_ff, 0.6) // Intensity, no distance limit, no decay
    camera.add(cameraLight)
    scene.add(camera)

    // Render function
    const render = () => {
      renderer.render(scene, camera)
    }

    // Setup animation/render strategy
    if (model.continiousRender) {
      // Continuous animation loop
      const animate = () => {
        requestAnimationFrame(animate)
        const delta = clockRef.current.getDelta()
        updateAllMixers(delta)
        render()
      }
      animate()
    } else {
      // Render only on camera movement
      controls.addEventListener('change', render)
      // Initial render
      render()
    }

    // Store refs for cleanup
    sceneRef.current = {
      ...sceneRef.current!,
      scene,
      camera,
      renderer,
      controls,
      dispose () {
        if (!model.continiousRender) {
          controls.removeEventListener('change', render)
        }
        if (rafIdRef.current !== undefined) cancelAnimationFrame(rafIdRef.current)

        // Clean up loaded GLTF/OBJ models
        for (const [modelUrl, model] of loadedModels.current) {
          scene.remove(model)
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.material) {
                if (Array.isArray(child.material)) {
                  for (const mat of child.material) {
                    mat.dispose()
                  }
                } else {
                  child.material.dispose()
                }
              }
              if (child.geometry) {
                child.geometry.dispose()
              }
            }
          })
        }
        loadedModels.current.clear()
        modelLoaders.current.clear()
        activeActions.current.clear()
        animationMixers.current.clear()
        gltfClips.current.clear()

        renderer.dispose()
        renderer.domElement?.remove()
      }
    }

    return () => {
      sceneRef.current?.dispose()
    }
  }, [model])

  // React to animation name changes
  useEffect(() => {
    if (!model) return
    const render = () => {
      const s = sceneRef.current
      if (!s) return
      s.renderer.render(s.scene, s.camera)
    }
    const animName = model.playModelAnimation
    if (animName === undefined) return
    for (const modelUrl of loadedModels.current.keys()) {
      playAnimationForModel(modelUrl, animName, render)
    }
  }, [model?.playModelAnimation])

  // React to animation params (speed/loop) changes
  useEffect(() => {
    if (!model) return
    applyAnimationParamsToAll()
  }, [model?.playModelAnimationSpeed, model?.playModelAnimationLoop])

  if (!model) return null

  const { x, y, width, height, scaled, onlyInitialScale } = model.positioning
  const { windowWidth } = model.positioning
  const { windowHeight } = model.positioning
  const scaleValue = onlyInitialScale ? initialScale : 'var(--guiScale)'

  return (
    <div
      className='overlay-model-viewer-container'
      style={{
        zIndex: model.zIndex ?? 100,
        position: 'fixed',
        inset: 0,
        width: '100dvw',
        height: '100dvh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        transform: scaled ? `scale(${scaleValue})` : 'none',
        pointerEvents: 'none',
      }}
    >
      <div
        ref={windowRef}
        className='overlay-model-viewer-window'
        style={{
          width: windowWidth,
          height: windowHeight,
          position: 'relative',
          pointerEvents: 'none',
        }}
      >
        {model.followCursor && model.followCursorCenterDebug ? (
          (() => {
            const { followCursorCenter } = model
            const cx = (followCursorCenter?.x ?? (windowWidth / 2))
            const cy = (followCursorCenter?.y ?? (windowHeight / 2))
            const size = 6
            return (
              <div
                className='overlay-model-viewer-follow-cursor-center-debug'
                style={{
                  position: 'absolute',
                  left: cx - (size / 2),
                  top: cy - (size / 2),
                  width: size,
                  height: size,
                  backgroundColor: 'red',
                  pointerEvents: 'none',
                  zIndex: 1000,
                }}
              />
            )
          })()
        ) : null}
        {model.steveModelSkin === undefined ? (
          <div
            ref={containerRef}
            className='overlay-model-viewer'
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width,
              height,
              pointerEvents: 'auto',
              backgroundColor: model.debug ? 'red' : undefined,
            }}
          />
        ) : (
          <div
            className='overlay-model-viewer'
            style={{
              position: 'absolute',
              left: x,
              top: y,
              pointerEvents: 'auto',
              backgroundColor: model.debug ? 'red' : undefined,
            }}
          >
            <PlayerModelCanvas
              width={width}
              height={height}
              skinUrl={model.steveModelSkin}
              followCursor={model.followCursor}
              computeNormalized={computeNormalizedFromClient}
            />
          </div>
        )}
      </div>
    </div>
  )
}
