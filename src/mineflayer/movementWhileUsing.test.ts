import { describe, expect, test } from 'vitest'
import type { UseItemAction, UseItemSession } from 'minecraft-renderer/src/playerState/types'
import { shouldBlockSprint, shouldSlowWhileUsing } from './movementWhileUsing'

const makeSession = (action: UseItemAction = 'EAT', status: UseItemSession['status'] = 'active'): UseItemSession => ({
  id: 1,
  itemSnapshot: {
    name: action === 'BOW' ? 'bow' : 'bread',
    durationTicks: 32,
    action,
    particleEffect: action === 'EAT' ? 'food' : 'none',
  },
  hand: 0,
  action,
  durationTicks: 32,
  elapsedTicks: 0,
  status,
})

describe('movement restrictions while using an item', () => {
  test('requires an active or awaiting-completion session', () => {
    expect(shouldSlowWhileUsing(undefined, false)).toBe(false)
    expect(shouldBlockSprint(undefined)).toBe(false)
    expect(shouldSlowWhileUsing(makeSession('EAT', 'completed'), false)).toBe(false)
    expect(shouldBlockSprint(makeSession('EAT', 'cancelled'))).toBe(false)
    expect(shouldSlowWhileUsing(makeSession('DRINK', 'awaitingCompletion'), false)).toBe(true)
    expect(shouldBlockSprint(makeSession('EAT', 'active'))).toBe(true)
  })

  test('matches represented vanilla use actions, including bow draw', () => {
    for (const action of ['EAT', 'DRINK', 'BOW', 'CROSSBOW', 'SHIELD'] as const) {
      expect(shouldSlowWhileUsing(makeSession(action), false)).toBe(true)
      expect(shouldBlockSprint(makeSession(action))).toBe(true)
    }
    expect(shouldSlowWhileUsing(makeSession('NONE'), false)).toBe(false)
    expect(shouldBlockSprint(makeSession('NONE'))).toBe(false)
  })

  test('mounted players keep normal movement but still cannot sprint while using', () => {
    const session = makeSession('BOW')
    expect(shouldSlowWhileUsing(session, true)).toBe(false)
    expect(shouldBlockSprint(session)).toBe(true)
  })
})
