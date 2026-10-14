import { proxy, subscribe, useSnapshot } from 'valtio'
import { useEffect, useMemo, useState } from 'react'
import { subscribeKey } from 'valtio/utils'
import { Effect } from 'mineflayer'
import { inGameError } from '../utils'
import { fsState } from '../loadSave'
import { gameAdditionalState, miscUiState } from '../globalState'
import IndicatorEffects, { EffectType, defaultIndicatorsState } from './IndicatorEffects'
import { images } from './effectsImages'

export const state = proxy({
  indicators: {
  },
  effects: [] as EffectType[]
})

export const addEffect = (newEffect: Effect) => {
  const effectData = loadedData.effectsArray.find(e => e.id === newEffect.id)
  const name = effectData?.name ?? `unknown: ${newEffect.id}`
  const nameKebab = name.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).slice(1)
  const image = images[nameKebab] ?? null
  if (!image) {
    inGameError(`received unknown effect id ${newEffect.id}`)
    return
  }

  const effectIndex = getEffectIndex({ id: newEffect.id })
  if (typeof effectIndex === 'number') {
    state.effects[effectIndex].initialTime = Date.now()
    state.effects[effectIndex].level = newEffect.amplifier
    state.effects[effectIndex].duration = newEffect.duration / 20 // convert ticks to seconds
  } else {
    const effect: EffectType = {
      id: newEffect.id,
      name,
      image,
      level: newEffect.amplifier,
      initialTime: Date.now(),
      duration: newEffect.duration / 20, // convert ticks to seconds
    }
    state.effects.push(effect)
  }
}

const removeEffect = (id: number) => {
  for (const [index, effect] of (state.effects).entries()) {
    if (effect.id === id) {
      state.effects.splice(index, 1)
    }
  }
}

const getEffectIndex = (newEffect: Pick<EffectType, 'id'>) => {
  for (const [index, effect] of (state.effects).entries()) {
    if (effect.id === newEffect.id) {
      return index
    }
  }
  return null
}

export default ({ displayEffects = true, displayIndicators = true }: { displayEffects?: boolean, displayIndicators?: boolean }) => {
  const [dummyState, setDummyState] = useState(false)
  const stateIndicators = useSnapshot(state.indicators)
  const chunksLoading = !useSnapshot(appViewer.rendererState).world.allChunksLoaded
  const { mesherWork } = useSnapshot(appViewer.rendererState).world

  const { hasErrors } = useSnapshot(miscUiState)
  const { isReadonly, openReadOperations, openWriteOperations } = useSnapshot(fsState)
  const { noConnection, poorConnection } = useSnapshot(gameAdditionalState)
  const allIndicators: typeof defaultIndicatorsState = {
    readonlyFiles: isReadonly,
    writingFiles: openWriteOperations > 0,
    readingFiles: openReadOperations > 0,
    appHasErrors: hasErrors,
    connectionIssues: poorConnection ? 1 : noConnection ? 2 : 0,
    chunksLoading,
    preventSleep: !!bot?.wakeLock,
    // mesherWork,
    ...stateIndicators,
  }

  const effects = useSnapshot(state.effects)

  useEffect(() => {
    // update bot related states
    const interval = setInterval(() => {
      setDummyState(s => !s)
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useMemo(() => {
    const effectsImages = Object.fromEntries(loadedData.effectsArray.map((effect) => {
      const nameKebab = effect.name.replaceAll(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`).slice(1)
      return [effect.id, images[nameKebab]]
    }))
    const gotEffect = (entity: import('prismarine-entity').Entity, effect: Effect) => {
      if (entity.id !== bot.entity.id) return
      addEffect(effect)
    }
    bot.on('entityEffect', gotEffect)

    // gotEffect(bot.entity, {
    //   id: 1,
    //   amplifier: 1,
    //   duration: 100,
    // })

    for (const effect of Object.values(bot.entity.effects ?? {})) {
      gotEffect(bot.entity, effect)
    }

    bot.on('entityEffectEnd', (entity, effect) => {
      if (entity.id !== bot.entity.id) return
      removeEffect(effect.id)
    })
  }, [])

  return <IndicatorEffects
    indicators={allIndicators}
    effects={effects}
    displayIndicators={displayIndicators}
    displayEffects={displayEffects}
  />
}
