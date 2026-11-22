import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import {
  RENDERER_EFFECT_OPTION_KEYS,
  RENDERER_OPTIONS_META,
  RENDERER_PERFORMANCE_LEVEL_LABELS,
  RENDERER_PERFORMANCE_NOTE,
  RENDERER_VISUAL_PROFILES,
  detectVisualProfile,
  rendererOptionPerformanceLevel,
  type RendererEffectOptionKey,
  type RendererVisualProfileId
} from 'minecraft-renderer/src/graphicsBackend/rendererDefaultOptions'
import { optionsMeta } from '../defaultOptions'
import { options } from '../optionsStorage'
import { VISUAL_EFFECTS_MODAL, closeVisualEffectsPanel } from '../visualEffectsPanel'
import Button from './Button'
import Slider from './Slider'
import { useIsModalActive } from './utilsApp'
import styles from './visualEffectsPanel.module.css'

const applyProfile = (id: RendererVisualProfileId) => {
  Object.assign(options, RENDERER_VISUAL_PROFILES[id].options)
}

const EffectRow = ({ optionKey }: { optionKey: RendererEffectOptionKey }) => {
  const value = useSnapshot(options)[optionKey]
  const meta = optionsMeta[optionKey]
  const text = meta?.text ?? titleCase(noCase(optionKey))
  const set = (newValue: unknown) => {
    ;(options as Record<string, unknown>)[optionKey] = newValue
  }

  if (typeof value === 'boolean') {
    return <Button label={`${text}: ${value ? 'ON' : 'OFF'}`} overlayColor={value ? undefined : 'rgba(255,0,0,0.12)'} onClick={() => set(!value)} />
  }
  if (typeof value === 'number') {
    return <Slider label={text} width={200} unit={meta?.unit ?? ''} min={meta?.min} max={meta?.max} value={value} updateValue={v => set(Math.round(v))} />
  }
  const choices = (meta?.possibleValues ?? []).map(v => (Array.isArray(v) ? v : ([v, v] as [string, string])))
  const index = Math.max(
    0,
    choices.findIndex(([choice]) => choice === value)
  )
  const current = choices[index]
  const next = choices[(index + 1) % Math.max(1, choices.length)]
  return <Button label={`${text}: ${current?.[1] ?? String(value)}`} overlayColor={value === 'off' ? 'rgba(255,0,0,0.12)' : undefined} onClick={() => next && set(next[0])} />
}

/** Small square in the top left corner of an option: what the current setting costs, same colours as the cost text. */
const LevelRect = ({ optionKey }: { optionKey: RendererEffectOptionKey }) => {
  const level = rendererOptionPerformanceLevel(optionKey, useSnapshot(options)[optionKey])
  if (!level) return null
  return <span className={`${styles.rect} ${styles[level]}`} title={`${RENDERER_PERFORMANCE_LEVEL_LABELS[level]} performance cost`} />
}

const Panel = () => {
  const snapshot = useSnapshot(options)
  const active = detectVisualProfile(snapshot)
  const [hovered, setHovered] = useState<RendererEffectOptionKey | undefined>()
  const performance = hovered ? RENDERER_OPTIONS_META[hovered]?.performance : undefined
  const hoveredLevel = hovered ? rendererOptionPerformanceLevel(hovered, snapshot[hovered]) : undefined

  return (
    <div className={styles.panel}>
      <div className={styles.title}>
        <span>Visual effects</span>
        <Button className={styles.close} icon='pixelarticons:close' title='Close (F7 or Escape)' onClick={closeVisualEffectsPanel} />
      </div>
      <div className={styles.profiles}>
        {Object.entries(RENDERER_VISUAL_PROFILES).map(([id, profile]) => (
          <Button key={id} label={profile.label} title={profile.description} overlayColor={id === active ? 'rgba(0,255,0,0.2)' : undefined} onClick={() => applyProfile(id)} />
        ))}
      </div>
      {RENDERER_EFFECT_OPTION_KEYS.map(key => (
        <div key={key} className={styles.row} onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(current => (current === key ? undefined : current))}>
          <EffectRow optionKey={key} />
          <LevelRect optionKey={key} />
        </div>
      ))}
      <div className={styles.hint}>
        {/* fixed height: the panel must not jump while moving the mouse over the options */}
        <div className={styles.note}>
          {performance && hoveredLevel ? (
            <>
              <span className={styles[hoveredLevel]}>{RENDERER_PERFORMANCE_LEVEL_LABELS[hoveredLevel]}</span> {performance.note}
            </>
          ) : (
            'Hover or tap an option to see what it costs.'
          )}
        </div>
        <div>{RENDERER_PERFORMANCE_NOTE}</div>
      </div>
    </div>
  )
}

/**
 * Live tuning of the renderer visual effects. A modal like the settings pages, so the app cannot be used behind it,
 * but without a backdrop: the world stays visible and every change shows up on screen immediately.
 */
export default () => {
  const active = useIsModalActive(VISUAL_EFFECTS_MODAL)
  if (!active) return null
  return <Panel />
}
