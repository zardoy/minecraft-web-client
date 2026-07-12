import { proxy, useSnapshot } from 'valtio'
import { useMemo } from 'react'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { hideCurrentModal, miscUiState, showModal } from '../globalState'
import { OptionPossibleValues } from '../defaultOptions'
import Screen from './Screen'
import { useIsModalActive } from './utilsApp'
import Button from './Button'

export type SettingReloadMode = 'chunks' | 'page' | 'later'

export type SettingReloadModalResult = {
  value: unknown
  reloadMode: SettingReloadMode
}

type ValueChoice = {
  value: unknown
  label: string
}

type ModalParams = {
  settingLabel: string
  currentValue: unknown
  valueChoices: ValueChoice[]
  requiresRestart?: boolean
  requiresChunksReload?: boolean
  tooltip?: string
}

const state = proxy({
  params: null as ModalParams | null,
  selectedValueIndex: 0,
  reloadMode: 'later' as SettingReloadMode,
})

let resolve: ((result: SettingReloadModalResult | undefined) => void) | undefined

const getOptionValue = (arrItem: string | [string, string]) => {
  if (typeof arrItem === 'string') return arrItem
  return arrItem[0]
}

const getOptionLabel = (arrItem: string | [string, string]) => {
  if (typeof arrItem === 'string') return titleCase(noCase(arrItem))
  return arrItem[1]
}

export const buildSettingValueChoices = (
  _currentValue: unknown,
  possibleValues?: OptionPossibleValues
): ValueChoice[] => {
  if (possibleValues && possibleValues.length > 0) {
    return possibleValues.map((entry) => ({
      value: getOptionValue(entry),
      label: getOptionLabel(entry),
    }))
  }
  return [
    { value: true, label: 'ON' },
    { value: false, label: 'OFF' },
  ]
}

const getDefaultReloadMode = (params: ModalParams): SettingReloadMode => {
  if (params.requiresChunksReload) return 'chunks'
  if (params.requiresRestart) return 'page'
  return 'later'
}

export const showSettingReloadModal = async (params: Omit<ModalParams, 'valueChoices'> & {
  valueChoices: ValueChoice[]
}): Promise<SettingReloadModalResult | undefined> => {
  showModal({ reactType: 'setting-reload' })
  const selectedValueIndex = Math.max(0, params.valueChoices.findIndex(choice => (
    String(choice.value) === String(params.currentValue)
  )))
  return new Promise((_resolve) => {
    resolve = _resolve
    Object.assign(state, {
      params: {
        ...params,
      },
      selectedValueIndex: selectedValueIndex === -1 ? 0 : selectedValueIndex,
      reloadMode: getDefaultReloadMode(params),
    })
  })
}

export const settingNeedsReloadPrompt = (requiresRestart?: boolean, requiresChunksReload?: boolean, requiresRestartWhenInGame?: boolean) => {
  if (requiresRestart) return true
  if (requiresChunksReload && miscUiState.gameLoaded) return true
  return requiresRestartWhenInGame && miscUiState.gameLoaded
}

const SettingReloadModal = () => {
  const { params, selectedValueIndex, reloadMode } = useSnapshot(state)
  const isModalActive = useIsModalActive('setting-reload')

  const valueChoices = params?.valueChoices ?? []
  const showChunksReload = !!params?.requiresChunksReload
  const showPageReload = !!(params?.requiresRestart || params?.requiresChunksReload)

  const resolveClose = (result: SettingReloadModalResult | undefined) => {
    resolve?.(result)
    resolve = undefined
    hideCurrentModal()
    state.params = null
  }

  const selectedChoice = useMemo(() => valueChoices[selectedValueIndex], [valueChoices, selectedValueIndex])

  if (!isModalActive || !params) return null

  return <Screen
    title={params.settingLabel}
    backdrop
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', maxWidth: 280 }}>
      <div style={{ fontSize: 10, color: '#ccc', textAlign: 'center' }}>
        {translate('This setting requires a reload to take effect')}
      </div>
      {params.tooltip && (
        <div style={{ fontSize: 9, color: '#999', textAlign: 'center' }}>
          {params.tooltip}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, width: '100%' }}>
        <div style={{ fontSize: 10, color: '#ddd' }}>{translate('Select value')}</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {valueChoices.map((choice, index) => (
            <Button
              key={`${String(choice.value)}-${choice.label}`}
              onClick={() => {
                state.selectedValueIndex = index
              }}
              style={{
                border: selectedValueIndex === index ? '2px solid #4CAF50' : undefined,
                minWidth: 72,
              }}
            >
              {choice.label}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
        <div style={{ fontSize: 10, color: '#ddd' }}>{translate('Apply with')}</div>
        {showChunksReload && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
            <input
              type='checkbox'
              checked={reloadMode === 'chunks'}
              onChange={() => {
                state.reloadMode = 'chunks'
              }}
            />
            {translate('Reload chunks')}
          </label>
        )}
        {showPageReload && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
            <input
              type='checkbox'
              checked={reloadMode === 'page'}
              onChange={() => {
                state.reloadMode = 'page'
              }}
            />
            {translate('Reconnect immediately (reload page)')}
          </label>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, cursor: 'pointer' }}>
          <input
            type='checkbox'
            checked={reloadMode === 'later'}
            onChange={() => {
              state.reloadMode = 'later'
            }}
          />
          {translate('Apply later without reload')}
        </label>
      </div>

      <Button
        onClick={() => {
          if (!selectedChoice) return
          resolveClose({
            value: selectedChoice.value,
            reloadMode,
          })
        }}
      >
        {translate('Apply')}
      </Button>
      <Button
        onClick={() => {
          resolveClose(undefined)
        }}
      >
        {translate('Cancel')}
      </Button>
    </div>
  </Screen>
}

export default SettingReloadModal
