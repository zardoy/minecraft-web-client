import * as THREE from 'three'

// Centralized visual configuration (in screen pixels)
export const WAYPOINT_CONFIG = {
  // Target size in screen pixels (this controls the final sprite size)
  TARGET_SCREEN_PX: 150,
  // Canvas size for internal rendering (keep power of 2 for textures)
  CANVAS_SIZE: 256,
  // Relative positions in canvas (0-1)
  LAYOUT: {
    DOT_Y: 0.3,
    NAME_Y: 0.45,
    DISTANCE_Y: 0.55,
  },
  // Multiplier for canvas internal resolution to keep text crisp
  CANVAS_SCALE: 2,
  ARROW: {
    enabledDefault: false,
    pixelSize: 50,
    paddingPx: 50,
  },
}

export type WaypointSprite = {
  group: THREE.Group
  sprite: THREE.Sprite
  // Offscreen arrow controls
  enableOffscreenArrow: (enabled: boolean) => void
  setArrowParent: (parent: THREE.Object3D | null) => void
  // Convenience combined updater
  updateForCamera: (
    cameraPosition: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    viewportWidthPx: number,
    viewportHeightPx: number
  ) => boolean
  // Utilities
  setColor: (color: number) => void
  setLabel: (label?: string) => void
  updateDistanceText: (label: string, distanceText: string) => void
  setVisible: (visible: boolean) => void
  setPosition: (x: number, y: number, z: number) => void
  dispose: () => void
}

