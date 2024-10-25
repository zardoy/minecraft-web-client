import { test, expect } from 'vitest'
import { ChunksStorage } from './chunksStorage'

globalThis.reportError = err => {
  throw err
}
test('works', () => {
  const storage = new ChunksStorage()
  for (let i = 0; i < 100; i++) {
    const faces = Object.fromEntries(Array.from({ length: Math.floor(Math.random() * 100) }, () => {
      return [`${i},0,0`, {
        faces: [
          {
            side: 0,
            textureIndex: 0,
          },
          {
            side: 1,
            textureIndex: 0,
          },
        ],
        block: 'test',
      }]
    }))
    storage.addData(faces, `0,0,0`)
  }
  // expect(storage.allSides.length === [...storage.chunkSides.values()].reduce((a, x) => a + x.length, 0))
})
