import { EventEmitter } from 'node:events'
import type { Bot } from 'mineflayer'
import { beforeAll, describe, expect, test, vi } from 'vitest'
import { MouseManager } from 'mineflayer-mouse/dist/mouse'
import { isItemActivatable } from 'mineflayer-mouse/dist/itemActivatable'
import { getInitialPlayerState } from 'minecraft-renderer/src/playerState/playerState'
import { shouldApplyEatTransform } from '../../../minecraft-renderer/src/three/holdingBlockEatTransform'
import type { UseItemSession } from 'minecraft-renderer/src/playerState/types'
import type { PlayerStateControllerMain as PlayerStateController } from './playerState'
import { buildUseEffectBoundaries, getCrossedUseEffectBoundaries } from './useItemEffects'
import { shouldSlowWhileUsing } from './movementWhileUsing'
import { shouldDisplayUseIndicator } from '../react/useItemIndicator'

vi.mock('../globalState', () => ({
  gameAdditionalState: { isFlying: false, isSneaking: false },
}))
vi.mock('../optionsStorage', () => ({
  options: { fov: 70 },
}))
vi.mock('../mountedPlayerState', () => ({
  updateMountedBobState: vi.fn((value) => value),
  updateMountedMovementState: vi.fn((value) => value),
}))
vi.mock('../cameraMovementMode', () => ({
  getCameraMovementMode: vi.fn(() => 'local-player'),
}))
vi.mock('minecraft-renderer/src/three/threeJsMethods', () => ({
  getThreeJsRendererMethods: () => {
    const globals = globalThis as typeof globalThis & { __integrationRendererMethods?: unknown }
    return globals.__integrationRendererMethods
  },
}))

const customEvents = new EventEmitter()
customEvents.setMaxListeners(1000)
const integrationWindow: Record<string, unknown> = {}
const loadedData = {
  foodsArray: [
    { name: 'bread' },
    { name: 'dried_kelp' },
    { name: 'golden_apple' },
  ],
}

// playerState.ts registers browser globals and a module-level event listener at
// import time. Install the minimal browser/session boundary before loading it;
// static import would evaluate the module before these mocks exist.
vi.stubGlobal('window', integrationWindow)
vi.stubGlobal('customEvents', customEvents)
vi.stubGlobal('loadedData', loadedData)
vi.stubGlobal('appViewer', { playerState: { reactive: getInitialPlayerState() } })

let PlayerStateControllerMain: typeof PlayerStateController

beforeAll(async () => {
  const playerStateModule = await import('./playerState')
  PlayerStateControllerMain = playerStateModule.PlayerStateControllerMain
})

type FakeItem = { name: string; count: number; type: number }
type FakeBot = EventEmitter & {
  _client: EventEmitter
  activateItem: (offhand: boolean) => unknown
  deactivateItem: () => unknown
  digTime: (block: unknown) => number
  stopDigging: () => unknown
  supportFeature: (feature: string) => boolean
  getControlState: (control: string) => boolean
  inventory: { slots: Array<FakeItem | undefined> }
  heldItem: FakeItem | undefined
  quickBarSlot: number
  food: number
  game: { gameMode: string }
  version: string
  entity: { id: number; position: { x: number; y: number; z: number } } | undefined
}

type ParticleCall = { name: string; count: number }

type Harness = {
  bot: FakeBot
  controller: PlayerStateController
  mouse: MouseManager
  particles: ParticleCall[]
  sounds: string[]
  startEvents: unknown[][]
}

type EntityStatusPacket = { entityId: number; entityStatus: number }

type ControllerUseInternals = {
  cancelUseForHeldItem: (hand: 0 | 1, name?: string) => UseItemSession | undefined
}

const item = (name: string, type = 1, count = 1): FakeItem => ({ name, type, count })

