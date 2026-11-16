// Every noise worldgen worker holds its own copy of the generator (~150 MB, measured on desktop). iOS kills the page at about 1.5 GB
// (jetsam `highwater`): 4 workers hit that on an iPhone while singleplayer was still starting, 1 worker stayed at ~840 MiB.
// So iOS, and Android phones/tablets reporting 8 GB or less (Chrome never reports more than 8), use a single worker.
export interface DeviceInfo {
  userAgent: string
  platform?: string
  maxTouchPoints?: number
  /** `navigator.deviceMemory` in GB (Chromium only, capped at 8) */
  deviceMemory?: number
}

export const LOW_MEMORY_WORLDGEN_WORKERS = 1

const isIosDevice = ({ userAgent, platform, maxTouchPoints = 0 }: DeviceInfo) =>
  /iPhone|iPad|iPod/.test(userAgent) ||
  // iPadOS 13+ reports itself as a Mac
  (platform === 'MacIntel' && maxTouchPoints > 1)

const isAndroidDevice = ({ userAgent }: DeviceInfo) => /Android/.test(userAgent)

/** worker count to use instead of the default when the device is short on memory; undefined = keep the default */
export const lowMemoryWorldgenWorkers = (device: DeviceInfo): number | undefined => {
  if (isIosDevice(device)) return LOW_MEMORY_WORLDGEN_WORKERS
  // browsers that do not report the memory (Firefox) are treated as low memory too
  if (isAndroidDevice(device) && (device.deviceMemory ?? 0) <= 8) return LOW_MEMORY_WORLDGEN_WORKERS
  return undefined
}

export const currentDeviceInfo = (): DeviceInfo => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  maxTouchPoints: navigator.maxTouchPoints,
  deviceMemory: (navigator as { deviceMemory?: number }).deviceMemory
})
