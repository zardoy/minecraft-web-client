import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { isMobile } from 'minecraft-renderer/src/lib/simpleUtils'
import {
  groupToTab,
  isCustomItem,
  isOptionItem,
  isSectionItem,
  OptionsGroupType,
  settingsTabs,
  SettingsItem,
  SettingsTab,
  SettingsTabId
} from '../../optionsGuiScheme'
import { optionsMeta } from '../../defaultOptions'
import PixelartIcon from '../PixelartIcon'
import FlatButton from '../ui/FlatButton'
import { withInjectableUi } from '../extendableSystem'
import { getItemDescription, getItemText, OptionRow, SectionHeader, SettingInfo, SettingInfoContext } from './SettingsControls'
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

const SettingsScreenBase = ({ group = 'main', onClose, active = true }: Props) => {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(groupToTab[group] ?? 'general')
  const [search, setSearch] = useState('')
  const [info, setInfo] = useState<SettingInfo | undefined>()
  const contentRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const tab = settingsTabs.find(t => t.id === activeTab) ?? settingsTabs[0]
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)

  const searchResults = useMemo(() => {
    if (words.length === 0) return null
    return settingsTabs
      .map(t => ({ tab: t, items: t.items.filter(item => matchesSearch(item, words)) }))
      .filter(r => r.items.length > 0)
  }, [search])

  // opened for a sub-page (inventory settings from the inventory, VR...): scroll to its section
  useLayoutEffect(() => {
    const content = contentRef.current
    if (!content) return
    const anchor = content.querySelector<HTMLElement>(`[data-anchor="${group}"]`)
    const isFirstSection = tab.items[0] && isSectionItem(tab.items[0]) && tab.items[0].anchor === group
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
    setActiveTab(id)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  const renderItems = (items: SettingsItem[]) => items.filter(isAvailable).map(item => <ItemRender key={itemKey(item)} item={item} />)

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

  return <SettingInfoContext.Provider value={setInfo}>
    <div className='backdrop' style={active ? undefined : { visibility: 'hidden' }} />
    <div className={`fullscreen ${styles.root} settings-screen`} style={active ? undefined : { visibility: 'hidden' }}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <FlatButton className={styles.headerButton} icon='chevron-left' title={translate('Back')} onClick={onClose} />
          <span className={styles.title}>{translate('Settings')}</span>
          <label className={styles.search}>
            <PixelartIcon iconName='search' className={styles.searchIcon} />
            <input
              ref={searchRef}
              value={search}
              placeholder={translate('Search settings')}
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
            {settingsTabs.map(t => <TabButton key={t.id} tab={t} active={!searchResults && t.id === activeTab} focusable={t.id === activeTab} onClick={() => selectTab(t.id)} />)}
          </nav>
          <div className={styles.main}>
            <div className={styles.content} ref={contentRef} role='tabpanel' id='settings-tabpanel' aria-labelledby={searchResults ? undefined : `settings-tab-${activeTab}`}>
              {searchResults
                ? searchResults.length === 0
                  ? <div className={styles.empty}>{translate('Nothing found')}</div>
                  : searchResults.map(r => <Fragment key={r.tab.id}>
                    <SectionHeader title={r.tab.label} />
                    {renderItems(r.items)}
                  </Fragment>)
                : renderItems(tab.items)}
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
  </SettingInfoContext.Provider>
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