export function createWaypointSprite (options: {
  position: THREE.Vector3 | { x: number, y: number, z: number },
  color?: number,
  label?: string,
  depthTest?: boolean,
  // Y offset in world units used by updateScaleWorld only (screen-pixel API ignores this)
  labelYOffset?: number,
  metadata?: any,
}): WaypointSprite {
  const color = options.color ?? 0xFF_00_00
  const depthTest = options.depthTest ?? false
  const labelYOffset = options.labelYOffset ?? 1.5

  // Build combined sprite
  const sprite = createCombinedSprite(color, options.label ?? '', '0m', depthTest)
  sprite.renderOrder = 10
  let currentLabel = options.label ?? ''

  // Performance optimization: cache distance text to avoid unnecessary updates
  let lastDistanceText = '0m'
  let lastDistance = 0

  // Offscreen arrow (detached by default)
  let arrowSprite: THREE.Sprite | undefined
  let arrowParent: THREE.Object3D | null = null
  let arrowEnabled = WAYPOINT_CONFIG.ARROW.enabledDefault

  // Group for easy add/remove
  const group = new THREE.Group()
  group.add(sprite)

  // Initial position
  const { x, y, z } = options.position
  group.position.set(x, y, z)

  function setColor (newColor: number) {
    const canvas = drawCombinedCanvas(newColor, currentLabel, '0m')
    const texture = new THREE.CanvasTexture(canvas)
    const mat = sprite.material
    mat.map?.dispose()
    mat.map = texture
    mat.needsUpdate = true
  }

  function setLabel (newLabel?: string) {
    currentLabel = newLabel ?? ''
    const canvas = drawCombinedCanvas(color, currentLabel, '0m')
    const texture = new THREE.CanvasTexture(canvas)
    const mat = sprite.material
    mat.map?.dispose()
    mat.map = texture
    mat.needsUpdate = true
  }

  function updateDistanceText (label: string, distanceText: string) {
    // Performance optimization: only update if distance text actually changed
    if (distanceText === lastDistanceText) {
      return
    }
    lastDistanceText = distanceText

    const canvas = drawCombinedCanvas(color, label, distanceText)
    const texture = new THREE.CanvasTexture(canvas)
    const mat = sprite.material
    mat.map?.dispose()
    mat.map = texture
    mat.needsUpdate = true
  }

  function setVisible (visible: boolean) {
    sprite.visible = visible
  }

  function setPosition (nx: number, ny: number, nz: number) {
    group.position.set(nx, ny, nz)
  }

  // Keep constant pixel size on screen using global config
  function updateScaleScreenPixels (
    cameraPosition: THREE.Vector3,
    cameraFov: number,
    distance: number,
    viewportHeightPx: number
  ) {
    const vFovRad = cameraFov * Math.PI / 180
    const worldUnitsPerScreenHeightAtDist = Math.tan(vFovRad / 2) * 2 * distance
    // Use configured target screen size
    const scale = worldUnitsPerScreenHeightAtDist * (WAYPOINT_CONFIG.TARGET_SCREEN_PX / viewportHeightPx)
    sprite.scale.set(scale, scale, 1)
  }

  function ensureArrow () {
    if (arrowSprite) return
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, size, size)

    // Draw arrow shape
    ctx.beginPath()
    ctx.moveTo(size * 0.15, size * 0.5)
    ctx.lineTo(size * 0.85, size * 0.5)
    ctx.lineTo(size * 0.5, size * 0.15)
    ctx.closePath()

    // Use waypoint color for arrow
    const colorHex = `#${color.toString(16).padStart(6, '0')}`
    ctx.lineWidth = 6
    ctx.strokeStyle = 'black'
    ctx.stroke()
    ctx.fillStyle = colorHex
    ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false })
    arrowSprite = new THREE.Sprite(material)
    arrowSprite.renderOrder = 12
    arrowSprite.visible = false
    if (arrowParent) arrowParent.add(arrowSprite)
  }

  function enableOffscreenArrow (enabled: boolean) {
    arrowEnabled = enabled
    if (!enabled && arrowSprite) arrowSprite.visible = false
  }

  function setArrowParent (parent: THREE.Object3D | null) {
    if (arrowSprite?.parent) arrowSprite.parent.remove(arrowSprite)
    arrowParent = parent
    if (arrowSprite && parent) parent.add(arrowSprite)
  }

  function updateOffscreenArrow (
    camera: THREE.PerspectiveCamera,
    viewportWidthPx: number,
    viewportHeightPx: number
  ): boolean {
    if (!arrowEnabled) return true
    ensureArrow()
    if (!arrowSprite) return true

    // Check if onlyLeftRight is enabled in metadata
    const onlyLeftRight = options.metadata?.onlyLeftRight === true

    // Build camera basis using camera.up to respect custom orientations
    const forward = new THREE.Vector3()
    camera.getWorldDirection(forward) // camera look direction
    const upWorld = camera.up.clone().normalize()
    const right = new THREE.Vector3().copy(forward).cross(upWorld).normalize()
    const upCam = new THREE.Vector3().copy(right).cross(forward).normalize()

    // Vector from camera to waypoint
    const camPos = new THREE.Vector3().setFromMatrixPosition(camera.matrixWorld)
    const toWp = new THREE.Vector3(group.position.x, group.position.y, group.position.z).sub(camPos)

    // Components in camera basis
    const z = toWp.dot(forward)
    const x = toWp.dot(right)
    const y = toWp.dot(upCam)

    const aspect = viewportWidthPx / viewportHeightPx
    const vFovRad = camera.fov * Math.PI / 180
    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect)

    // Determine if waypoint is inside view frustum using angular checks
    const thetaX = Math.atan2(x, z)
    const thetaY = Math.atan2(y, z)
    const visible = z > 0 && Math.abs(thetaX) <= hFovRad / 2 && Math.abs(thetaY) <= vFovRad / 2
    if (visible) {
      arrowSprite.visible = false
      return true
    }

    // Direction on screen in normalized frustum units
    let rx = thetaX / (hFovRad / 2)
    let ry = thetaY / (vFovRad / 2)

    // If behind the camera, snap to dominant axis to avoid confusing directions
    if (z <= 0) {
      if (Math.abs(rx) > Math.abs(ry)) {
        rx = Math.sign(rx)
        ry = 0
      } else {
        rx = 0
        ry = Math.sign(ry)
      }
    }

    // Apply onlyLeftRight logic - restrict arrows to left/right edges only
    if (onlyLeftRight) {
      // Force the arrow to appear only on left or right edges
      if (Math.abs(rx) > Math.abs(ry)) {
        // Horizontal direction is dominant, keep it
        ry = 0
      } else {
        // Vertical direction is dominant, but we want only left/right
        // So choose left or right based on the sign of rx
        rx = rx >= 0 ? 1 : -1
        ry = 0
      }
    }

    // Place on the rectangle border [-1,1]x[-1,1]
    const s = Math.max(Math.abs(rx), Math.abs(ry)) || 1
    let ndcX = rx / s
    let ndcY = ry / s

    // Apply padding in pixel space by clamping
    const padding = WAYPOINT_CONFIG.ARROW.paddingPx
    const pxX = ((ndcX + 1) * 0.5) * viewportWidthPx
    const pxY = ((1 - ndcY) * 0.5) * viewportHeightPx
    const clampedPxX = Math.min(Math.max(pxX, padding), viewportWidthPx - padding)
    const clampedPxY = Math.min(Math.max(pxY, padding), viewportHeightPx - padding)
    ndcX = (clampedPxX / viewportWidthPx) * 2 - 1
    ndcY = -(clampedPxY / viewportHeightPx) * 2 + 1

    // Compute world position at a fixed distance in front of the camera using camera basis
    const placeDist = Math.max(2, camera.near * 4)
    const halfPlaneHeight = Math.tan(vFovRad / 2) * placeDist
    const halfPlaneWidth = halfPlaneHeight * aspect
    const pos = camPos.clone()
      .add(forward.clone().multiplyScalar(placeDist))
      .add(right.clone().multiplyScalar(ndcX * halfPlaneWidth))
      .add(upCam.clone().multiplyScalar(ndcY * halfPlaneHeight))

    // Update arrow sprite
    arrowSprite.visible = true
    arrowSprite.position.copy(pos)

    // Angle for rotation relative to screen right/up (derived from camera up vector)
    const angle = Math.atan2(ry, rx)
    arrowSprite.material.rotation = angle - Math.PI / 2

    // Constant pixel size for arrow (use fixed placement distance)
    const worldUnitsPerScreenHeightAtDist = Math.tan(vFovRad / 2) * 2 * placeDist
    const sPx = worldUnitsPerScreenHeightAtDist * (WAYPOINT_CONFIG.ARROW.pixelSize / viewportHeightPx)
    arrowSprite.scale.set(sPx, sPx, 1)
    return false
  }

  function computeDistance (cameraPosition: THREE.Vector3): number {
    return cameraPosition.distanceTo(group.position)
  }

  function updateForCamera (
    cameraPosition: THREE.Vector3,
    camera: THREE.PerspectiveCamera,
    viewportWidthPx: number,
    viewportHeightPx: number
  ): boolean {
    const distance = computeDistance(cameraPosition)
    // Keep constant pixel size
    updateScaleScreenPixels(cameraPosition, camera.fov, distance, viewportHeightPx)

    // Performance optimization: only update distance text if distance changed significantly
    const roundedDistance = Math.round(distance)
    if (Math.abs(roundedDistance - lastDistance) >= 1) {
      lastDistance = roundedDistance
      updateDistanceText(currentLabel, `${roundedDistance}m`)
    }

    // Update arrow and visibility
    const onScreen = updateOffscreenArrow(camera, viewportWidthPx, viewportHeightPx)
    setVisible(onScreen)
    return onScreen
  }

  function dispose () {
    const mat = sprite.material
    mat.map?.dispose()
    mat.dispose()
    if (arrowSprite) {
      // Remove arrow from parent before disposing
      if (arrowSprite.parent) {
        arrowSprite.parent.remove(arrowSprite)
      }
      const am = arrowSprite.material
      am.map?.dispose()
      am.dispose()
    }
  }

  return {
    group,
    sprite,
    enableOffscreenArrow,
    setArrowParent,
    updateForCamera,
    setColor,
    setLabel,
    updateDistanceText,
    setVisible,
    setPosition,
    dispose,
  }
}

