import path from 'path'
import fs from 'fs'
import { defineConfig } from 'vitest/config'

const physicsUtilSrcRoot = path.join(__dirname, 'node_modules/@nxg-org/mineflayer-physics-util/src')

export default defineConfig({
  root: 'src',
  resolve: {
    alias: fs.existsSync(physicsUtilSrcRoot) ? {
      '@nxg-org/mineflayer-physics-util': path.join(__dirname, './scripts/mineflayerPhysicsUtilEntry.ts'),
      '@nxg-org/mineflayer-util-plugin': path.join(__dirname, 'node_modules/@nxg-org/mineflayer-util-plugin'),
    } : {},
  },
  test: {
  },
})
