/** Per-frame hooks run from the main-thread animation loop (see appViewerLoad). */
export const beforeRenderFrame: Array<() => void> = []

if (typeof window !== 'undefined') {
  window.beforeRenderFrame = beforeRenderFrame
}
