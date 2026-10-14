import { useEffect, useState, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'
import { openURL } from 'minecraft-renderer/src/lib/simpleUtils'
import { addRepositoryAction, setEnabledModAction, getAllModsDisplayList, installModByName, selectAndRemoveRepository, uninstallModAction, fetchAllRepositories, modsReactiveUpdater, modsErrors, fetchRepository, getModModifiableFields, saveClientModData, getAllModsModifiableFields, callMethodAction } from '../clientMods'
import { createNotificationProgressReporter, ProgressReporter } from '../core/progressReporter'
import { hideModal } from '../globalState'
import { useIsModalActive } from './utilsApp'
import Input from './Input'
import Button from './Button'
import styles from './mods.module.css'
import { showOptionsModal, showInputsModal } from './SelectOption'
import Screen from './Screen'
import PixelartIcon, { pixelartIcons } from './PixelartIcon'
import { showNotification } from './NotificationProvider'
import { usePassesScaledDimensions } from './UIProvider'
import { appStorage } from './appStorageProvider'

type ModsData = Awaited<ReturnType<typeof getAllModsDisplayList>>

const ModListItem = ({
  mod,
  onClick,
  hasError
}: {
  mod: ModsData['repos'][0]['packages'][0],
  onClick: () => void,
  hasError: boolean
}) => (
  <div
    className={styles.modRow}
    onClick={onClick}
    data-enabled={mod.installed ? '' : mod.activated}
    data-has-error={hasError}
  >
    <div className={styles.modRowTitle}>
      {mod.name}
      {mod.installedVersion && mod.installedVersion !== mod.version && (
        <PixelartIcon
          iconName={pixelartIcons['arrow-up-box']}
          styles={{ fontSize: 14, marginLeft: 3 }}
        />
      )}
    </div>
    <div className={styles.modRowInfo}>
      {mod.description}
      {mod.author && ` • By ${mod.author}`}
      {mod.version && ` • v${mod.version}`}
      {mod.serverPlugin && ` • World plugin`}
    </div>
  </div>
)

const ModSidebar = ({ mod }: { mod: (ModsData['repos'][0]['packages'][0] & { repo?: string }) | null }) => {
  const errors = useSnapshot(modsErrors)
  const [editingField, setEditingField] = useState<{ name: string, content: string, language: string } | null>(null)

  const handleAction = async (action: () => Promise<void>, errorMessage: string, progress?: ProgressReporter) => {
    try {
      await action()
      progress?.end()
    } catch (error) {
      console.error(error)
      progress?.end()
      showNotification(errorMessage, error.message, true)
    }
  }

  if (!mod) {
    return <div className={styles.modInfoText}>Select a mod to view details</div>
  }

  const modifiableFields = mod.installed ? getModModifiableFields(mod.installed) : []

  const handleSaveField = async (newContents: string) => {
    if (!editingField) return
    try {
      mod[editingField.name] = newContents
      mod.wasModifiedLocally = true
      await saveClientModData(mod)
      setEditingField(null)
      showNotification('Success', 'Contents saved successfully')
    } catch (error) {
      showNotification('Error', 'Failed to save contents: ' + error.message, true)
    }
  }

  if (editingField) {
    return (
      <EditingCodeWindow
        contents={editingField.content}
        language={editingField.language}
        onClose={newContents => {
          if (newContents === undefined) {
            setEditingField(null)
            return
          }
          void handleSaveField(newContents)
        }}
      />
    )
  }

  return (
    <>
      <div className={styles.modInfo}>
        <div className={styles.modInfoTitle}>
          {mod.name} {mod.installed?.wasModifiedLocally ? '(modified)' : ''}
        </div>
        <div className={styles.modInfoText}>
          {mod.description}
        </div>
        <div className={styles.modInfoText}>
          {mod.author && `Author: ${mod.author}\n`}
          {mod.version && `Version: ${mod.version}\n`}
          {mod.installedVersion && mod.installedVersion !== mod.version && `Installed version: ${mod.installedVersion}\n`}
          {mod.section && `Section: ${mod.section}\n`}
        </div>
        {errors[mod.name]?.length > 0 && (
          <div className={styles.modErrorList}>
            <ul>
              {errors[mod.name].map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className={styles.modActions}>
        {mod.installed ? (
          <>
            {mod.activated ? (
              <Button
                onClick={async () => handleAction(
                  async () => setEnabledModAction(mod.name, false),
                  'Failed to disable mod:'
                )}
                icon={pixelartIcons['remove-box']}
                title="Disable"
              />
            ) : (
              <Button
                onClick={async () => handleAction(
                  async () => setEnabledModAction(mod.name, true),
                  'Failed to enable mod:'
                )}
                icon={pixelartIcons['add-box']}
                title="Enable"
                disabled={!mod.canBeActivated}
              />
            )}
            <Button
              onClick={async () => handleAction(
                async () => uninstallModAction(mod.name),
                'Failed to uninstall mod:'
              )}
              icon={pixelartIcons.trash}
              title="Delete"
            />
            {mod.installedVersion && mod.installedVersion !== mod.version && (
              <Button
                onClick={async () => {
                  if (!mod.repo) return
                  const progress = createNotificationProgressReporter(`${mod.name} updated and activated`)
                  await handleAction(
                    async () => {
                      await installModByName(mod.repo!, mod.name, progress)
                    },
                    'Failed to update mod:',
                    progress
                  )
                }}
                icon={pixelartIcons['arrow-up-box']}
                title="Update"
              />
            )}
            {mod.serverPlugin && (
              <Button
                onClick={async () => {
                  const url = new URL(window.location.href)
                  url.searchParams.set('sp', '1')
                  url.searchParams.set('serverPlugin', mod.name)
                  openURL(url.toString())
                }}
                icon={pixelartIcons.play}
                title="Try in blank world"
              />
            )}
          </>
        ) : (
          <Button
            onClick={async () => {
              if (!mod.repo) return
              const progress = createNotificationProgressReporter(`${mod.name} installed and enabled`)
              await handleAction(
                async () => {
                  await installModByName(mod.repo!, mod.name, progress)
                },
                'Failed to install & activate mod:',
                progress
              )
            }}
            icon={pixelartIcons.download}
            title="Install"
          />
        )}
        {modifiableFields.length > 0 && (
          <Button
            onClick={async (e) => {
              const fields = e.shiftKey ? getAllModsModifiableFields() : modifiableFields
              const result = await showInputsModal('Edit Mod Field', Object.fromEntries(fields.map(field => {
                return [field.field, {
                  type: 'button' as const,
                  label: field.label,
                  onButtonClick () {
                    setEditingField({
                      name: field.field,
                      content: field.getContent?.() || mod.installed![field.field] || '',
                      language: field.language
                    })
                  }
                }]
              })), {
                showConfirm: false
              })
            }}
            icon={pixelartIcons['edit']}
            title="Edit Mod"
          />
        )}
      </div>

      {window.loadedMods?.[mod.name] && mod.actionsMain && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          Actions:
          {Object.entries(mod.actionsMain).map(([key, setting]) => (
            <div
              key={key} onClick={() => {
                void callMethodAction(mod.name, 'main', key)
              }}>{key}</div>
          ))}
        </div>
      )}
    </>
  )
}

const EditingCodeWindow = ({
  contents,
  language,
  onClose
}: {
  contents: string,
  language: string,
  onClose: (newContents?: string) => void
}) => {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [])

  return <Screen title="Editing code">
    <div className="">
      <textarea
        ref={ref}
        className={styles.fieldEditorTextarea}
        defaultValue={contents}
      />
      <Button
        style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'red' }}
        onClick={() => onClose(undefined)}
        icon={pixelartIcons.close}
        title="Cancel"
      />
      <Button
        style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: '#4CAF50' }}
        onClick={() => onClose(ref.current?.value)}
        icon={pixelartIcons.check}
        title="Save"
      />
    </div>
  </Screen>
}

