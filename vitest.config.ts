import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: 'prismarine-viewer/viewer',
  test: {
    include: [
      '../../src/botUtils.test.ts',
      '../../src/markdownToFormattedText.test.ts',
      'lib/mesher/test/tests.test.ts',
      'sign-renderer/tests.test.ts', // prismarine-viewer/viewer/sign-renderer/tests.test.ts
      '../examples/chunksStorage.test.ts'
    ],
  },
})
