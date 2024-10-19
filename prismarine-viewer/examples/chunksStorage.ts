import { BlockFaceType, BlockType, makeError } from './shared'

export type BlockTile = [number, number, number, BlockFaceType]

const chunksArrIndexes = {}
// const freeArrayIndexes = [] as Array<[number, number]>
export class ChunksStorage {
  allSides = [] as Array<BlockTile | undefined>
  chunkSides = new Map<string, BlockTile[]>()
  lastNotUpdatedIndex
  lastNotUpdatedArrSize

  getDataForBuffers () {
    return {
      allSides: this.allSides,
      chunkSides: this.chunkSides
    }
  }

  addData (tiles: Record<string, BlockType>, key: string) {
    const newData = Object.entries(tiles).flatMap(([key, value]) => {
      const [x, y, z] = key.split(',').map(Number)
      const block = value
      return block.faces.slice(0, 1).map((side) => {
      // return block.faces.map((side) => {
        const xRel = Math.abs(x % 16)
        const zRel = Math.abs(z % 16)
        return [xRel, y, zRel, side] as [number, number, number, BlockFaceType]
      })
    })

    if (this.chunkSides.has(key)) {
      throw new Error(`Chunk ${key} already exists TODO updates`)
    }

    const [xSection, ySection, zSection] = key.split(',').map(Number)
    const chunkKey = `${xSection / 16},${ySection / 16},${zSection / 16}`
    this.chunkSides.set(chunkKey, newData)

    const currentLength = this.allSides.length
    // // in: object - name, out: [x, y, z, name]
    // // find freeIndexes if possible
    // const freeArea = freeArrayIndexes.find(([startIndex, endIndex]) => endIndex - startIndex >= newData.length)
    // if (freeArea) {
    //   const [startIndex, endIndex] = freeArea
    //   allSides.splice(startIndex, newData.length, ...newData)
    //   lastNotUpdatedIndex ??= startIndex
    //   const freeAreaIndex = freeArrayIndexes.indexOf(freeArea)
    //   freeArrayIndexes[freeAreaIndex] = [startIndex + newData.length, endIndex]
    //   if (freeArrayIndexes[freeAreaIndex][0] >= freeArrayIndexes[freeAreaIndex][1]) {
    //     freeArrayIndexes.splice(freeAreaIndex, 1)
    //     // todo merge
    //   }
    //   lastNotUpdatedArrSize = newData.length
    //   console.log('using free area', freeArea)
    // }

    // chunksArrIndexes[key] = [currentLength, currentLength + newData.length]
    let i = 0
    while (i < newData.length) {
      this.allSides.splice(currentLength + i, 0, ...newData.slice(i, i + 1024))
      i += 1024
    }
    const totalChunksLength = [...this.chunkSides.values()].reduce((a, x) => a + x.length, 0)
    if (totalChunksLength !== this.allSides.length) {
      makeError(`totalChunksLength ${totalChunksLength} !== allSides.length ${this.allSides.length}`)
    }
    this.lastNotUpdatedIndex ??= currentLength
    // if (webglRendererWorker && webglRendererWorker.notRenderedAdditions < 5) {
  }
}
