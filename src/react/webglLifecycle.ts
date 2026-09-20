export type ReleasableWebGLRenderer = {
  forceContextLoss: () => void
  dispose: () => void
  domElement: {
    remove: () => void
  }
}

export const releaseWebGLRenderer = (renderer: ReleasableWebGLRenderer): void => {
  renderer.forceContextLoss()
  renderer.dispose()
  renderer.domElement.remove()
}
