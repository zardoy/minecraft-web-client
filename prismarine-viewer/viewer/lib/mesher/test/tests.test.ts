import { test, expect } from 'vitest'
import supportedVersions from '../../../../../src/supportedVersions.mjs'
import { INVISIBLE_BLOCKS } from '../worldConstants'
import { setup } from './mesherTester'

const lastVersion = supportedVersions.at(-1)

const addPositions = [
  // [[0, 0, 0], 'diamond_block'],
  // [[1, 0, 0], 'stone'],
  // [[-1, 0, 0], 'stone'],
  // [[0, 1, 0], 'stone'],
  // [[0, -1, 0], 'stone'],
  // [[0, 0, 1], 'stone'],
  // [[0, 0, -1], 'stone'],
] as const

test('Known blocks are not rendered', () => {
  const { mesherWorld, getGeometry, pos, mcData } = setup(lastVersion, addPositions as any)
  const ignoreAsExpected = new Set([...INVISIBLE_BLOCKS, 'water', 'lava', 'moving_piston', 'light'])

  let time = 0
  let times = 0
  const missingBlocks = {}/*  as {[number, number]} */
  const erroredBlocks = {}/*  as {[number, number]} */
  for (const block of mcData.blocksArray) {
    if (ignoreAsExpected.has(block.name)) continue
    // if (block.maxStateId! - block.minStateId! > 100) continue
    // for (let i = block.minStateId!; i <= block.maxStateId!; i++) {
    for (let i = block.defaultState; i <= block.defaultState; i++) {
      // if (block.transparent) continue
      mesherWorld.setBlockStateId(pos, i)
      const start = performance.now()
      const { centerFaces, totalTiles, centerTileNeighbors, attr } = getGeometry()
      time += performance.now() - start
      times++
      if (centerFaces === 0) {
        const objAdd = attr.hadErrors ? erroredBlocks : missingBlocks
        if (objAdd[block.name]) continue
        objAdd[block.name] = true
        // invalidBlocks[block.name] = [i - block.defaultState!, centerTileNeighbors]
        // console.log('INVALID', block.name, centerTileNeighbors, i - block.minStateId)
      }
    }
  }
  console.log('Average time', time / times)
  // should be fixed, but to avoid regressions & for visibility
  expect(missingBlocks).toMatchInlineSnapshot(`
    {
      "bubble_column": true,
      "end_gateway": true,
      "end_portal": true,
      "structure_void": true,
    }
  `)
  expect(erroredBlocks).toMatchInlineSnapshot('{}')
})
