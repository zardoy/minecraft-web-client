import { reloadChunksAction } from '../controls'
import { OptionPossibleValues } from '../defaultOptions'
import { reconnectReload } from './AppStatusProvider'
import {
  buildSettingValueChoices,
  SettingReloadModalResult,
  showSettingReloadModal,
} from './SettingReloadModal'

export const applySettingReloadResult = (result: SettingReloadModalResult) => {
  if (result.reloadMode === 'chunks') {
    reloadChunksAction()
  } else if (result.reloadMode === 'page') {
    reconnectReload()
  }
}

export const promptAndApplyReloadSetting = async (args: {
  settingLabel: string
  currentValue: unknown
  possibleValues?: OptionPossibleValues
  requiresRestart?: boolean
  requiresChunksReload?: boolean
  tooltip?: string
}): Promise<SettingReloadModalResult | undefined> => {
  const result = await showSettingReloadModal({
    ...args,
    valueChoices: buildSettingValueChoices(args.currentValue, args.possibleValues),
  })
  return result
}
