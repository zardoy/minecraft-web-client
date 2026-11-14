import { useSnapshot } from 'valtio'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import {
  RENDERER_EFFECT_OPTION_KEYS,
  RENDERER_VISUAL_PROFILES,
  detectVisualProfile,
  type RendererEffectOptionKey,
  type RendererVisualProfileId
} from 'minecraft-renderer/src/graphicsBackend/rendererDefaultOptions'
import { optionsMeta } from '../defaultOptions'
import { options } from '../optionsStorage'
import { miscUiState } from '../globalState'
import Button from './Button'
import Slider from './Slider'
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

const Panel = () => {
  const snapshot = useSnapshot(options)
  const active = detectVisualProfile(snapshot)
  return (
    <div className={styles.panel} onMouseDown={e => e.stopPropagation()}>
      <div className={styles.title}>
        Visual effects <span className={styles.key}>F7</span>
      </div>
      <div className={styles.profiles}>
        {Object.entries(RENDERER_VISUAL_PROFILES).map(([id, profile]) => (
          <Button key={id} label={profile.label} title={profile.description} overlayColor={id === active ? 'rgba(0,255,0,0.2)' : undefined} onClick={() => applyProfile(id)} />
        ))}
      </div>
      {RENDERER_EFFECT_OPTION_KEYS.map(key => (
        <EffectRow key={key} optionKey={key} />
      ))}
      <div className={styles.hint}>Click the world to look around, F7 to adjust again, F7 twice to close</div>
    </div>
  )
}

/** Live tuning of the renderer visual effects: a small panel in the corner without a backdrop, the world stays visible. */
export default () => {
  const { showVisualEffectsPanel } = useSnapshot(miscUiState)
  if (!showVisualEffectsPanel) return null
  return <Panel />
}
