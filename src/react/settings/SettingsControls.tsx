import { createContext, useContext, useId, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { rendererOptionPerformanceLevel, RENDERER_OPTIONS_META, RENDERER_PERFORMANCE_LEVEL_LABELS } from 'minecraft-renderer/src/graphicsBackend/rendererDefaultOptions'
import { defaultOptions, disabledSettings, options, optionsAtPageLoad, resetSelectedOptions } from '../../optionsStorage'
import { optionsMeta, type OptionPossibleValues } from '../../defaultOptions'
import { miscUiState } from '../../globalState'
import { appStorage } from '../appStorageProvider'
import FlatButton from '../ui/FlatButton'
import Slider from '../Slider'
import PixelartIcon from '../PixelartIcon'
import { showInputsModal, showOptionsModal } from '../SelectOption'
import { reconnectReload } from '../AppStatusProvider'
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

/** other views of the settings screen, opened from rows (All Settings in Advanced) */
export type SettingsView = 'tabs' | 'changed' | 'all' | 'keybindings'
export const SettingsViewContext = createContext<(view: SettingsView) => void>(() => {})

/** id of the row label: the row's control is named by it (screen readers read "Music, switch, on") */
const RowLabelContext = createContext<string | undefined>(undefined)

// #endregion

// #region primitive controls

export type Choice = [value: string, label: string]

export const normalizeChoices = (values: OptionPossibleValues | undefined): Choice[] => {
  return (values ?? []).map((v): Choice => (typeof v === 'string' ? [v, titleCase(noCase(v))] : [v[0], v[1]]))
}

/** pixel switch, the value is shown with a word too so it reads without colours */
export const Switch = ({ value, onChange, disabled, title }: { value: boolean, onChange: (value: boolean) => void, disabled?: boolean, title?: string }) => {
  const labelId = useContext(RowLabelContext)
  return <button
    type='button'
    role='switch'
    aria-checked={value}
    aria-labelledby={labelId}
    disabled={disabled}
    title={title}
    className={`${styles.switch} ${value ? styles.switchOn : ''} settings-switch`}
    onClick={() => onChange(!value)}
  >
    <span className={styles.switchText}>{translate(value ? 'ON' : 'OFF')}</span>
    <span className={styles.switchKnob} />
  </button>
}

/** all choices visible at once (2-3 short values); a radio group: one Tab stop, arrow keys pick the neighbour */
export const Segmented = ({ choices, value, onChange, disabled }: { choices: Choice[], value: string, onChange: (value: string) => void, disabled?: boolean }) => {
  const labelId = useContext(RowLabelContext)
  const groupRef = useRef<HTMLDivElement>(null)
  const selectedIndex = choices.findIndex(([choice]) => choice === value)
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex
  const move = (dir: 1 | -1) => {
    const next = (focusIndex + dir + choices.length) % choices.length
    onChange(choices[next][0])
    groupRef.current?.querySelectorAll<HTMLButtonElement>('[role=radio]')[next]?.focus()
  }
  return <div
    ref={groupRef}
    className={`${styles.segmented} settings-segmented`}
    role='radiogroup'
    aria-labelledby={labelId}
    onKeyDown={(e) => {
      if (disabled) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        move(1)
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        move(-1)
      }
    }}
  >
    {choices.map(([choice, label], i) => <button
      key={choice}
      type='button'
      role='radio'
      aria-checked={choice === value}
      tabIndex={i === focusIndex ? 0 : -1}
      disabled={disabled}
      className={`${styles.segment} ${choice === value ? styles.segmentActive : ''}`}
      onClick={() => choice !== value && onChange(choice)}
    >{translate(label)}
    </button>)}
  </div>
}

