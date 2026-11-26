import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'
import { noCase } from 'change-case'
import { titleCase } from 'title-case'
import { isMobile } from 'minecraft-renderer/src/lib/simpleUtils'
import { hideAllModals, miscUiState } from '../../globalState'
import { options } from '../../optionsStorage'
import { appStorage } from '../appStorageProvider'
import { showResetSettingsModal } from '../AllSettingsEditor'
import { contro } from '../../controls'
import KeybindingsScreen from '../KeybindingsScreen'
import {
  groupToTab,
  isCustomItem,
  isOptionItem,
  isSectionItem,
  OptionsGroupType,
  settingsTabs,
  SettingsItem,
  SettingsTab,
  SettingsTabId,
  OptionItem
} from '../../optionsGuiScheme'
import { optionsMeta } from '../../defaultOptions'
import PixelartIcon from '../PixelartIcon'
import FlatButton from '../ui/FlatButton'
import { withInjectableUi } from '../extendableSystem'
import { ActionRow, getItemDescription, getItemText, isOptionChanged, KeyRow, OptionRow, SectionHeader, SettingInfo, SettingInfoContext, SettingsView, SettingsViewContext } from './SettingsControls'
import styles from './settings.module.css'

const CustomItemRender = ({ render }: { render: () => React.ReactNode }) => <>{render()}</>

const ItemRender = ({ item }: { item: SettingsItem }) => {
  if (isSectionItem(item)) return <SectionHeader title={item.section} anchor={item.anchor} />
  if (isOptionItem(item)) return <OptionRow item={item} />
  return <CustomItemRender render={item.custom} />
}

/** stable across search results: a row keeps its state while the query changes */
const itemKey = (item: SettingsItem) => {
  if (isSectionItem(item)) return `section-${item.section}`
  if (isOptionItem(item)) return `option-${item.option}`
  return `custom-${item.text}`
}

const isAvailable = (item: SettingsItem) => !isCustomItem(item) || !item.available || item.available()

const searchText = (item: SettingsItem) => {
  if (isSectionItem(item)) return ''
  if (isCustomItem(item)) return `${item.text} ${item.keywords ?? ''}`
  return `${getItemText(item)} ${getItemDescription(item) ?? ''} ${item.option} ${JSON.stringify(item.possibleValues ?? optionsMeta[item.option]?.possibleValues ?? '')}`
}

/** each setting key with the row the tabs define for it (first definition wins) */
const optionItemsByKey = new Map<string, OptionItem>()
for (const t of settingsTabs) {
  for (const item of [...t.items, ...t.advanced ?? []]) {
    if (isOptionItem(item) && !optionItemsByKey.has(item.option)) optionItemsByKey.set(item.option, item)
  }
}

const keyMatches = (key: string, words: string[]) => {
  const text = `${key} ${titleCase(noCase(key))} ${optionsMeta[key]?.text ?? ''} ${optionsMeta[key]?.tooltip ?? ''}`.toLowerCase()
  return words.every(word => text.includes(word))
}

/** whether search found a tab row that already shows this key (also the custom rows built on one option) */
const shownKeysOf = (items: SettingsItem[]) => items.filter(isOptionItem).map(item => item.option as string)

const allKeys = () => Object.keys(options).sort((a, b) => a.localeCompare(b))

const matchesSearch = (item: SettingsItem, words: string[]) => {
  if (!isAvailable(item)) return false
  const text = searchText(item).toLowerCase()
  return text !== '' && words.every(word => text.includes(word))
}

interface Props {
  /** the old sub-page that was asked for, picks the tab and scrolls to its section */
  group?: OptionsGroupType
  onClose: () => void
  /** false while another modal (a value list, the reload prompt) is on top: the screen stays mounted and keeps its state */
  active?: boolean
}

/** "Show advanced settings" stays open per tab while the page lives */
const expandedAdvanced = new Set<SettingsTabId>()

