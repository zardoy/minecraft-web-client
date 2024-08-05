import * as THREE from 'three'
import { Vec3 } from 'vec3'
import nbt from 'prismarine-nbt'
import PrismarineChatLoader from 'prismarine-chat'
import { renderSign } from '../sign-renderer/'
import { chunkPos, sectionPos } from './simpleUtils'
import { WorldRendererCommon, WorldRendererConfig } from './worldrendererCommon'
import * as tweenJs from '@tweenjs/tween.js'
import { BloomPass, RenderPass, UnrealBloomPass, EffectComposer, WaterPass, GlitchPass } from 'three-stdlib'
import { disposeObject } from './threeJsUtils'
import { Water } from 'three-latest/examples/jsm/objects/Water2.js'

export class WorldRendererThree extends WorldRendererCommon {
    outputFormat = 'threeJs' as const
    blockEntities = {}
    sectionObjects: Record<string, THREE.Object3D> = {}
    chunkTextures = new Map<string, { [pos: string]: THREE.Texture }>()
    signsCache = new Map<string, any>()
    starField: StarField
    cameraSectionPos: Vec3 = new Vec3(0, 0, 0)

    get tilesRendered () {
        return Object.values(this.sectionObjects).reduce((acc, obj) => acc + (obj as any).tilesCount, 0)
    }

    constructor (public scene: THREE.Scene, public renderer: THREE.WebGLRenderer, public config: WorldRendererConfig) {
        super(config)
        this.starField = new StarField(scene)
    }

    timeUpdated (newTime: number): void {
        const nightTime = 13_500
        const morningStart = 23_000
        const displayStars = newTime > nightTime && newTime < morningStart
        if (displayStars && !this.starField.points) {
            this.starField.addToScene()
        } else if (!displayStars && this.starField.points) {
            this.starField.remove()
        }
    }

    /**
     * Optionally update data that are depedendent on the viewer position
     */
    updatePosDataChunk (key: string) {
        const [x, y, z] = key.split(',').map(x => Math.floor(+x / 16))
        // sum of distances: x + y + z
        const chunkDistance = Math.abs(x - this.cameraSectionPos.x) + Math.abs(y - this.cameraSectionPos.y) + Math.abs(z - this.cameraSectionPos.z)
        const section = this.sectionObjects[key].children.find(child => child.name === 'mesh')!
        section.renderOrder = 500 - chunkDistance
    }

    updateViewerPosition (pos: Vec3): void {
        this.viewerPosition = pos
        const cameraPos = this.camera.position.toArray().map(x => Math.floor(x / 16)) as [number, number, number]
        this.cameraSectionPos = new Vec3(...cameraPos)
        for (const key in this.sectionObjects) {
            const value = this.sectionObjects[key]
            if (!value) continue
            this.updatePosDataChunk(key)
        }
    }

    addWater () {
        // offset 0, -2, 0
        const chunkPos = new THREE.Vector3(...this.camera.position.clone().toArray().map(x => Math.floor(x / 16) * 16) as [number, number, number])
        const x = 0
        const z = 0
        const y = this.camera.position.y - chunkPos[1]

        // const posChunkMiddle = chunkPos.map((x, i) => i === 0 ? 0 : 0) as [number, number, number]
        const posChunkMiddle = chunkPos.toArray()
        const waterGeometry = new THREE.PlaneGeometry(20, 20)
        const textureLoader = new THREE.TextureLoader()
        const water = new Water(waterGeometry, {
            scale: 1,
            flowDirection: new THREE.Vector2(1, 1),
            textureWidth: 1024,
            textureHeight: 1024,
            normalMap0: textureLoader.load('https://threejs.org/examples/textures/water/Water_1_M_Normal.jpg'),
            normalMap1: textureLoader.load('https://threejs.org/examples/textures/water/Water_2_M_Normal.jpg'),
        })
        const scale = 20 / 16 / 16
        water.scale.set(scale, scale, 1)
        //@ts-ignore
        water.material.uniforms['color'].value.set(new THREE.Color(117, 202, 255).getHex())
        water.rotation.x = Math.PI * - 0.5
        water.position.set(...posChunkMiddle)
        this.scene.add(water)
    }

