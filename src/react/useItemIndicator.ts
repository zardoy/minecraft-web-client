import { useEffect, useRef, useState } from 'react'
import type { UseItemSession } from 'minecraft-renderer/src/playerState/types'

export const USE_INDICATOR_TICK_MS = 50

export const shouldDisplayUseIndicator = (
  session: Pick<UseItemSession, 'itemSnapshot' | 'status'> | null | undefined
): boolean => {
  const action = session?.itemSnapshot.action
  return !!session
    && (session.status === 'active' || session.status === 'awaitingCompletion')
    && (action === 'EAT' || action === 'DRINK' || action === 'BOW' || action === 'CROSSBOW' || action === 'SHIELD')
}

export type UseIndicatorClock = {
  lastElapsedTicks: number | undefined
  lastElapsedChangeMs: number
}

export function computeUseIndicatorProgress (
  session: Pick<UseItemSession, 'elapsedTicks' | 'durationTicks' | 'status'> | null | undefined,
  nowMs: number,
  clock: UseIndicatorClock
): { progress: number; pending: boolean; clock: UseIndicatorClock } {
  if (!session || session.durationTicks <= 0) {
    return { progress: 0, pending: false, clock }
  }

  const pending = session.status === 'awaitingCompletion'
  if (pending) {
    return { progress: 1, pending: true, clock }
  }

  let { lastElapsedTicks, lastElapsedChangeMs } = clock
  if (lastElapsedTicks !== session.elapsedTicks) {
    lastElapsedTicks = session.elapsedTicks
    lastElapsedChangeMs = nowMs
  }
  const partial = Math.min(Math.max((nowMs - lastElapsedChangeMs) / USE_INDICATOR_TICK_MS, 0), 1)
  const progress = Math.min((session.elapsedTicks + partial) / session.durationTicks, 1)
  return {
    progress,
    pending: false,
    clock: { lastElapsedTicks, lastElapsedChangeMs },
  }
}

export function useUseIndicatorVisual (
  session: Pick<UseItemSession, 'id' | 'itemSnapshot' | 'status' | 'elapsedTicks' | 'durationTicks'> | null | undefined
) {
  const display = shouldDisplayUseIndicator(session)
  const clockRef = useRef<UseIndicatorClock>({
    lastElapsedTicks: undefined,
    lastElapsedChangeMs: 0,
  })
  const [nowMs, setNowMs] = useState(() => (typeof performance === 'undefined' ? 0 : performance.now()))

  useEffect(() => {
    if (!display || session?.status === 'awaitingCompletion') return undefined
    let frame = 0
    const loop = (time: number) => {
      setNowMs(time)
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
  }, [display, session?.status, session?.id])

  const visual = computeUseIndicatorProgress(session, nowMs, clockRef.current)

  useEffect(() => {
    clockRef.current = visual.clock
  }, [visual.clock])

  return {
    display,
    progress: visual.progress,
    pending: visual.pending,
  }
}
