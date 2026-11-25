import { useSnapshot } from 'valtio'
import { activeModalStack, hideCurrentModal } from '../globalState'
import { OptionsGroupType } from '../optionsGuiScheme'
import SettingsScreen from './settings/SettingsScreen'
import { useIsModalActive } from './utilsApp'

export default () => {
  useIsModalActive('options-*')
  const { reactType } = useSnapshot(activeModalStack).at(-1) ?? {}
  if (!reactType?.startsWith('options-')) return
  const settingsGroup = reactType.slice('options-'.length) as OptionsGroupType

  // keyed by the group: openOptionsMenu('inventory') over an open settings screen opens that section
  return <SettingsScreen key={settingsGroup} group={settingsGroup} onClose={hideCurrentModal} />
}
