import { createContext, useContext, useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { rendererOptionPerformanceLevel, RENDERER_OPTIONS_META, RENDERER_PERFORMANCE_LEVEL_LABELS } from 'minecraft-renderer/src/graphicsBackend/rendererDefaultOptions'
import { defaultOptions, disabledSettings, options, resetSelectedOptions } from '../../optionsStorage'
import { optionsMeta, type OptionPossibleValues } from '../../defaultOptions'
import { miscUiState } from '../../globalState'
import { appStorage } from '../appStorageProvider'
import FlatButton from '../ui/FlatButton'
import Slider from '../Slider'
import PixelartIcon from '../PixelartIcon'
import { showOptionsModal } from '../SelectOption'
import { settingNeedsReloadPrompt } from '../SettingReloadModal'
import { applySettingReloadResult, promptAndApplyReloadSetting } from '../settingReloadApply'
import type { OptionItem } from '../../optionsGuiScheme'
import styles from './settings.module.css'

// #region info bar: the description of the row under the pointer (or the last tapped one) is shown at the bottom of the settings screen

export interface SettingInfo {
  label: string
  description?: string
  /** performance cost of a graphics option for its current value */
  cost?: { level: string, note: string }
  disabledReason?: string
}

export const SettingInfoContext = createContext<(info: SettingInfo | undefined) => void>(() => {})

// #endregion

// #region primitive controls

export type Choice = [value: string, label: string]

export const normalizeChoices = (values: OptionPossibleValues | undefined): Choice[] => {
  return (values ?? []).map((v): Choice => (typeof v === 'string' ? [v, titleCase(noCase(v))] : [v[0], v[1]]))
}

/** pixel switch, the value is shown with a word too so it reads without colours */
export const Switch = ({ value, onChange, disabled, title }: { value: boolean, onChange: (value: boolean) => void, disabled?: boolean, title?: string }) => {
  return <button
    type='button'
    role='switch'
    aria-checked={value}
    disabled={disabled}
    title={title}
    className={`${styles.switch} ${value ? styles.switchOn : ''} settings-switch`}
    onClick={() => onChange(!value)}
  >
    <span className={styles.switchText}>{translate(value ? 'ON' : 'OFF')}</span>
    <span className={styles.switchKnob} />
  </button>
}

/** all choices visible at once (2-3 short values) */
export const Segmented = ({ choices, value, onChange, disabled }: { choices: Choice[], value: string, onChange: (value: string) => void, disabled?: boolean }) => {
  return <div className={`${styles.segmented} settings-segmented`} role='radiogroup'>
    {choices.map(([choice, label]) => <button
      key={choice}
      type='button'
      role='radio'
      aria-checked={choice === value}
      disabled={disabled}
      className={`${styles.segment} ${choice === value ? styles.segmentActive : ''}`}
      onClick={() => choice !== value && onChange(choice)}
    >{translate(label)}
    </button>)}
  </div>
}

/** ◀ value ▶ picker for longer lists; the value itself opens the whole list */
export const ChoicePicker = ({ choices, value, onChange, disabled, title }: { choices: Choice[], value: string, onChange: (value: string) => void, disabled?: boolean, title: string }) => {
  const index = choices.findIndex(([choice]) => String(choice) === String(value))
  const step = (dir: 1 | -1) => {
    const next = choices[((index === -1 ? 0 : index) + dir + choices.length) % choices.length]
    if (next) onChange(next[0])
  }
  return <div className={`${styles.picker} settings-picker`}>
    <button type='button' className={styles.pickerArrow} disabled={disabled} aria-label='Previous' onClick={() => step(-1)}>
      <PixelartIcon iconName='chevron-left' />
    </button>
    <button
      type='button'
      className={styles.pickerValue}
      disabled={disabled}
      onClick={async () => {
        const labels = choices.map(([, label]) => label)
        const picked = await showOptionsModal(title, labels, { hoveredOptionIndex: index })
        if (!picked) return
        onChange(choices[labels.indexOf(picked)][0])
      }}
    >{translate(choices[index]?.[1] ?? String(value))}
    </button>
    <button type='button' className={styles.pickerArrow} disabled={disabled} aria-label='Next' onClick={() => step(1)}>
      <PixelartIcon iconName='chevron-right' />
    </button>
  </div>
}

// #endregion

// #region rows

export const SettingRow = ({ label, description, changed, onReset, cost, disabledReason, children, wide }: {
  label: string
  description?: string
  changed?: boolean
  onReset?: () => void
  cost?: SettingInfo['cost']
  disabledReason?: string
  children: React.ReactNode
  /** the control takes the whole row under the label (long sliders) */
  wide?: boolean
}) => {
  const setInfo = useContext(SettingInfoContext)
  const info: SettingInfo = { label: translate(label), description: description && translate(description), cost, disabledReason }
  return <div
    className={`${styles.row} ${wide ? styles.rowWide : ''} ${disabledReason ? styles.rowDisabled : ''} settings-row`}
    onPointerEnter={() => setInfo(info)}
    onPointerDown={() => setInfo(info)}
    onFocus={() => setInfo(info)}
  >
    <div className={styles.rowLabel}>
      <span className={styles.rowLabelText}>{translate(label)}</span>
      {cost && <span className={`${styles.cost} ${styles[`cost_${cost.level}`]}`} title={cost.note}>{RENDERER_PERFORMANCE_LEVEL_LABELS[cost.level] ?? cost.level}</span>}
      {changed && onReset && <button
        type='button'
        className={styles.changed}
        title={translate('Changed. Click to reset to default')}
        aria-label={translate('Reset to default')}
        onClick={onReset}
      />}
    </div>
    <div className={styles.rowControl}>{children}</div>
  </div>
}

export const SectionHeader = ({ title, anchor }: { title: string, anchor?: string }) => {
  return <div className={`${styles.section} settings-section`} data-anchor={anchor}>{translate(title)}</div>
}

/** a row whose control is a button that opens something */
export const ActionRow = ({ label, description, buttonLabel, onClick, disabled, danger, icon }: {
  label: string
  description?: string
  buttonLabel: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  icon?: string
}) => {
  return <SettingRow label={label} description={description}>
    <FlatButton
      className={styles.actionButton}
      variant={danger ? 'danger' : 'default'}
      disabled={disabled}
      onClick={onClick}
      icon={icon}
      label={buttonLabel}
    />
  </SettingRow>
}

// #endregion

// #region option rows (bound to `options`)

const isSettingChanged = (id: string) => {
  return id in appStorage.changedSettings &&
    JSON.stringify(appStorage.changedSettings[id]) !== JSON.stringify(defaultOptions[id])
}

export const getItemText = (item: OptionItem) => {
  const meta = optionsMeta[item.option]
  return item.text ?? meta?.text ?? titleCase(noCase(item.option))
}

export const getItemDescription = (item: OptionItem) => {
  return item.tooltip ?? optionsMeta[item.option]?.tooltip
}

/** applies a picked value: the enable warning and the reload prompt work as they did on the old settings buttons */
const applyOptionValue = async (item: OptionItem, value: unknown) => {
  const meta = optionsMeta[item.option]
  const current = options[item.option]
  if (item.enableWarning && !current && value) {
    const confirmed = await showOptionsModal(item.enableWarning, ['Enable'])
    if (!confirmed) return
  }
  const requiresRestart = item.requiresRestart ?? meta?.requiresRestart
  const requiresChunksReload = item.requiresChunksReload ?? meta?.requiresChunksReload
  if (settingNeedsReloadPrompt(requiresRestart, requiresChunksReload, item.requiresRestartWhenInGame)) {
    const result = await promptAndApplyReloadSetting({
      settingLabel: translate(getItemText(item)),
      currentValue: value,
      possibleValues: meta?.possibleValues,
      requiresRestart,
      requiresChunksReload,
      tooltip: getItemDescription(item),
    })
    if (!result) return
    options[item.option] = result.value as never
    applySettingReloadResult(result)
    return
  }
  options[item.option] = value as never
}

export const useItemDisabledReason = (item: Pick<OptionItem, 'option' | 'disableIf' | 'disabledReason' | 'disabledDuringGame'>) => {
  const snapshot = useSnapshot(options)
  const { gameLoaded } = useSnapshot(miscUiState)
  if (disabledSettings.value.has(item.option)) return 'Locked by the server or the page link'
  if (item.disableIf && snapshot[item.disableIf[0]] === item.disableIf[1]) {
    const other = optionsMeta[item.disableIf[0]]?.text ?? titleCase(noCase(item.disableIf[0]))
    return `Off while "${other}" is ${typeof item.disableIf[1] === 'boolean' ? (item.disableIf[1] ? 'on' : 'off') : String(item.disableIf[1])}`
  }
  if (item.disabledDuringGame && gameLoaded) return 'Cannot be changed during the game'
  return item.disabledReason
}

/** The row for one option. The control follows the value: on/off switch, buttons for 2-3 short choices, a picker for longer lists, a slider for numbers. */
export const OptionRow = ({ item }: { item: OptionItem }) => {
  const snapshot = useSnapshot(options)
  useSnapshot(appStorage)
  const value = snapshot[item.option] as unknown
  const meta = optionsMeta[item.option]
  const text = getItemText(item)
  const disabledReason = useItemDisabledReason(item)
  const disabled = !!disabledReason
  const changed = isSettingChanged(item.option)
  const perfLevel = RENDERER_OPTIONS_META[item.option]?.performance ? rendererOptionPerformanceLevel(item.option as any, value) : undefined
  const cost = perfLevel ? { level: perfLevel, note: RENDERER_OPTIONS_META[item.option]!.performance!.note } : undefined
  const choices = useMemo(() => normalizeChoices(item.possibleValues ?? meta?.possibleValues), [item.option])
  const description = disabledReason ? `${getItemDescription(item) ?? ''}${getItemDescription(item) ? '\n' : ''}${translate(disabledReason)}` : getItemDescription(item)

  let control: React.ReactNode
  const control_ = item.control ?? (
    typeof value === 'boolean' && choices.length === 0 ? 'switch'
      : choices.length > 0 ? (choices.length <= 3 && choices.reduce((sum, [, label]) => sum + label.length, 0) <= 16 ? 'segmented' : 'picker')
        : typeof value === 'number' ? 'slider'
          : 'picker'
  )
  switch (control_) {
    case 'switch': {
      control = <Switch value={!!value} disabled={disabled} onChange={async v => applyOptionValue(item, v)} />

      break
    }
    case 'segmented': {
      control = <Segmented choices={choices} value={String(value)} disabled={disabled} onChange={async v => applyOptionValue(item, v)} />

      break
    }
    case 'picker': {
      control = <ChoicePicker title={translate(text)} choices={choices} value={String(value)} disabled={disabled} onChange={async v => applyOptionValue(item, v)} />

      break
    }
    default: {
      const min = item.min ?? meta?.min ?? 0
      const max = item.max ?? meta?.max ?? 100
      const unit = item.unit ?? meta?.unit ?? '%'
      control = <Slider
        label=''
        data-setting={item.option}
        value={item.valueOverride ?? (value as number)}
        min={min}
        max={max}
        unit={item.valueText ? '' : unit}
        valueDisplay={item.valueText?.(value as number)}
        disabledReason={disabledReason}
        updateOnDragEnd={item.delayApply}
        updateValue={v => {
          options[item.option] = v as never
          item.onChange?.(v)
        }}
      />
    }
  }

  return <SettingRow
    label={text}
    description={description}
    changed={changed}
    onReset={() => resetSelectedOptions([item.option])}
    cost={cost}
    disabledReason={disabledReason}
  >
    <div data-setting={item.option} title={disabledReason ? translate(disabledReason) : undefined}>{control}</div>
  </SettingRow>
}

// #endregion
