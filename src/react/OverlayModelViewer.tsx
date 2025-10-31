import { proxy, useSnapshot, subscribe } from 'valtio'
import { useEffect, useMemo, useRef } from 'react'
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

export default () => {
  const { model } = useSnapshot(modelViewerState)
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    controls: OrbitControls
    playerObject?: PlayerObjectType
    dispose: () => void
  }>()
  const initialScale = useMemo(() => {
    return currentScaling.scale
  }, [])
  globalThis.sceneRef = sceneRef

  // Cursor following state
  const cursorPosition = useRef<{ x: number, y: number }>({ x: 0, y: 0 }) // window clientX/clientY in px
  const isFollowingCursor = useRef(false)
  const getUiScaleFactor = (scaled?: boolean, onlyInitialScale?: boolean) => {
    return scaled ? (onlyInitialScale ? initialScale : currentScaling.scale) : 1
  }
  const windowRef = useRef<HTMLDivElement>(null)
  // Shared helper to compute normalized cursor from window clientX/Y taking scale & center into account
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
          if (child.material && customization) {
            const material = child.material as THREE.MeshStandardMaterial
            if (customization.color) {
              material.color.setHex(parseInt(customization.color.replace('#', ''), 16))
            }
            if (customization.opacity !== undefined) {
              material.opacity = customization.opacity
              material.transparent = customization.opacity < 1
            }
            if (customization.metalness !== undefined) {
              material.metalness = customization.metalness
            }
            if (customization.roughness !== undefined) {
              material.roughness = customization.roughness
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
    if (!model || !containerRef.current) return

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
    const renderer = new THREE.WebGLRenderer({ alpha: true })
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

    // Cursor following function
    const updatePlayerLookAt = () => {
      if (!isFollowingCursor.current || !sceneRef.current?.playerObject) return

      const { playerObject } = sceneRef.current
      const { x, y } = cursorPosition.current

      // Convert clientX/clientY to normalized coordinates centered by followCursorCenter
      const { normalizedX, normalizedY } = computeNormalizedFromClient(x, y)

      // Calculate head rotation based on cursor position
      // Limit head movement to ±60 degrees
      const maxHeadYaw = Math.PI * (60 / 180)
      const maxHeadPitch = Math.PI * (60 / 180)

      const clampedX = THREE.MathUtils.clamp(normalizedX, -1, 1)
      const clampedY = THREE.MathUtils.clamp(normalizedY, -1, 1)

      const headYaw = clampedX * maxHeadYaw
      const headPitch = clampedY * maxHeadPitch

      // Apply head rotation with smooth interpolation
      const lerpFactor = 0.1 // Smooth interpolation factor
      playerObject.skin.head.rotation.y = THREE.MathUtils.lerp(
        playerObject.skin.head.rotation.y,
        headYaw,
        lerpFactor
      )
      playerObject.skin.head.rotation.x = THREE.MathUtils.lerp(
        playerObject.skin.head.rotation.x,
        headPitch,
        lerpFactor
      )

      // Apply slight body rotation for more natural movement
      const bodyYaw = headYaw * 0.3 // Body follows head but with less rotation
      playerObject.rotation.y = THREE.MathUtils.lerp(
        playerObject.rotation.y,
        bodyYaw,
        lerpFactor * 0.5 // Slower body movement
      )

      render()
    }

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
      // Render after model loads
      if (model.steveModelSkin !== undefined) {
        // Create player model
        const { playerObject, wrapper } = createPlayerObject({
          scale: 1 // Start with base scale, will adjust below
        })
        playerObject.ears.visible = false
        playerObject.cape.visible = false

        // Enable shadows for player object
        wrapper.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        // Calculate proper scale and positioning for camera view
        const box = new THREE.Box3().setFromObject(wrapper)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())

        // Calculate scale to fit within camera view (considering FOV and distance)
        const cameraDistance = camera.position.z
        const fov = camera.fov * Math.PI / 180 // Convert to radians
        const visibleHeight = 2 * Math.tan(fov / 2) * cameraDistance
        const visibleWidth = visibleHeight * (model.positioning.width / model.positioning.height)

        const scaleFactor = Math.min(
          (visibleHeight) / size.y,
          (visibleWidth) / size.x
        )

        wrapper.scale.multiplyScalar(scaleFactor)

        // Center the player object
        wrapper.position.sub(center.multiplyScalar(scaleFactor))

        // Rotate to face camera (remove the default 180° rotation)
        wrapper.rotation.set(0, 0, 0)

        scene.add(wrapper)
        sceneRef.current = {
          ...sceneRef.current!,
          playerObject
        }

        void applySkinToPlayerObject(playerObject, model.steveModelSkin).then(() => {
          setTimeout(render, 0)
        })

        // Set up cursor following if enabled
        if (model.followCursor) {
          isFollowingCursor.current = true
        }
      }
    }

    // Window cursor tracking for followCursor
    let lastCursorUpdate = 0
    let waitingRender = false
    const handleWindowPointerMove = (event: PointerEvent) => {
      if (!model.followCursor) return

      // Track cursor position as window clientX/clientY in px
      const newPosition = {
        x: event.clientX,
        y: event.clientY
      }
      cursorPosition.current = newPosition
      globalThis.cursorPosition = newPosition // Expose for debug
      lastCursorUpdate = Date.now()
      updatePlayerLookAt()
      if (!waitingRender) {
        requestAnimationFrame(() => {
          render()
          waitingRender = false
        })
        waitingRender = true
      }
    }

    // Add window event listeners
    if (model.followCursor) {
      window.addEventListener('pointermove', handleWindowPointerMove)
      isFollowingCursor.current = true
    }

    // Note: animation state subscriptions moved to useEffect hooks below to satisfy TS types

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
        if (model.followCursor) {
          window.removeEventListener('pointermove', handleWindowPointerMove)
        }
        if (rafIdRef.current !== undefined) cancelAnimationFrame(rafIdRef.current)

        // Clean up loaded models
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

        const playerObject = sceneRef.current?.playerObject
        if (playerObject?.skin.map) {
          (playerObject.skin.map as unknown as THREE.Texture).dispose()
        }
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
        zIndex: 100,
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
      </div>
    </div>
  )
}
