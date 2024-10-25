import { Vec3 } from 'vec3'
import { World } from './world'
import { getSectionGeometry, setBlockStatesData as setMesherData } from './models'

if (module.require) {
  // If we are in a node environement, we need to fake some env variables
  const r = module.require
  const { parentPort } = r('worker_threads')
  global.self = parentPort
  global.postMessage = (value, transferList) => { parentPort.postMessage(value, transferList) }
  global.performance = r('perf_hooks').performance
}

let workerIndex = 0
let world: World
let dirtySections = new Map<string, number>()
let allDataReady = false

function sectionKey (x, y, z) {
  return `${x},${y},${z}`
}

const batchMessagesLimit = 100

let queuedMessages = [] as any[]
let queueWaiting = false
const postMessage = (data, transferList = []) => {
  queuedMessages.push({ data, transferList })
  if (queuedMessages.length > batchMessagesLimit) {
    drainQueue(0, batchMessagesLimit)
  }
  if (queueWaiting) return
  queueWaiting = true
  setTimeout(() => {
    queueWaiting = false
    drainQueue(0, queuedMessages.length)
  })
}

function drainQueue (from, to) {
  const messages = queuedMessages.slice(from, to)
  global.postMessage(messages.map(m => m.data), messages.flatMap(m => m.transferList) as unknown as string)
  queuedMessages = queuedMessages.slice(to)
}

function setSectionDirty (pos, value = true) {
  const x = Math.floor(pos.x / 16) * 16
  const y = Math.floor(pos.y / 16) * 16
  const z = Math.floor(pos.z / 16) * 16
  const key = sectionKey(x, y, z)
  if (!value) {
    dirtySections.delete(key)
    postMessage({ type: 'sectionFinished', key })
    return
  }

  const chunk = world.getColumn(x, z)
  if (chunk?.getSection(pos)) {
    dirtySections.set(key, (dirtySections.get(key) || 0) + 1)
  } else {
    postMessage({ type: 'sectionFinished', key })
  }
}

const softCleanup = () => {
  // clean block cache and loaded chunks
  world = new World(world.config.version)
}

const handleMessage = data => {
  const globalVar: any = globalThis

  if (data.type === 'mcData') {
    globalVar.mcData = data.mcData
  }

  if (data.config) {
    if (data.type === 'mesherData' && allDataReady) {
      world = undefined as any // reset models
    }

    world ??= new World(data.config.version)
    world.config = { ...world.config, ...data.config }
    globalThis.world = world
  }

  switch (data.type) {
    case 'mesherData': {
      setMesherData(data.blockstatesModels, data.blocksAtlas, data.config.outputFormat === 'webgpu')
      allDataReady = true
      workerIndex = data.workerIndex

      break
    }
    case 'dirty': {
      const loc = new Vec3(data.x, data.y, data.z)
      setSectionDirty(loc, data.value)

      break
    }
    case 'chunk': {
      world.addColumn(data.x, data.z, data.chunk)

      break
    }
    case 'unloadChunk': {
      world.removeColumn(data.x, data.z)
      if (Object.keys(world.columns).length === 0) softCleanup()

      break
    }
    case 'blockUpdate': {
      const loc = new Vec3(data.pos.x, data.pos.y, data.pos.z).floored()
      world.setBlockStateId(loc, data.stateId)

      break
    }
    case 'reset': {
      world = undefined as any
      // blocksStates = null
      dirtySections = new Map()
      // todo also remove cached
      globalVar.mcData = null
      allDataReady = false

      break
    }
    // No default
  }
}

// eslint-disable-next-line no-restricted-globals -- TODO
self.onmessage = ({ data }) => {
  if (Array.isArray(data)) {
    // eslint-disable-next-line unicorn/no-array-for-each
    data.forEach(handleMessage)
    return
  }

  handleMessage(data)
}

setInterval(() => {
  if (world === null || !allDataReady) return

  if (dirtySections.size === 0) return
  // console.log(sections.length + ' dirty sections')

  // const start = performance.now()
  for (const key of dirtySections.keys()) {
    const [x, y, z] = key.split(',').map(v => parseInt(v, 10))
    const chunk = world.getColumn(x, z)
    let processTime = 0
    if (chunk?.getSection(new Vec3(x, y, z))) {
      const start = performance.now()
      const geometry = getSectionGeometry(x, y, z, world)
      const transferable = [geometry.positions?.buffer, geometry.normals?.buffer, geometry.colors?.buffer, geometry.uvs?.buffer].filter(Boolean)
      //@ts-expect-error
      postMessage({ type: 'geometry', key, geometry }, transferable)
      processTime = performance.now() - start
    } else {
      // console.info('[mesher] Missing section', x, y, z)
    }
    const dirtyTimes = dirtySections.get(key)
    if (!dirtyTimes) throw new Error('dirtySections.get(key) is falsy')
    for (let i = 0; i < dirtyTimes; i++) {
      postMessage({ type: 'sectionFinished', key, workerIndex, processTime })
      processTime = 0
    }
    dirtySections.delete(key)
  }
  // const time = performance.now() - start
  // console.log(`Processed ${sections.length} sections in ${time} ms (${time / sections.length} ms/section)`)
}, 50)
