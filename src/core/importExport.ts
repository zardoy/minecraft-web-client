import { appStorage } from '../react/appStorageProvider'
import { getChangedSettings, options } from '../optionsStorage'
import { customKeymaps } from '../controls'
import { showInputsModal } from '../react/SelectOption'

interface ExportedFile {
  _about: string
  options?: Record<string, any>
  keybindings?: Record<string, any>
  servers?: any[]
  username?: string
  proxy?: string
  proxies?: string[]
  accountTokens?: any[]
}

export const importData = async () => {
  try {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.click()

    const file = await new Promise<File>(resolve => {
      input.onchange = () => {
        if (!input.files?.[0]) return
        resolve(input.files[0])
      }
    })

    const text = await file.text()
    const data = JSON.parse(text)

    if (!data._about?.includes('Minecraft Web Client')) {
      const doContinue = confirm('This file does not appear to be a Minecraft Web Client profile. Continue anyway?')
      if (!doContinue) return
    }

    // Build available data types for selection
    const availableData: Record<keyof Omit<ExportedFile, '_about'>, { present: boolean; description: string }> = {
      options: { present: !!data.options, description: 'Game settings and preferences' },
      keybindings: { present: !!data.keybindings, description: 'Custom key mappings' },
      servers: { present: !!data.servers, description: 'Saved server list' },
      username: { present: !!data.username, description: 'Username' },
      proxy: { present: !!data.proxy, description: 'Selected proxy server' },
      proxies: { present: !!data.proxies, description: 'Global proxies list' },
      accountTokens: { present: !!data.accountTokens, description: 'Account authentication tokens' }
    }

    // Filter to only present data types
    const presentTypes = Object.fromEntries(
      Object.entries(availableData)
        .filter(([_, info]) => info.present)
        .map<any>(([key, info]) => [key, info])
    )

    if (Object.keys(presentTypes).length === 0) {
      alert('No compatible data found in the imported file.')
      return
    }

    const importChoices = (await showInputsModal('Select Data to Import', {
      mergeData: {
        type: 'checkbox',
        label: 'Merge with existing data (uncheck to remove old data)',
        defaultValue: true
      },
      ...Object.fromEntries(
        Object.entries(presentTypes).map(([key, info]) => [
          key,
          {
            type: 'checkbox',
            label: info.description,
            defaultValue: true
          }
        ])
      )
    })) as { mergeData: boolean } & Record<keyof ExportedFile, boolean>

    if (!importChoices) return

    const importedTypes: string[] = []
    const shouldMerge = importChoices.mergeData

    if (importChoices.options && data.options) {
      if (shouldMerge) {
        Object.assign(options, data.options)
      } else {
        for (const key of Object.keys(options)) {
          if (key in data.options) {
            options[key as any] = data.options[key]
          }
        }
      }
      importedTypes.push('settings')
    }

    if (importChoices.keybindings && data.keybindings) {
      if (shouldMerge) {
        Object.assign(customKeymaps, data.keybindings)
      } else {
        for (const key of Object.keys(customKeymaps)) delete customKeymaps[key]
        Object.assign(customKeymaps, data.keybindings)
      }
      importedTypes.push('keybindings')
    }

    if (importChoices.servers && data.servers) {
      if (shouldMerge && appStorage.serversList) {
        // Merge by IP, update existing entries and add new ones
        const existingIps = new Set(appStorage.serversList.map(s => s.ip))
        const newServers = data.servers.filter(s => !existingIps.has(s.ip))
        appStorage.serversList = [...appStorage.serversList, ...newServers]
      } else {
        appStorage.serversList = data.servers
      }
      importedTypes.push('servers')
    }

    if (importChoices.username && data.username) {
      appStorage.username = data.username
      importedTypes.push('username')
    }

    if ((importChoices.proxy && data.proxy) || (importChoices.proxies && data.proxies)) {
      if (!appStorage.proxiesData) {
        appStorage.proxiesData = { proxies: [], selected: '' }
      }

      if (importChoices.proxies && data.proxies) {
        if (shouldMerge) {
          // Merge unique proxies
          const uniqueProxies = new Set([...appStorage.proxiesData.proxies, ...data.proxies])
          appStorage.proxiesData.proxies = [...uniqueProxies]
        } else {
          appStorage.proxiesData.proxies = data.proxies
        }
        importedTypes.push('proxies list')
      }

      if (importChoices.proxy && data.proxy) {
        appStorage.proxiesData.selected = data.proxy
        importedTypes.push('selected proxy')
      }
    }

    if (importChoices.accountTokens && data.accountTokens) {
      if (shouldMerge && appStorage.authenticatedAccounts) {
        // Merge by unique identifier (assuming accounts have some unique ID or username)
        const existingAccounts = new Set(appStorage.authenticatedAccounts.map(a => a.username))
        const newAccounts = data.accountTokens.filter(a => !existingAccounts.has(a.username))
        appStorage.authenticatedAccounts = [...appStorage.authenticatedAccounts, ...newAccounts]
      } else {
        appStorage.authenticatedAccounts = data.accountTokens
      }
      importedTypes.push('account tokens')
    }

    alert(`Profile imported successfully! Imported data: ${importedTypes.join(', ')}.\nYou may need to reload the page for some changes to take effect.`)
  } catch (err) {
    console.error('Failed to import profile:', err)
    alert('Failed to import profile: ' + (err.message || err))
  }
}

export const exportData = async () => {
  const data = await showInputsModal('Export Profile', {
    profileName: {
      type: 'text'
    },
    exportSettings: {
      type: 'checkbox',
      defaultValue: true
    },
    exportKeybindings: {
      type: 'checkbox',
      defaultValue: true
    },
    exportServers: {
      type: 'checkbox',
      defaultValue: true
    },
    saveUsernameAndProxy: {
      type: 'checkbox',
      defaultValue: true
    },
    exportGlobalProxiesList: {
      type: 'checkbox',
      defaultValue: false
    },
    exportAccountTokens: {
      type: 'checkbox',
      defaultValue: false
    }
  })
  const fileName = `${data.profileName ? `${data.profileName}-` : ''}web-client-profile.json`
  const json: ExportedFile = {
    _about: 'Minecraft Web Client (mcraft.fun) Profile',
    ...(data.exportSettings
      ? {
          options: getChangedSettings()
        }
      : {}),
    ...(data.exportKeybindings
      ? {
          keybindings: customKeymaps
        }
      : {}),
    ...(data.exportServers
      ? {
          servers: appStorage.serversList
        }
      : {}),
    ...(data.saveUsernameAndProxy
      ? {
          username: appStorage.username,
          proxy: appStorage.proxiesData?.selected
        }
      : {}),
    ...(data.exportGlobalProxiesList
      ? {
          proxies: appStorage.proxiesData?.proxies
        }
      : {}),
    ...(data.exportAccountTokens
      ? {
          accountTokens: appStorage.authenticatedAccounts
        }
      : {})
  }
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
