import { useSnapshot } from 'valtio'
import { activeModalStack, hideCurrentModal } from '../globalState'
import { OptionsGroupType } from '../optionsGuiScheme'
import SettingsScreen from './settings/SettingsScreen'
import { useIsModalActive } from './utilsApp'

export default () => {
  // registers the options-* modals as handled (otherwise the "modal is unavailable" fallback shows under the settings)
  useIsModalActive('options-*')
  const stack = useSnapshot(activeModalStack)
  // the settings stay mounted under a modal opened from them (value list, reload prompt, keybindings): tab, search and scroll are kept
  const index = stack.findLastIndex(modal => modal.reactType.startsWith('options-'))
  if (index === -1) return null
  const settingsGroup = stack[index].reactType.slice('options-'.length) as OptionsGroupType
  const active = index === stack.length - 1

  // keyed by the group: openOptionsMenu('inventory') over an open settings screen opens that section
  return <SettingsScreen key={settingsGroup} group={settingsGroup} active={active} onClose={hideCurrentModal} />
}