const SettingsScreenBase = ({ group = 'main', onClose, active = true }: Props) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(groupToTab[group] ?? 'quick')
  const [view, setView] = useState<SettingsView>('tabs')
  const [showAdvanced, setShowAdvanced] = useState(() => {
    const tabId = groupToTab[group] ?? 'quick'
    const t = settingsTabs.find(t => t.id === tabId)
    // opened for a sub-page that lives in the advanced part (renderer-advanced): show it
    return expandedAdvanced.has(tabId) || !!t?.advanced?.some(item => isSectionItem(item) && item.anchor === group)
  })
  const { gameLoaded } = useSnapshot(miscUiState)
  const { changedSettings } = useSnapshot(appStorage)
  const changedKeys = Object.keys(changedSettings).filter(key => key in options && isOptionChanged(key))
  const [search, setSearch] = useState('')
  const [info, setInfo] = useState<SettingInfo | undefined>()
  const contentRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const tab = settingsTabs.find(t => t.id === activeTab) ?? settingsTabs[0]
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)

  const searchResults = useMemo(() => {
    if (words.length === 0 || view === 'keybindings') return null
    const results = settingsTabs
      .filter(t => !t.shortcuts)
      .map(t => ({ tab: t, items: [...t.items, ...t.advanced ?? []].filter(item => matchesSearch(item, words)) }))
      .filter(r => r.items.length > 0)
    // settings without a row in the tabs (or whose row did not match): found by key
    const shown = new Set(results.flatMap(r => shownKeysOf(r.items)))
    const other = allKeys().filter(key => !shown.has(key) && !optionItemsByKey.has(key) && keyMatches(key, words))
    return { results, other }
  }, [search, view])

  // opened for a sub-page (inventory settings from the inventory, VR...): scroll to its section
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const anchor = content.querySelector<HTMLElement>(`[data-anchor="${group}"]`)
    const firstItem = tab.items.find(item => !isCustomItem(item))
    const isFirstSection = firstItem && isSectionItem(firstItem) && firstItem.anchor === group
    if (anchor && !isFirstSection) content.scrollTop = anchor.offsetTop - content.offsetTop
  }, [])

  useEffect(() => {
    setInfo(undefined)
  }, [activeTab, search])

  // a modal opened from the settings (value list, reload prompt) hides them and the browser drops the scroll position: put it back
  const savedScroll = useRef(0)
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    if (active) {
      content.scrollTop = savedScroll.current
      const onScroll = () => {
        savedScroll.current = content.scrollTop
      }
      content.addEventListener('scroll', onScroll)
      return () => content.removeEventListener('scroll', onScroll)
    }
  }, [active])

  // type anywhere to search (desktop)
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const target = e.target as HTMLElement
      if (['input', 'textarea', 'select'].includes(target.tagName?.toLowerCase())) return
      if (e.key === '/' || (e.key.length === 1 && /\w/.test(e.key) && e.key !== ' ')) {
        searchRef.current?.focus()
        if (e.key === '/') e.preventDefault()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const selectTab = (id: SettingsTabId) => {
    setSearch('')
    setView('tabs')
    setActiveTab(id)
    setShowAdvanced(expandedAdvanced.has(id))
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  const openView = (next: SettingsView) => {
    setSearch('')
    if (next === 'keybindings') setActiveTab('controls')
    setView(next)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  const renderItems = (items: SettingsItem[]) => items.filter(isAvailable).map(item => <ItemRender key={itemKey(item)} item={item} />)
  const renderKeys = (keys: string[]) => keys.map(key => <KeyRow key={`key-${key}`} option={key as keyof typeof options} item={optionItemsByKey.get(key)} />)

  const advancedCount = tab.advanced?.filter(item => !isSectionItem(item)).length ?? 0
  const toggleAdvanced = () => {
    if (showAdvanced) expandedAdvanced.delete(tab.id)
    else expandedAdvanced.add(tab.id)
    setShowAdvanced(!showAdvanced)
  }

  const content = (() => {
    if (searchResults) {
      if (searchResults.results.length === 0 && searchResults.other.length === 0) return <div className={styles.empty}>{translate('Nothing found')}</div>
      return <>
        {searchResults.results.map(r => <Fragment key={r.tab.id}>
          <SectionHeader title={r.tab.label} />
          {renderItems(r.items)}
        </Fragment>)}
        {searchResults.other.length > 0 && <>
          <SectionHeader title='Other' />
          {renderKeys(searchResults.other)}
        </>}
      </>
    }
    if (view === 'keybindings') {
      const isPS = [...(navigator.getGamepads?.() ?? [])].some(gp => gp?.id.match(/playstation|dualsense|dualshock/i))
      return <>
        <SectionHeader title='Keybindings' />
        <KeybindingsScreen embedded filter={search} contro={contro} isPS={isPS} />
      </>
    }
    if (view === 'changed') {
      return <>
        <SectionHeader title={`Changed settings (${changedKeys.length})`} />
        {changedKeys.length === 0
          ? <div className={styles.empty}>{translate('All settings are at their defaults')}</div>
          : <>
            <ActionRow label='Reset Changed Settings' description='Pick which of these go back to their defaults.' buttonLabel='Reset...' onClick={() => { void showResetSettingsModal() }} />
            {renderKeys([...changedKeys].sort((a, b) => a.localeCompare(b)))}
          </>}
      </>
    }
    if (view === 'all') {
      const keys = allKeys()
      return <>
        <SectionHeader title={`All settings (${keys.length})`} />
        {renderKeys(keys)}
      </>
    }
    return <>
      {renderItems(tab.items)}
      {advancedCount > 0 && <button type='button' className={styles.advancedToggle} aria-expanded={showAdvanced} onClick={toggleAdvanced}>
        <PixelartIcon iconName={showAdvanced ? 'chevron-down' : 'chevron-right'} />
        {translate(showAdvanced ? 'Hide advanced settings' : 'Show advanced settings')}
        <span className={styles.advancedCount}>{advancedCount}</span>
      </button>}
      {showAdvanced && tab.advanced && renderItems(tab.advanced)}
    </>
  })()

  // tabs: one Tab stop, arrow keys move between them (up/down on the rail, left/right on the phone strip)
  const onTabsKeyDown = (e: React.KeyboardEvent) => {
    const dir = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const index = settingsTabs.findIndex(t => t.id === activeTab)
    const next = settingsTabs[(index + dir + settingsTabs.length) % settingsTabs.length]
    selectTab(next.id)
    document.getElementById(`settings-tab-${next.id}`)?.focus()
  }

  return <SettingsViewContext.Provider value={openView}><SettingInfoContext.Provider value={setInfo}>
    <div className='backdrop' style={active ? undefined : { visibility: 'hidden' }} />
    <div className={`fullscreen ${styles.root} settings-screen`} style={active ? undefined : { visibility: 'hidden' }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <FlatButton
            className={styles.headerButton}
            icon='chevron-left'
            title={translate(view === 'tabs' ? 'Back' : 'Back to the tabs')}
            onClick={() => (view === 'tabs' ? onClose() : openView('tabs'))}
          />
          {/* in a game: close the settings and everything under them (pause menu) to get back to playing */}
          {gameLoaded && <FlatButton className={`${styles.headerButton} ${styles.closeAll}`} icon='close' title={translate('Close all and return to the game')} onClick={() => hideAllModals()} />}
          <span className={styles.title}>{translate('Settings')}</span>
          <FlatButton
            className={`${styles.changedButton} ${view === 'changed' && !searchResults ? styles.changedButtonActive : ''}`}
            icon='edit'
            label={String(changedKeys.length)}
            title={translate('Changed settings')}
            aria-label={`${translate('Changed settings')}: ${changedKeys.length}`}
            aria-pressed={view === 'changed'}
            onClick={() => openView(view === 'changed' ? 'tabs' : 'changed')}
          />
          <label className={styles.search}>
            <PixelartIcon iconName='search' className={styles.searchIcon} />
            <input
              ref={searchRef}
              value={search}
              placeholder={translate(view === 'keybindings' ? 'Filter keybindings' : 'Search settings')}
              autoComplete='off'
              spellCheck={false}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Escape' && search) {
                  e.stopPropagation()
                  setSearch('')
                }
              }}
            />
            {search && <button type='button' className={styles.searchClear} aria-label='Clear search' onClick={() => setSearch('')}><PixelartIcon iconName='close' /></button>}
          </label>

        </div>
        <div className={styles.body}>
          <nav className={styles.tabs} role='tablist' aria-label={translate('Settings sections')} onKeyDown={onTabsKeyDown}>
            {settingsTabs.map(t => <TabButton key={t.id} tab={t} active={!searchResults && (view === 'tabs' || view === 'keybindings') && t.id === activeTab} focusable={t.id === activeTab} onClick={() => selectTab(t.id)} />)}
          </nav>
          <div className={styles.main}>
            <div className={styles.content} ref={contentRef} role='tabpanel' id='settings-tabpanel' aria-labelledby={searchResults || view !== 'tabs' ? undefined : `settings-tab-${activeTab}`}>
              {content}
            </div>
            <div className={`${styles.info} ${!info && isMobile() ? styles.infoHidden : ''}`} aria-live='polite'>
              {info
                ? <>
                  <span className={styles.infoTitle}>{info.label}</span>
                  {info.cost && <span className={styles.infoCost}> · {info.cost.note}</span>}
                  {info.description && <span className={styles.infoText}>{info.description}</span>}
                </>
                : <span className={styles.infoHint}>{translate('Point at a setting to see what it does. Type to search.')}</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  </SettingInfoContext.Provider></SettingsViewContext.Provider>
}

const TabButton = ({ tab, active, focusable, onClick }: { tab: SettingsTab, active: boolean, focusable: boolean, onClick: () => void }) => {
  return <button
    type='button'
    role='tab'
    id={`settings-tab-${tab.id}`}
    aria-controls='settings-tabpanel'
    aria-selected={active}
    tabIndex={focusable ? 0 : -1}
    title={translate(tab.label)}
    aria-label={translate(tab.label)}
    className={`${styles.tab} ${active ? styles.tabActive : ''} settings-tab`}
    onClick={onClick}
  >
    <PixelartIcon iconName={tab.icon} className={styles.tabIcon} />
    <span className={styles.tabLabel}>{translate(tab.label)}</span>
  </button>
}

export default withInjectableUi(SettingsScreenBase, 'settingsScreen')
