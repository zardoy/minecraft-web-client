import { useEffect, useRef, useState } from 'react'

/**
 * Seconds since `key` (what the loading screen says: stage, sub-step, detail) last changed while `active`, once that passed
 * `afterSeconds`; undefined before. A load that waits on something forever (a request that never answers, a module that never
 * resolves) otherwise looks like a frozen bar.
 */
export const useLoadingStall = (key: string, active: boolean, afterSeconds = 20) => {
  const changedAt = useRef(performance.now())
  const [stalledSeconds, setStalledSeconds] = useState<number | undefined>()

  useEffect(() => {
    changedAt.current = performance.now()
    setStalledSeconds(undefined)
  }, [key, active])

  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => {
      const seconds = (performance.now() - changedAt.current) / 1000
      setStalledSeconds(seconds >= afterSeconds ? Math.floor(seconds) : undefined)
    }, 1000)
    return () => clearInterval(interval)
  }, [active, afterSeconds])

  return stalledSeconds
}