    handleWorkerMessage (data: any): void {
        if (data.type !== 'geometry') return
        let object: THREE.Object3D = this.sectionObjects[data.key]
        if (object) {
            this.scene.remove(object)
            disposeObject(object)
            delete this.sectionObjects[data.key]
        }

        const chunkCoords = data.key.split(',')
        if (!this.loadedChunks[chunkCoords[0] + ',' + chunkCoords[2]] || !data.geometry.positions.length || !this.active) return

        // if (!this.initialChunksLoad && this.enableChunksLoadDelay) {
        //   const newPromise = new Promise(resolve => {
        //     if (this.droppedFpsPercentage > 0.5) {
        //       setTimeout(resolve, 1000 / 50 * this.droppedFpsPercentage)
        //     } else {
        //       setTimeout(resolve)
        //     }
        //   })
        //   this.promisesQueue.push(newPromise)
        //   for (const promise of this.promisesQueue) {
        //     await promise
        //   }
        // }

        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.BufferAttribute(data.geometry.positions, 3))
        geometry.setAttribute('normal', new THREE.BufferAttribute(data.geometry.normals, 3))
        geometry.setAttribute('color', new THREE.BufferAttribute(data.geometry.colors, 3))
        geometry.setAttribute('uv', new THREE.BufferAttribute(data.geometry.uvs, 2))
        geometry.setIndex(data.geometry.indices)

