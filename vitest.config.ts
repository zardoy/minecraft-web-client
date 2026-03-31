import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: 'renderer/viewer',
  test: {
    include: [
      '../../src/botUtils.test.ts',
      '../../src/markdownToFormattedText.test.ts',
      '../../src/react/parseKeybindingName.test.ts',
      '../../src/chatUtils.test.ts',
      '../../src/blockHash.test.ts',
      '../../src/chunkCacheReplay.test.ts',
      '../../src/chunkGeometryCache.test.ts',
      '../../src/chunkPacketCache.test.ts',
      'lib/chunkCacheIntegration.test.ts',
      'lib/mesher/test/tests.test.ts',
      'sign-renderer/tests.test.ts',
      '../../src/utils.test.ts'
    ],
  },
})