export default () => {
  const isModalActive = useIsModalActive('mods', true)
  const [modsData, setModsData] = useState<ModsData | null>(null)
  const [search, setSearch] = useState('')
  const [showOnlyInstalled, setShowOnlyInstalled] = useState(false)
  const [showOnlyEnabled, setShowOnlyEnabled] = useState(false)
  const [selectedModIndex, setSelectedModIndex] = useState<number | null>(null)
  const [expandedRepos, setExpandedRepos] = useState<Record<string, boolean>>({})
  const useHorizontalLayout = usePassesScaledDimensions(400)
  const { counter } = useSnapshot(modsReactiveUpdater)
  const errors = useSnapshot(modsErrors)

  const allModsArray = useMemo(() => {
    if (!modsData) return []
    return [
      ...modsData.repos.flatMap(repo => repo.packages.map(mod => ({ ...mod, repo: repo.url }))),
      ...modsData.modsWithoutRepos
    ]
  }, [modsData])

  useEffect(() => {
    if (isModalActive) {
      if (appStorage.firstModsPageVisit) {
        appStorage.firstModsPageVisit = false
        const defaultRepo = 'zardoy/mcraft-client-mods'
        void fetchRepository(defaultRepo, defaultRepo)
      }
      void getAllModsDisplayList().then(mods => {
        setModsData(mods)
        // Update selected mod index if needed
        if (selectedModIndex !== null && selectedModIndex < allModsArray.length) {
          setSelectedModIndex(selectedModIndex)
        }
      })
    }
  }, [isModalActive, counter])

  if (!isModalActive) return null

  const toggleRepo = (repoUrl: string) => {
    setExpandedRepos(prev => ({
      ...prev,
      [repoUrl]: !prev[repoUrl]
    }))
  }

  const modFilter = (mod: ModsData['repos'][0]['packages'][0]) => {
    const matchesSearch = mod.name.toLowerCase().includes(search.toLowerCase()) ||
      mod.description?.toLowerCase().includes(search.toLowerCase())
    const matchesInstalledFilter = !showOnlyInstalled || mod.installed
    const matchesEnabledFilter = !showOnlyEnabled || mod.activated
    return matchesSearch && matchesInstalledFilter && matchesEnabledFilter
  }

  const filteredMods = modsData ? {
    repos: modsData.repos.map(repo => ({
      ...repo,
      packages: repo.packages.filter(modFilter)
    })),
    modsWithoutRepos: modsData.modsWithoutRepos.filter(modFilter)
  } : null

  const filteredModsCount = filteredMods ?
    filteredMods.repos.reduce((acc, repo) => acc + repo.packages.length, 0) + filteredMods.modsWithoutRepos.length : 0

  const totalRepos = modsData?.repos.length ?? 0

  const getStatsText = () => {
    if (!filteredMods) return 'Loading...'
    if (showOnlyEnabled) {
      return `Showing ${filteredMods.repos.reduce((acc, repo) => acc + repo.packages.filter(mod => mod.activated).length, 0)} enabled mods in ${totalRepos} repos`
    } else if (showOnlyInstalled) {
      return `Showing ${filteredMods.repos.reduce((acc, repo) => acc + repo.packages.filter(mod => mod.installed).length, 0)} installed mods in ${totalRepos} repos`
    }
    return `Showing all ${totalRepos} repos with ${filteredModsCount} mods`
  }

  const selectedMod = selectedModIndex === null ? null : allModsArray[selectedModIndex]

  return <Screen backdrop="dirt" title="Client Mods (Preview)" titleMarginTop={0} contentStyle={{ paddingTop: 15, height: '100%', width: '100%' }}>
    <Button
      icon={pixelartIcons['close']}
      onClick={() => {
        hideModal()
      }}
      style={{
        color: '#ff5d5d',
        position: 'fixed',
        top: 10,
        left: 20
      }}
    />
    <div className={styles.root}>
      <div className={styles.header}>
        <Button
          style={{}}
          icon={pixelartIcons['sliders']}
          onClick={() => {
            if (showOnlyEnabled) {
              setShowOnlyEnabled(false)
            } else if (showOnlyInstalled) {
              setShowOnlyInstalled(false)
              setShowOnlyEnabled(true)
            } else {
              setShowOnlyInstalled(true)
            }
          }}
          title={showOnlyEnabled ? 'Show all mods' : showOnlyInstalled ? 'Show enabled mods' : 'Show installed mods'}
        />
        <Button
          onClick={async () => {
            // const refreshButton = `Refresh repositories (last update)`
            const refreshButton = `Refresh repositories`
            const choice = await showOptionsModal(`Manage repositories (${modsData?.repos.length ?? '-'} repos)`, ['Add repository', 'Remove repository', refreshButton])
            switch (choice) {
              case 'Add repository': {
                await addRepositoryAction()
                break
              }
              case 'Remove repository': {
                await selectAndRemoveRepository()
                break
              }
              case refreshButton: {
                await fetchAllRepositories()
                break
              }
              case undefined:
                break
            }
          }}
          icon={pixelartIcons['list-box']}
          title="Manage repositories"
        />
        <Input
          className={styles.searchBar}
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search mods in added repositories..."
          autoFocus
        />
      </div>
      <div className={styles.statsRow}>
        {getStatsText()}
      </div>
      <div className={`${styles.content} ${useHorizontalLayout ? '' : styles.verticalContent}`}>
        <div className={styles.modList}>
          {filteredMods ? (
            <>
              {filteredMods.repos.map(repo => (
                <div key={repo.url}>
                  <div
                    className={styles.repoHeader}
                    onClick={() => toggleRepo(repo.url)}
                  >
                    <span>{expandedRepos[repo.url] ? '▼' : '▶'}</span>
                    <span>{repo.name || repo.url}</span>
                    <span>({repo.packages.length})</span>
                  </div>
                  {expandedRepos[repo.url] && (
                    <div className={styles.repoContent}>
                      {repo.packages.map((mod) => (
                        <ModListItem
                          key={mod.name}
                          mod={mod}
                          onClick={() => setSelectedModIndex(allModsArray.findIndex(m => m.name === mod.name))}
                          hasError={errors[mod.name]?.length > 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {filteredMods.modsWithoutRepos.length > 0 && (
                <div>
                  <div className={styles.repoHeader}>
                    <span>▼</span>
                    <span>Other Mods</span>
                    <span>({filteredMods.modsWithoutRepos.length})</span>
                  </div>
                  <div className={styles.repoContent}>
                    {filteredMods.modsWithoutRepos.map(mod => (
                      <ModListItem
                        key={mod.name}
                        mod={mod}
                        onClick={() => setSelectedModIndex(allModsArray.findIndex(m => m.name === mod.name))}
                        hasError={errors[mod.name]?.length > 0}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.modRowInfo}>Loading mods...</div>
          )}
        </div>
        <div className={styles.sidebar}>
          <ModSidebar mod={selectedMod} />
        </div>
      </div>
    </div>
  </Screen>
}
