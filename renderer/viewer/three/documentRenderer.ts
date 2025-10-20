import * as THREE from 'three'
import Stats from 'stats.js'
import StatsGl from 'stats-gl'
import * as tween from '@tweenjs/tween.js'
import { GraphicsBackendConfig, GraphicsInitOptions } from '../../../src/appViewer'
import { WorldRendererConfig } from '../lib/worldrendererCommon'

export class DocumentRenderer {
  canvas: HTMLCanvasElement | OffscreenCanvas
  readonly renderer: THREE.WebGLRenderer
  private animationFrameId?: number
  private timeoutId?: number
  private lastRenderTime = 0

  private previousCanvasWidth = 0
  private previousCanvasHeight = 0
  private currentWidth = 0
  private currentHeight = 0

  private renderedFps = 0
  private fpsInterval: any
  private readonly stats: TopRightStats | undefined
  private paused = false
  disconnected = false
  preRender = () => { }
  render = (sizeChanged: boolean) => { }
  postRender = () => { }
  sizeChanged = () => { }
  droppedFpsPercentage: number
  config: GraphicsBackendConfig
  onRender = [] as Array<(sizeChanged: boolean) => void>
  inWorldRenderingConfig: WorldRendererConfig | undefined

  constructor (initOptions: GraphicsInitOptions, public externalCanvas?: OffscreenCanvas) {
    this.config = initOptions.config

    // Handle canvas creation/transfer based on context
    if (externalCanvas) {
      this.canvas = externalCanvas
    } else {
      this.addToPage()
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        preserveDrawingBuffer: true,
        logarithmicDepthBuffer: true,
        powerPreference: this.config.powerPreference
      })
    } catch (err) {
      initOptions.callbacks.displayCriticalError(new Error(`Failed to create WebGL context, not possible to render (restart browser): ${err.message}`))
      throw err
    }
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    if (!externalCanvas) {
      this.updatePixelRatio()
    }
    this.sizeUpdated()
    // Initialize previous dimensions
    this.previousCanvasWidth = this.canvas.width
    this.previousCanvasHeight = this.canvas.height

    const supportsWebGL2 = 'WebGL2RenderingContext' in window
    // Only initialize stats and DOM-related features in main thread
    if (!externalCanvas && supportsWebGL2) {
      this.stats = new TopRightStats(this.canvas as HTMLCanvasElement, this.config.statsVisible)
      this.setupFpsTracking()
    }

    this.startRenderLoop()
  }

  updatePixelRatio () {
    let pixelRatio = window.devicePixelRatio || 1 // todo this value is too high on ios, need to check, probably we should use avg, also need to make it configurable
    if (!this.renderer.capabilities.isWebGL2) {
      pixelRatio = 1 // webgl1 has issues with high pixel ratio (sometimes screen is clipped)
    }
    this.renderer.setPixelRatio(pixelRatio)
  }

  sizeUpdated () {
    this.renderer.setSize(this.currentWidth, this.currentHeight, false)
  }

  private addToPage () {
    this.canvas = addCanvasToPage()
    this.updateCanvasSize()
  }

  updateSizeExternal (newWidth: number, newHeight: number, pixelRatio: number) {
    this.currentWidth = newWidth
    this.currentHeight = newHeight
    this.renderer.setPixelRatio(pixelRatio)
    this.sizeUpdated()
  }

  private updateCanvasSize () {
    if (!this.externalCanvas) {
      const innnerWidth = window.innerWidth
      const innnerHeight = window.innerHeight
      if (this.currentWidth !== innnerWidth) {
        this.currentWidth = innnerWidth
      }
      if (this.currentHeight !== innnerHeight) {
        this.currentHeight = innnerHeight
      }
    }
  }

  private setupFpsTracking () {
    let max = 0
    this.fpsInterval = setInterval(() => {
      if (max > 0) {
        this.droppedFpsPercentage = this.renderedFps / max
      }
      max = Math.max(this.renderedFps, max)
      this.renderedFps = 0
    }, 1000)
  }

  private startRenderLoop () {
    const animate = () => {
      if (this.disconnected) return

      if (this.config.timeoutRendering) {
        this.timeoutId = setTimeout(animate, this.config.fpsLimit ? 1000 / this.config.fpsLimit : 0) as unknown as number
      } else {
        this.animationFrameId = requestAnimationFrame(animate)
      }

      if (this.paused || (this.renderer.xr.isPresenting && !this.inWorldRenderingConfig?.vrPageGameRendering)) return

      // Handle FPS limiting
      if (this.config.fpsLimit) {
        const now = performance.now()
        const elapsed = now - this.lastRenderTime
        const fpsInterval = 1000 / this.config.fpsLimit

        if (elapsed < fpsInterval) {
          return
        }

        this.lastRenderTime = now - (elapsed % fpsInterval)
      }

      let sizeChanged = false
      this.updateCanvasSize()
      if (this.previousCanvasWidth !== this.currentWidth || this.previousCanvasHeight !== this.currentHeight) {
        this.previousCanvasWidth = this.currentWidth
        this.previousCanvasHeight = this.currentHeight
        this.sizeUpdated()
        sizeChanged = true
      }

      this.frameRender(sizeChanged)

      // Update stats visibility each frame (main thread only)
      if (this.config.statsVisible !== undefined) {
        this.stats?.setVisibility(this.config.statsVisible)
      }
    }

    animate()
  }

  frameRender (sizeChanged: boolean) {
    this.preRender()
    this.stats?.markStart()
    tween.update()
    if (!globalThis.freezeRender) {
      this.render(sizeChanged)
    }
    for (const fn of this.onRender) {
      fn(sizeChanged)
    }
    this.renderedFps++
    this.stats?.markEnd()
    this.postRender()
  }

  setPaused (paused: boolean) {
    this.paused = paused
  }

  dispose () {
    this.disconnected = true
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.remove()
    }
    clearInterval(this.fpsInterval)
    this.stats?.dispose()
    this.renderer.dispose()
  }
}

