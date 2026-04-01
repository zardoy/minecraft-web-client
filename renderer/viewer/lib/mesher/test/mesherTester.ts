import ChunkLoader, { PCChunk } from 'prismarine-chunk'
import { Vec3 } from 'vec3'
import MinecraftData from 'minecraft-data'
import blocksAtlasesJson from 'mc-assets/dist/blocksAtlases.json'
import { World as MesherWorld } from '../world'
import { setBlockStatesData, getSectionGeometry } from '../models'

export const setup = (version, initialBlocks: Array<[number[], string]>) => {
  const mcData = MinecraftData(version)
  const blockStatesModels = require(`mc-assets/dist/blockStatesModels.json`)
  const mesherWorld = new MesherWorld(version)
  const Chunk = ChunkLoader(version)
  const chunk1 = new Chunk(undefined as any)

  const pos = new Vec3(2, 5, 2)
  for (const [addPos, name] of initialBlocks) {
    chunk1.setBlockStateId(pos.offset(addPos[0], addPos[1], addPos[2]), mcData.blocksByName[name].defaultState)
  }

  const getGeometry = () => {
    const sectionGeometry = getSectionGeometry(0, 0, 0, mesherWorld)
    const centerFaces = sectionGeometry.tiles[`${pos.x},${pos.y},${pos.z}`]?.faces.length ?? 0
    const totalTiles = Object.values(sectionGeometry.tiles).reduce((acc, val: any) => acc + val.faces.length, 0)
    const centerTileNeighbors = Object.entries(sectionGeometry.tiles).reduce((acc, [key, val]: any) => {
      return acc + val.faces.filter((face: any) => face.neighbor === `${pos.x},${pos.y},${pos.z}`).length
    }, 0)
    return {
      centerFaces,
      totalTiles,
      centerTileNeighbors,
      faces: sectionGeometry.tiles[`${pos.x},${pos.y},${pos.z}`]?.faces ?? [],
      attr: sectionGeometry
    }
  }

  setBlockStatesData(blockStatesModels, blocksAtlasesJson, true, false, version, { blocks: mcData.blocksArray })
  const reload = () => {
    mesherWorld.removeColumn(0, 0)
    mesherWorld.addColumn(0, 0, chunk1.toJson())
  }
  reload()

  const getLights = () => {
    return Object.fromEntries(getGeometry().faces.map(({ face, light }) => ([face, (light ?? 0) * 15 - 2])))
  }

  const setLight = (x: number, y: number, z: number, val = 0) => {
    // create columns first
    chunk1.setBlockLight(pos.offset(x, y, z), 15)
    chunk1.setSkyLight(pos.offset(x, y, z), 15)
    chunk1.setBlockLight(pos.offset(x, y, z), val)
    chunk1.setSkyLight(pos.offset(x, y, z), 0)
  }

  return {
    mesherWorld,
    setLight,
    getLights,
    getGeometry,
    pos,
    mcData,
    reload,
    chunk: chunk1 as PCChunk
  }
}

// surround it
const addPositions = [
  // [[0, 0, 0], 'diamond_block'],
  [[1, 0, 0], 'stone'],
  [[-1, 0, 0], 'stone'],
  [[0, 1, 0], 'stone'],
  [[0, -1, 0], 'stone'],
  [[0, 0, 1], 'stone'],
  [[0, 0, -1], 'stone'],
]