        const mesh = new THREE.Mesh(geometry, this.material)
        mesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
        mesh.name = 'mesh'
        object = new THREE.Group()
        object.add(mesh)
        // mesh with static dimensions: 16x16x16
        const staticChunkMesh = new THREE.Mesh(new THREE.BoxGeometry(16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0 }))
        staticChunkMesh.position.set(data.geometry.sx, data.geometry.sy, data.geometry.sz)
        const boxHelper = new THREE.BoxHelper(staticChunkMesh, 0xffff00)
        boxHelper.name = 'helper'
        object.add(boxHelper)
        object.name = 'chunk'
        //@ts-ignore
        object.tilesCount = data.geometry.positions.length / 3 / 4
        if (!this.config.showChunkBorders) {
            boxHelper.visible = false
        }
        // should not compute it once
        if (Object.keys(data.geometry.signs).length) {
            for (const [posKey, { isWall, isHanging, rotation }] of Object.entries(data.geometry.signs)) {
                const [x, y, z] = posKey.split(',')
                const signBlockEntity = this.blockEntities[posKey]
                if (!signBlockEntity) continue
                const sign = this.renderSign(new Vec3(+x, +y, +z), rotation, isWall, isHanging, nbt.simplify(signBlockEntity))
                if (!sign) continue
                object.add(sign)
            }
        }
        this.sectionObjects[data.key] = object
        this.updatePosDataChunk(data.key)
        object.matrixAutoUpdate = false
        mesh.onAfterRender = (renderer, scene, camera, geometry, material, group) => {
            // mesh.matrixAutoUpdate = false
        }

        this.scene.add(object)
    }

    getSignTexture (position: Vec3, blockEntity, backSide = false) {
        const chunk = chunkPos(position)
        let textures = this.chunkTextures.get(`${chunk[0]},${chunk[1]}`)
        if (!textures) {
            textures = {}
            this.chunkTextures.set(`${chunk[0]},${chunk[1]}`, textures)
        }
        const texturekey = `${position.x},${position.y},${position.z}`
        // todo investigate bug and remove this so don't need to clean in section dirty
        if (textures[texturekey]) return textures[texturekey]

        const PrismarineChat = PrismarineChatLoader(this.version!)
        const canvas = renderSign(blockEntity, PrismarineChat)
        if (!canvas) return
        const tex = new THREE.Texture(canvas)
        tex.magFilter = THREE.NearestFilter
        tex.minFilter = THREE.NearestFilter
        tex.needsUpdate = true
        textures[texturekey] = tex
        return tex
    }

    updateCamera (pos: Vec3 | null, yaw: number, pitch: number): void {
        if (pos) {
            new tweenJs.Tween(this.camera.position).to({ x: pos.x, y: pos.y, z: pos.z }, 50).start()
        }
        this.camera.rotation.set(pitch, yaw, 0, 'ZYX')
    }

    render () {
        tweenJs.update()
        const cam = this.camera instanceof THREE.Group ? this.camera.children.find(child => child instanceof THREE.PerspectiveCamera) as THREE.PerspectiveCamera : this.camera
        this.renderer.render(this.scene, cam)
    }

    renderSign (position: Vec3, rotation: number, isWall: boolean, isHanging: boolean, blockEntity) {
        const tex = this.getSignTexture(position, blockEntity)

        if (!tex) return

        // todo implement
        // const key = JSON.stringify({ position, rotation, isWall })
        // if (this.signsCache.has(key)) {
        //   console.log('cached', key)
        // } else {
        //   this.signsCache.set(key, tex)
        // }

        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, }))
        mesh.renderOrder = 999

        const lineHeight = 7 / 16
        const scaleFactor = isHanging ? 1.3 : 1
        mesh.scale.set(1 * scaleFactor, lineHeight * scaleFactor, 1 * scaleFactor)

        const thickness = (isHanging ? 2 : 1.5) / 16
        const wallSpacing = 0.25 / 16
        if (isWall && !isHanging) {
            mesh.position.set(0, 0, -0.5 + thickness + wallSpacing + 0.0001)
        } else {
            mesh.position.set(0, 0, thickness / 2 + 0.0001)
        }

        const group = new THREE.Group()
        group.rotation.set(0, -THREE.MathUtils.degToRad(
            rotation * (isWall ? 90 : 45 / 2)
        ), 0)
        group.add(mesh)
        const height = (isHanging ? 10 : 8) / 16
        const heightOffset = (isHanging ? 0 : isWall ? 4.333 : 9.333) / 16
        const textPosition = height / 2 + heightOffset
        group.position.set(position.x + 0.5, position.y + textPosition, position.z + 0.5)
        return group
    }

    updateLight (chunkX: number, chunkZ: number) {
        // set all sections in the chunk dirty
        for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
            this.setSectionDirty(new Vec3(chunkX, y, chunkZ))
        }
    }

    async doHmr () {
        const oldSections = { ...this.sectionObjects }
        this.sectionObjects = {} // skip clearing
        worldView!.unloadAllChunks()
        this.setVersion(this.version, this.texturesVersion)
        this.sectionObjects = oldSections
        // this.rerenderAllChunks()

        // supply new data
        await worldView!.updatePosition(bot.entity.position, true)
    }

    rerenderAllChunks () { // todo not clear what to do with loading chunks
        for (const key of Object.keys(this.sectionObjects)) {
            const [x, y, z] = key.split(',').map(Number)
            this.setSectionDirty(new Vec3(x, y, z))
        }
    }

    updateShowChunksBorder (value: boolean) {
        this.config.showChunkBorders = value
        for (const object of Object.values(this.sectionObjects)) {
            for (const child of object.children) {
                if (child.name === 'helper') {
                    child.visible = value
                }
            }
        }
    }

    resetWorld () {
        super.resetWorld()

        for (const mesh of Object.values(this.sectionObjects)) {
            this.scene.remove(mesh)
        }
    }

    getLoadedChunksRelative (pos: Vec3, includeY = false) {
        const [currentX, currentY, currentZ] = sectionPos(pos)
        return Object.fromEntries(Object.entries(this.sectionObjects).map(([key, o]) => {
            const [xRaw, yRaw, zRaw] = key.split(',').map(Number)
            const [x, y, z] = sectionPos({ x: xRaw, y: yRaw, z: zRaw })
            const setKey = includeY ? `${x - currentX},${y - currentY},${z - currentZ}` : `${x - currentX},${z - currentZ}`
            return [setKey, o]
        }))
    }

    cleanChunkTextures (x, z) {
        const textures = this.chunkTextures.get(`${Math.floor(x / 16)},${Math.floor(z / 16)}`) ?? {}
        for (const key of Object.keys(textures)) {
            textures[key].dispose()
            delete textures[key]
        }
    }

    readdChunks () {
        for (const key of Object.keys(this.sectionObjects)) {
            this.scene.remove(this.sectionObjects[key])
        }
        setTimeout(() => {
            for (const key of Object.keys(this.sectionObjects)) {
                this.scene.add(this.sectionObjects[key])
            }
        }, 500)
    }

    disableUpdates (children = this.scene.children) {
        for (const child of children) {
            child.matrixWorldNeedsUpdate = false
            this.disableUpdates(child.children ?? [])
        }
    }

    removeColumn (x, z) {
        super.removeColumn(x, z)

        this.cleanChunkTextures(x, z)
        for (let y = this.worldConfig.minY; y < this.worldConfig.worldHeight; y += 16) {
            this.setSectionDirty(new Vec3(x, y, z), false)
            const key = `${x},${y},${z}`
            const mesh = this.sectionObjects[key]
            if (mesh) {
                this.scene.remove(mesh)
                disposeObject(mesh)
            }
            delete this.sectionObjects[key]
        }
    }

    setSectionDirty (pos, value = true) {
        this.cleanChunkTextures(pos.x, pos.z) // todo don't do this!
        super.setSectionDirty(pos, value)
    }
}