class TopRightStats {
  private readonly stats: Stats
  private readonly stats2: Stats
  private readonly statsGl: StatsGl
  private total = 0
  private readonly denseMode: boolean

  constructor (private readonly canvas: HTMLCanvasElement, initialStatsVisible = 0) {
    this.stats = new Stats()
    this.stats2 = new Stats()
    this.statsGl = new StatsGl({ minimal: true })
    this.stats2.showPanel(2)
    this.denseMode = process.env.NODE_ENV === 'production' || window.innerHeight < 500

    this.initStats()
    this.setVisibility(initialStatsVisible)
  }

  private addStat (dom: HTMLElement, size = 80) {
    dom.style.position = 'absolute'
    if (this.denseMode) dom.style.height = '12px'
    dom.style.overflow = 'hidden'
    dom.style.left = ''
    dom.style.top = '0'
    dom.style.right = `${this.total}px`
    dom.style.width = '80px'
    dom.style.zIndex = '1'
    dom.style.opacity = '0.8'
    const container = document.getElementById('corner-indicator-stats') ?? document.body
    container.appendChild(dom)
    this.total += size
  }

  private initStats () {
    const hasRamPanel = this.stats2.dom.children.length === 3

    this.addStat(this.stats.dom)
    this.stats.dom.style.position = 'relative'
    if (hasRamPanel) {
      this.addStat(this.stats2.dom)
    }

    this.statsGl.init(this.canvas)
    this.statsGl.container.style.display = 'flex'
    this.statsGl.container.style.justifyContent = 'flex-end'

    let i = 0
    for (const _child of this.statsGl.container.children) {
      const child = _child as HTMLElement
      if (i++ === 0) {
        child.style.display = 'none'
      }
      child.style.position = ''
    }
  }

  setVisibility (level: number) {
    const visible = level > 0
    if (visible) {
      this.stats.dom.style.display = 'block'
      this.stats2.dom.style.display = level >= 2 ? 'block' : 'none'
      this.statsGl.container.style.display = level >= 2 ? 'block' : 'none'
    } else {
      this.stats.dom.style.display = 'none'
      this.stats2.dom.style.display = 'none'
      this.statsGl.container.style.display = 'none'
    }
  }

  markStart () {
    this.stats.begin()
    this.stats2.begin()
    this.statsGl.begin()
  }

  markEnd () {
    this.stats.end()
    this.stats2.end()
    this.statsGl.end()
  }

  dispose () {
    this.stats.dom.remove()
    this.stats2.dom.remove()
    this.statsGl.container.remove()
  }
}

const addCanvasToPage = () => {
  const canvas = document.createElement('canvas')
  canvas.id = 'viewer-canvas'
  document.body.appendChild(canvas)
  return canvas
}

export const addCanvasForWorker = () => {
  const canvas = addCanvasToPage()
  const transferred = canvas.transferControlToOffscreen()
  let removed = false
  let onSizeChanged = (w, h) => { }
  let oldSize = { width: 0, height: 0 }
  const checkSize = () => {
    if (removed) return
    if (oldSize.width !== window.innerWidth || oldSize.height !== window.innerHeight) {
      onSizeChanged(window.innerWidth, window.innerHeight)
      oldSize = { width: window.innerWidth, height: window.innerHeight }
    }
    requestAnimationFrame(checkSize)
  }
  requestAnimationFrame(checkSize)
  return {
    canvas: transferred,
    destroy () {
      removed = true
      canvas.remove()
    },
    onSizeChanged (cb: (width: number, height: number) => void) {
      onSizeChanged = cb
    },
    get size () {
      return { width: window.innerWidth, height: window.innerHeight }
    }
  }
}
