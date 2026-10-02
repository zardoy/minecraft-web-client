export type ModelViewerSessionToken = object

export const createModelViewerSessionToken = (): ModelViewerSessionToken => ({})

export const isModelLoadCurrent = (
  currentToken: ModelViewerSessionToken | undefined,
  loadToken: ModelViewerSessionToken,
  modelUrls: readonly string[] | undefined,
  modelUrl: string
): boolean => currentToken === loadToken && !!modelUrls?.includes(modelUrl)

export const modelUrlsToLoad = (modelUrls: readonly string[], loadedUrls: ReadonlySet<string>, loadingUrls: ReadonlySet<string>): string[] => {
  return modelUrls.filter(modelUrl => !loadedUrls.has(modelUrl) && !loadingUrls.has(modelUrl))
}