/** ◀ value ▶ picker for longer lists; the value itself opens the whole list */
export const ChoicePicker = ({ choices, value, onChange, disabled, title }: { choices: Choice[], value: string, onChange: (value: string) => void, disabled?: boolean, title: string }) => {
  const labelId = useContext(RowLabelContext)
  const index = choices.findIndex(([choice]) => String(choice) === String(value))
  const step = (dir: 1 | -1) => {
    const next = choices[((index === -1 ? 0 : index) + dir + choices.length) % choices.length]
    if (next) onChange(next[0])
  }
  return <div className={`${styles.picker} settings-picker`} role='group' aria-labelledby={labelId}>
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

/** a slider named by its row label */
const SliderControl = (props: Omit<React.ComponentProps<typeof Slider>, 'label' | 'inputProps'>) => {
  const labelId = useContext(RowLabelContext)
  return <Slider label='' {...props} inputProps={{ 'aria-labelledby': labelId }} />
}

// #region rows

export const SettingRow = ({ label, description, changed, onReset, cost, disabledReason, pendingReload, children, wide }: {
  label: string
  /** changed, but applies only after reloading the page */
  pendingReload?: boolean
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
  const labelId = useId()
  const info: SettingInfo = { label: translate(label), description: description && translate(description), cost, disabledReason }
  return <div
    className={`${styles.row} ${wide ? styles.rowWide : ''} ${disabledReason ? styles.rowDisabled : ''} settings-row`}
    onPointerEnter={() => setInfo(info)}
    onPointerDown={() => setInfo(info)}
    onFocus={() => setInfo(info)}
  >
    <div className={styles.rowLabel}>
      <span className={styles.rowLabelText} id={labelId}>{translate(label)}</span>
      {cost && <span className={`${styles.cost} ${styles[`cost_${cost.level}`]}`} title={cost.note}>{RENDERER_PERFORMANCE_LEVEL_LABELS[cost.level] ?? cost.level}</span>}
      {pendingReload && <button
        type='button'
        className={styles.pending}
        title={translate('Applies after reloading the page. Click to reload now')}
        onClick={reloadNow}
      >{translate('Reload')}
      </button>}
      {/* a locked or disabled row shows that it was changed but can't be reset from here */}
      {changed && (onReset && !disabledReason
        ? <button
          type='button'
          className={styles.changed}
          title={translate('Changed. Click to reset to default')}
          aria-label={`${translate('Reset to default')}: ${translate(label)}`}
          onClick={onReset}
        />
        : <span className={styles.changed} title={translate('Changed from default')} />)}
    </div>
    <div className={styles.rowControl}><RowLabelContext.Provider value={labelId}>{children}</RowLabelContext.Provider></div>
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

/** in a game the connection is restored after the reload */
const reloadNow = () => {
  if (miscUiState.gameLoaded) reconnectReload()
  else window.location.reload()
}

const differsFromPageLoad = (id: string, value: unknown) => JSON.stringify(value) !== JSON.stringify(optionsAtPageLoad[id])

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
/** off for the enable warning: false, or an "off" word of a choice (Minimap is 'never' by default) */
const isOffValue = (value: unknown) => !value || value === 'never' || value === 'off'

const applyOptionValue = async (item: OptionItem, value: unknown) => {
  const meta = optionsMeta[item.option]
  const current = options[item.option]
  if (item.enableWarning && isOffValue(current) && !isOffValue(value)) {
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
  const { gameLoaded } = useSnapshot(miscUiState)
  const pendingReload = differsFromPageLoad(item.option, value) &&
    !!(item.requiresRestart ?? meta?.requiresRestart ?? (item.requiresRestartWhenInGame && gameLoaded))
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
      control = <SliderControl
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
    pendingReload={pendingReload}
  >
    <div data-setting={item.option} title={disabledReason ? translate(disabledReason) : undefined}>{control}</div>
  </SettingRow>
}

// #endregion

// #region rows for any setting key (All settings, Changed, search results without a row in the tabs)

const formatValue = (value: unknown) => {
  if (typeof value === 'string') return value || '""'
  const json = JSON.stringify(value)
  return json === undefined ? 'unset' : json
}

/** the value as text (strings as they are, the rest as JSON), edited in a dialog */
const ValueEditRow = ({ option }: { option: keyof typeof options }) => {
  const value = useSnapshot(options)[option] as unknown
  useSnapshot(appStorage)
  const disabledReason = disabledSettings.value.has(option) ? 'Locked by the server or the page link' : undefined
  const text = optionsMeta[option]?.text ?? titleCase(noCase(option))
  return <SettingRow
    label={text}
    description={`${option}: ${formatValue(value).slice(0, 300)}`}
    changed={isSettingChanged(option)}
    onReset={() => resetSelectedOptions([option])}
    disabledReason={disabledReason}
  >
    <FlatButton
      className={styles.actionButton}
      disabled={!!disabledReason}
      title={formatValue(value)}
      label={formatValue(value).slice(0, 18)}
      onClick={async () => {
        const isString = typeof defaultOptions[option] === 'string' || typeof value === 'string'
        const result = await showInputsModal(text, {
          value: { type: 'text', defaultValue: isString ? String(value ?? '') : formatValue(value), label: isString ? 'Value' : 'Value (JSON)' },
        })
        if (!result) return
        const raw = String(result.value)
        if (isString) {
          options[option] = raw as never
          return
        }
        try {
          options[option] = JSON.parse(raw) as never
        } catch {
          await showOptionsModal(`Not valid JSON: ${raw}`, [])
        }
      }}
    />
  </SettingRow>
}

/** a row for any setting key: the tab's own definition when there is one, otherwise a control by value type */
export const KeyRow = ({ option, item }: { option: keyof typeof options, item?: OptionItem }) => {
  if (item) return <OptionRow item={item} />
  const meta = optionsMeta[option]
  const value = options[option] as unknown
  if (typeof value === 'boolean' || (meta?.possibleValues && meta.possibleValues.length > 0) || (typeof value === 'number' && meta?.min !== undefined && meta.max !== undefined)) {
    return <OptionRow item={{ option }} />
  }
  return <ValueEditRow option={option} />
}

export const isOptionChanged = isSettingChanged

// #endregion