class StarField {
    points?: THREE.Points
    private _enabled = true
    get enabled () {
        return this._enabled
    }
    set enabled (value) {
        this._enabled = value
        if (this.points) {
            this.points.visible = value
        }
    }

    constructor (private scene: THREE.Scene) {
    }

    addToScene () {
        if (this.points || !this.enabled) return

        const radius = 80
        const depth = 50
        const count = 7000
        const factor = 7
        const saturation = 10
        const speed = 0.2

        const geometry = new THREE.BufferGeometry()

        const genStar = r => new THREE.Vector3().setFromSpherical(new THREE.Spherical(r, Math.acos(1 - Math.random() * 2), Math.random() * 2 * Math.PI))

        const positions = [] as number[]
        const colors = [] as number[]
        const sizes = Array.from({ length: count }, () => (0.5 + 0.5 * Math.random()) * factor)
        const color = new THREE.Color()
        let r = radius + depth
        const increment = depth / count
        for (let i = 0; i < count; i++) {
            r -= increment * Math.random()
            positions.push(...genStar(r).toArray())
            color.setHSL(i / count, saturation, 0.9)
            colors.push(color.r, color.g, color.b)
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

        // Create a material
        const material = new StarfieldMaterial()
        material.blending = THREE.AdditiveBlending
        material.depthTest = false
        material.transparent = true

        // Create points and add them to the scene
        this.points = new THREE.Points(geometry, material)
        this.scene.add(this.points)

        const clock = new THREE.Clock()
        this.points.onBeforeRender = (renderer, scene, camera) => {
            this.points?.position.copy?.(camera.position)
            material.uniforms.time.value = clock.getElapsedTime() * speed
        }
    }

    remove () {
        if (this.points) {
            this.points.geometry.dispose();
            (this.points.material as THREE.Material).dispose()
            this.scene.remove(this.points)

            this.points = undefined
        }
    }
}

const version = parseInt(THREE.REVISION.replace(/\D+/g, ''))
class StarfieldMaterial extends THREE.ShaderMaterial {
    constructor () {
        super({
            uniforms: { time: { value: 0.0 }, fade: { value: 1.0 } },
            vertexShader: /* glsl */ `
                uniform float time;
                attribute float size;
                varying vec3 vColor;
                attribute vec3 color;
                void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 0.5);
                gl_PointSize = size * (30.0 / -mvPosition.z) * (3.0 + sin(time + 100.0));
                gl_Position = projectionMatrix * mvPosition;
            }`,
            fragmentShader: /* glsl */ `
                uniform sampler2D pointTexture;
                uniform float fade;
                varying vec3 vColor;
                void main() {
                float opacity = 1.0;
                if (fade == 1.0) {
                    float d = distance(gl_PointCoord, vec2(0.5, 0.5));
                    opacity = 1.0 / (1.0 + exp(16.0 * (d - 0.25)));
                }
                gl_FragColor = vec4(vColor, opacity);

                #include <tonemapping_fragment>
                #include <${version >= 154 ? 'colorspace_fragment' : 'encodings_fragment'}>
            }`,
        })
    }
}
