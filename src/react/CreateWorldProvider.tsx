import fs from 'fs'
import path from 'path'
import { hideCurrentModal, showModal } from '../globalState'
import defaultLocalServerOptions from '../defaultLocalServerOptions'
import { mkdirRecursive, uniqueFileNameFromWorldName } from '../browserfs'
import supportedVersions, { FORBIDDEN_VERSION_THRESHOLD_SINGLEPLAYER, versionToNumber } from '../supportedVersions.mjs'
import { getServerPlugin } from '../clientMods'
import CreateWorld, { WorldCustomize, creatingWorldState } from './CreateWorld'
import { getWorldsPath } from './SingleplayerProvider'
import { useIsModalActive } from './utilsApp'

export default () => {
  const activeCreate = useIsModalActive('create-world')
  const activeCustomize = useIsModalActive('customize-world')
  if (activeCreate) {
    const forbiddenThresholdNum = versionToNumber(FORBIDDEN_VERSION_THRESHOLD_SINGLEPLAYER)
    const filteredVersions = supportedVersions.filter(x => {
      const versionNum = versionToNumber(x)
      return versionNum < forbiddenThresholdNum
    })
    const versionsPerMinor = Object.fromEntries(filteredVersions.map(x => [x.split('.').slice(0, 2), x]))
    const versions = Object.values(versionsPerMinor).map(x => {
      return {
        version: x,
        label: x === defaultLocalServerOptions.version ? `${x} (default)` : x
      }
    })
    return <CreateWorld
      defaultVersion={defaultLocalServerOptions.version}
      cancelClick={() => {
        hideCurrentModal()
      }}
      createClick={async () => {
        // create new world
        const { title, type, version, gameMode, plugins } = creatingWorldState
        // todo display path in ui + disable if exist
        const savePath = await uniqueFileNameFromWorldName(title, getWorldsPath())
        await mkdirRecursive(savePath)
        await loadPluginsIntoWorld(savePath, plugins)
        hideCurrentModal()
        window.dispatchEvent(new CustomEvent('singleplayer', {
          detail: {
            levelName: title,
            version,
            generation: {
              name: type
            },
            'worldFolder': savePath,
            gameMode: gameMode === 'survival' ? 0 : 1,
          },
        }))
      }}
      customizeClick={() => {
        showModal({ reactType: 'customize-world' })
      }}
      versions={versions}
    />
  }
  if (activeCustomize) {
    return <WorldCustomize backClick={() => hideCurrentModal()} />
  }
  return null
}

export const loadPluginsIntoWorld = async (worldPath: string, plugins: string[]) => {
  for (const plugin of plugins) {
    // eslint-disable-next-line no-await-in-loop
    const { content, version } = await getServerPlugin(plugin) ?? {}
    if (content) {
      // eslint-disable-next-line no-await-in-loop
      await mkdirRecursive(path.join(worldPath, 'plugins'))
      // eslint-disable-next-line no-await-in-loop
      await fs.promises.writeFile(path.join(worldPath, 'plugins', `${plugin}-${version}.js`), content)
    }
  }
}