// Internal helpers
function drawCombinedCanvas (color: number, id: string, distance: string): HTMLCanvasElement {
  const scale = WAYPOINT_CONFIG.CANVAS_SCALE * (globalThis.devicePixelRatio || 1)
  const size = WAYPOINT_CONFIG.CANVAS_SIZE * scale
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Clear canvas
  ctx.clearRect(0, 0, size, size)

  // Draw dot
  const centerX = size / 2
  const dotY = Math.round(size * WAYPOINT_CONFIG.LAYOUT.DOT_Y)
  const radius = Math.round(size * 0.05) // Dot takes up ~12% of canvas height
  const borderWidth = Math.max(2, Math.round(4 * scale))

  // Outer border (black)
  ctx.beginPath()
  ctx.arc(centerX, dotY, radius + borderWidth, 0, Math.PI * 2)
  ctx.fillStyle = 'black'
  ctx.fill()

  // Inner circle (colored)
  ctx.beginPath()
  ctx.arc(centerX, dotY, radius, 0, Math.PI * 2)
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`
  ctx.fill()

  // Text properties
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  // Title
  const nameFontPx = Math.round(size * 0.08) // ~8% of canvas height
  const distanceFontPx = Math.round(size * 0.06) // ~6% of canvas height
  ctx.font = `bold ${nameFontPx}px mojangles`
  ctx.lineWidth = Math.max(2, Math.round(3 * scale))
  const nameY = Math.round(size * WAYPOINT_CONFIG.LAYOUT.NAME_Y)

  ctx.strokeStyle = 'black'
  ctx.strokeText(id, centerX, nameY)
  ctx.fillStyle = 'white'
  ctx.fillText(id, centerX, nameY)

  // Distance
  ctx.font = `bold ${distanceFontPx}px mojangles`
  ctx.lineWidth = Math.max(2, Math.round(2 * scale))
  const distanceY = Math.round(size * WAYPOINT_CONFIG.LAYOUT.DISTANCE_Y)

  ctx.strokeStyle = 'black'
  ctx.strokeText(distance, centerX, distanceY)
  ctx.fillStyle = '#CCCCCC'
  ctx.fillText(distance, centerX, distanceY)

  return canvas
}

function createCombinedSprite (color: number, id: string, distance: string, depthTest: boolean): THREE.Sprite {
  const canvas = drawCombinedCanvas(color, id, distance)
  const texture = new THREE.CanvasTexture(canvas)
  texture.anisotropy = 1
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity: 1,
    depthTest,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.position.set(0, 0, 0)
  return sprite
}

export const WaypointHelpers = {
  // World-scale constant size helper
  computeWorldScale (distance: number, fixedReference = 10) {
    return Math.max(0.0001, distance / fixedReference)
  },
  // Screen-pixel constant size helper
  computeScreenPixelScale (
    camera: THREE.PerspectiveCamera,
    distance: number,
    pixelSize: number,
    viewportHeightPx: number
  ) {
    const vFovRad = camera.fov * Math.PI / 180
    const worldUnitsPerScreenHeightAtDist = Math.tan(vFovRad / 2) * 2 * distance
    return worldUnitsPerScreenHeightAtDist * (pixelSize / viewportHeightPx)
  }
}