const isEntityStatusPacket = (value: unknown): value is EntityStatusPacket => {
  if (!value || typeof value !== 'object') return false
  const packet = value as Partial<EntityStatusPacket>
  return typeof packet.entityId === 'number' && typeof packet.entityStatus === 'number'
}

const emitEntityStatus9 = (harness: Harness) => {
  harness.bot.entity ??= { id: 7, position: { x: 0, y: 64, z: 0 } }
  harness.bot._client.emit('entity_status', { entityId: harness.bot.entity.id, entityStatus: 9 })
}

const createHarness = (mainName = 'dirt', offhandName: string | undefined = 'bread', food = 19): Harness => {
  const bot = new EventEmitter() as FakeBot
  bot._client = new EventEmitter()
  bot.activateItem = vi.fn()
  bot.deactivateItem = vi.fn()
  bot.digTime = vi.fn(() => 1000)
  bot.stopDigging = vi.fn()
  bot.supportFeature = vi.fn(() => false)
  bot.getControlState = vi.fn(() => false)
  bot.inventory = { slots: Array.from({ length: 46 }, () => undefined) }
  bot.heldItem = item(mainName)
  bot.inventory.slots[45] = offhandName ? item(offhandName, 2) : undefined
  bot.quickBarSlot = 2
  bot.food = food
  bot.game = { gameMode: 'survival' }
  bot.version = '1.17.1'
  bot.entity = undefined
  vi.stubGlobal('bot', bot)

  const controller = new PlayerStateControllerMain()
  controller.reactive = getInitialPlayerState()

  const particles: ParticleCall[] = []
  const sounds: string[] = []
  const globals = globalThis as typeof globalThis & {
    __integrationRendererMethods?: { spawnItemParticles: (...args: unknown[]) => Promise<void> }
  }
  globals.__integrationRendererMethods = {
    spawnItemParticles: vi.fn(async (_x: number, _y: number, _z: number, name: string, count: number) => {
      particles.push({ name, count })
    }),
  }
  bot.on('soundEffectHeard', (sound: unknown) => sounds.push(String(sound)))

  const startEvents: unknown[][] = []
  bot.on('startUsingItem', (...args: unknown[]) => startEvents.push(args))
  bot.on('startUsingItem', (value: unknown, _slot: unknown, isOffhand: unknown) => {
    controller.startUsingItem(value as FakeItem, isOffhand === true ? 1 : 0)
  })
  bot.on('stopUsingItem', (value: unknown, _slot: unknown, isOffhand: unknown) => {
    controller.stopUsingItem(value as FakeItem, isOffhand === true ? 1 : 0)
  })
  bot._client.on('entity_status', (value: unknown) => {
    if (!isEntityStatusPacket(value)) return
    if (value.entityId === bot.entity?.id && value.entityStatus === 9) controller.completeUse()
  })

  const mouse = new MouseManager(bot as unknown as Bot)
  return { bot, controller, mouse, particles, sounds, startEvents }
}

const activeSession = (harness: Harness, name: string, hand: 0 | 1 = 0): UseItemSession => {
  harness.bot.entity ??= { id: 7, position: { x: 0, y: 64, z: 0 } }
  const started = harness.controller.startUsingItem({ name }, hand)
  const session = harness.controller.reactive.itemUseSession
  expect(started).toBeDefined()
  expect(session?.status).toBe('active')
  return session!
}

const advanceToEnd = (harness: Harness, session: UseItemSession) => {
  for (let tick = 0; tick < session.durationTicks; tick++) harness.controller.advanceUse()
  expect(session.elapsedTicks).toBe(session.durationTicks)
}

describe('item-use input/state/UI integration', () => {
  test('RMB selects edible offhand, starts hand 1, and gates only the offhand render', () => {
    const harness = createHarness('dirt', 'bread')
    const { bot, controller, mouse, startEvents } = harness

    // MouseManager's updatePlaceInteract is the actual RMB path. Keep the
    // cursor empty so the activatable-hand selection is the only branch.
    mouse.buttons[2] = true
    mouse.update()
    bot.entity = { id: 7, position: { x: 0, y: 64, z: 0 } }

    const session = controller.reactive.itemUseSession
    expect(bot.activateItem).toHaveBeenCalledWith(true)
    expect(startEvents[0]?.[1]).toBe(45)
    expect(startEvents[0]?.[2]).toBe(true)
    expect(session?.itemSnapshot.name).toBe('bread')
    expect(session?.hand).toBe(1)
    expect(shouldDisplayUseIndicator(session)).toBe(true)
    expect(shouldApplyEatTransform(session, 0)).toBe(false)
    expect(shouldApplyEatTransform(session, 1)).toBe(true)
    expect(shouldSlowWhileUsing(session, false)).toBe(true)
  })

  test('the 1.17.1 activatable table includes foods and drinks but not placeable blocks', () => {
    for (const name of ['bread', 'dried_kelp', 'golden_apple', 'honey_bottle', 'milk_bucket', 'potion']) {
      expect(isItemActivatable('1.17.1', { name })).toBe(true)
    }
    expect(isItemActivatable('1.17.1', { name: 'dirt' })).toBe(false)
  })

  test.each([
    { name: 'bread', action: 'EAT', duration: 32, periodic: 6 },
    { name: 'dried_kelp', action: 'EAT', duration: 16, periodic: 4 },
    { name: 'honey_bottle', action: 'DRINK', duration: 40, periodic: 8 },
  ] as const)('advances $name for $duration ticks and emits each periodic boundary once', ({ name, action, duration, periodic }) => {
    const harness = createHarness('dirt', undefined)
    const session = activeSession(harness, name)

    expect(session.action).toBe(action)
    expect(session.durationTicks).toBe(duration)
    advanceToEnd(harness, session)
    if (action === 'EAT') {
      expect(harness.particles).toHaveLength(periodic)
      expect(harness.particles.every(particle => particle.count === 5)).toBe(true)
    } else {
      expect(harness.particles).toHaveLength(0)
    }
    expect([...buildUseEffectBoundaries(duration, name === 'dried_kelp')]).toHaveLength(periodic)
  })

  test('the local player plays eat/drink sounds because the server excludes the source from sound_effect', () => {
    const eat = createHarness('dirt', undefined)
    advanceToEnd(eat, activeSession(eat, 'bread'))
    expect(eat.sounds.filter(sound => sound === 'entity.generic.eat')).toHaveLength(6)

    emitEntityStatus9(eat)
    expect(eat.sounds.filter(sound => sound === 'entity.generic.eat')).toHaveLength(7)
    expect(eat.sounds.filter(sound => sound === 'entity.player.burp')).toHaveLength(1)

    const drink = createHarness('dirt', undefined)
    advanceToEnd(drink, activeSession(drink, 'honey_bottle'))
    expect(drink.sounds.filter(sound => sound === 'item.honey_bottle.drink')).toHaveLength(8)
    expect(drink.particles).toHaveLength(0)
  })

  test('full hunger gates bread but still starts a golden apple', () => {
    const harness = createHarness('dirt', undefined, 20)
    const { controller } = harness

    expect(controller.beginUse({ name: 'bread' }, 0)).toBeUndefined()
    const goldenApple = controller.beginUse({ name: 'golden_apple' }, 0)
    expect(goldenApple?.itemSnapshot.name).toBe('golden_apple')
    expect(goldenApple?.action).toBe('EAT')
    expect(goldenApple?.hand).toBe(0)
  })

  test('early release cancels and never emits a finish effect', () => {
    const harness = createHarness('dirt', undefined)
    const { controller } = harness
    const session = activeSession(harness, 'bread')

    controller.advanceUse()
    controller.advanceUse()
    controller.stopUsingItem({ name: 'bread' }, 0)
    expect(session.status).toBe('cancelled')
    emitEntityStatus9(harness)
    expect(session.status).toBe('cancelled')
    expect(harness.particles).toHaveLength(0)
  })

  test.each([
    ['stop then event-9', true],
    ['event-9 then stop', false],
  ] as const)('stop and event-9 in either order finish exactly once (%s)', (_label, stopFirst) => {
    const harness = createHarness('dirt', undefined)
    const { controller, mouse } = harness
    const session = activeSession(harness, 'bread')
    advanceToEnd(harness, session)

    if (stopFirst) {
      controller.stopUsingItem({ name: 'bread' }, 0)
      emitEntityStatus9(harness)
    } else {
      emitEntityStatus9(harness)
      controller.stopUsingItem({ name: 'bread' }, 0)
    }
    expect(session.status).toBe('completed')
    expect(harness.particles.filter(particle => particle.count === 5)).toHaveLength(6)
    expect(harness.particles.filter(particle => particle.count === 16)).toHaveLength(1)

    emitEntityStatus9(harness)
    const stopMouseUsingItem = (mouse as unknown as { stopUsingItem: () => void }).stopUsingItem
    stopMouseUsingItem.call(mouse)
    expect(harness.particles.filter(particle => particle.count === 16)).toHaveLength(1)
  })

  test('event-9 while elapsed is still below duration completes the current eat', () => {
    const harness = createHarness('dirt', undefined)
    const { controller } = harness
    const session = activeSession(harness, 'bread')

    controller.advanceUse()
    controller.advanceUse()
    expect(session.elapsedTicks).toBeLessThan(session.durationTicks)
    expect(session.status).toBe('active')
    emitEntityStatus9(harness)
    expect(session.status).toBe('completed')
    expect(harness.particles).toEqual([{ name: 'bread', count: 16 }])
  })

  test('event-9 after cancel while the cancelled session is still current is a no-op', () => {
    const harness = createHarness('dirt', undefined)
    const { controller } = harness
    const session = activeSession(harness, 'bread')

    controller.advanceUse()
    controller.stopUsingItem({ name: 'bread' }, 0)
    emitEntityStatus9(harness)
    emitEntityStatus9(harness)
    expect(session.status).toBe('cancelled')
    expect(harness.particles).toHaveLength(0)
  })

  test('beginUse during awaitingCompletion returns the same session and does not start B', () => {
    const harness = createHarness('dirt', undefined)
    const { controller } = harness
    const session = activeSession(harness, 'bread')
    advanceToEnd(harness, session)
    expect(session.status).toBe('awaitingCompletion')
    expect(shouldDisplayUseIndicator(session)).toBe(true)

    const again = controller.beginUse({ name: 'bread' }, 0)
    expect(again).toBe(session)
    expect(again?.id).toBe(session.id)
    expect(controller.reactive.itemUseSession).toBe(session)
    expect(session.status).toBe('awaitingCompletion')
  })

  test('duplicate event-9 after completed is a no-op and finish particles fire once', () => {
    const harness = createHarness('dirt', undefined)
    const session = activeSession(harness, 'bread')
    advanceToEnd(harness, session)
    emitEntityStatus9(harness)
    expect(session.status).toBe('completed')
    expect(harness.particles.filter(particle => particle.count === 16)).toHaveLength(1)

    emitEntityStatus9(harness)
    expect(session.status).toBe('completed')
    expect(harness.particles.filter(particle => particle.count === 16)).toHaveLength(1)
  })

  test('stop at predicted end then event-9 on the same session completes once', () => {
    const harness = createHarness('dirt', undefined)
    const { controller } = harness
    const session = activeSession(harness, 'bread')
    advanceToEnd(harness, session)
    controller.stopUsingItem({ name: 'bread' }, 0)
    expect(session.status).toBe('awaitingCompletion')
    expect(shouldDisplayUseIndicator(session)).toBe(true)

    emitEntityStatus9(harness)
    expect(session.status).toBe('completed')
    expect(harness.particles.filter(particle => particle.count === 16)).toHaveLength(1)
  })

  test('consecutive eats receive a new id and reset elapsed ticks', () => {
    const harness = createHarness('dirt', undefined)
    const first = activeSession(harness, 'bread')
    advanceToEnd(harness, first)
    emitEntityStatus9(harness)
    expect(first.status).toBe('completed')

    const second = activeSession(harness, 'bread')
    expect(second.id).toBe(first.id + 1)
    expect(second.elapsedTicks).toBe(0)
    expect(second.status).toBe('active')
  })

  test('count changes retain the session, but a real slot switch cancels it', () => {
    const harness = createHarness('bread', undefined)
    const { bot, controller } = harness
    const session = activeSession(harness, 'bread')
    const cancelForHeldItem = (controller as unknown as ControllerUseInternals).cancelUseForHeldItem.bind(controller)

    bot.heldItem = item('bread', 1, 0)
    cancelForHeldItem(0, 'bread')
    expect(session.status).toBe('active')

    bot.quickBarSlot = 3

    bot.heldItem = item('dirt')
    cancelForHeldItem(0, 'dirt')
    expect(session.status).toBe('cancelled')
    expect(shouldDisplayUseIndicator(session)).toBe(false)
    expect(shouldApplyEatTransform(session, 0)).toBe(false)
    expect(shouldSlowWhileUsing(session, false)).toBe(false)
  })
  test('depleted offhand stack retains snapshot and hand through awaiting completion', () => {
    const harness = createHarness('dirt', 'bread')
    const { bot, controller } = harness
    const session = activeSession(harness, 'bread', 1)
    advanceToEnd(harness, session)

    bot.inventory.slots[45] = undefined
    const cancelForHeldItem = (controller as unknown as ControllerUseInternals).cancelUseForHeldItem.bind(controller)
    cancelForHeldItem(1, undefined)
    expect(session.status).toBe('awaitingCompletion')
    expect(session.itemSnapshot.name).toBe('bread')
    expect(session.hand).toBe(1)
    expect(shouldDisplayUseIndicator(session)).toBe(true)
    expect(shouldApplyEatTransform(session, 1)).toBe(false)

    emitEntityStatus9(harness)
    expect(session.status).toBe('completed')
    expect(session.itemSnapshot.name).toBe('bread')
    expect(session.hand).toBe(1)
    expect(shouldDisplayUseIndicator(session)).toBe(false)
    expect(shouldApplyEatTransform(session, 1)).toBe(false)
  })

  test('death/reset clears the session and all downstream predicates', () => {
    const harness = createHarness('dirt', undefined)
    const { bot, controller } = harness
    const session = activeSession(harness, 'bread')
    bot.on('death', () => controller.resetUseSession())
    bot.emit('death')

    expect(controller.reactive.itemUseSession).toBeUndefined()
    expect(shouldDisplayUseIndicator(controller.reactive.itemUseSession)).toBe(false)
    expect(shouldApplyEatTransform(controller.reactive.itemUseSession, session.hand)).toBe(false)
    expect(shouldSlowWhileUsing(controller.reactive.itemUseSession, false)).toBe(false)
  })

  test('a multi-tick catch-up crosses each boundary once and is idempotent', () => {
    const harness = createHarness('dirt', undefined)
    const session = activeSession(harness, 'bread')
    const boundaries = buildUseEffectBoundaries(session.durationTicks, false)
    const fired = new Set<number>()

    const crossed = getCrossedUseEffectBoundaries(0, session.durationTicks, session.durationTicks, boundaries, fired)
    crossed.forEach(value => fired.add(value))
    expect(crossed).toHaveLength(6)
    expect(getCrossedUseEffectBoundaries(0, session.durationTicks, session.durationTicks, boundaries, fired)).toEqual([])
  })
})
