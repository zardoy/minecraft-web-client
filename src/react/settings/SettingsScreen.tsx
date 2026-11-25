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

const itemKey = (item: SettingsItem, index: number) => {
  if (isSectionItem(item)) return `section-${item.section}`
  if (isOptionItem(item)) return `option-${item.option}`
  return `custom-${item.text}-${index}`
}

const searchText = (item: SettingsItem) => {
  if (isSectionItem(item)) return ''
  if (isCustomItem(item)) return `${item.text} ${item.keywords ?? ''}`
  return `${getItemText(item)} ${getItemDescription(item) ?? ''} ${item.option} ${JSON.stringify(item.possibleValues ?? optionsMeta[item.option]?.possibleValues ?? '')}`
}

const matchesSearch = (item: SettingsItem, words: string[]) => {
  const text = searchText(item).toLowerCase()
  return text !== '' && words.every(word => text.includes(word))
}

interface Props {
  /** the old sub-page that was asked for, picks the tab and scrolls to its section */
  group?: OptionsGroupType
  onClose: () => void
}

const SettingsScreenBase = ({ group = 'main', onClose }: Props) => {
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

  // type anywhere to search (desktop)
  useEffect(() => {
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
  }, [])

  const selectTab = (id: SettingsTabId) => {
    setSearch('')
    setActiveTab(id)
    if (contentRef.current) contentRef.current.scrollTop = 0
  }

  const renderItems = (items: SettingsItem[]) => items.map((item, i) => <ItemRender key={itemKey(item, i)} item={item} />)

  return <SettingInfoContext.Provider value={setInfo}>
    <div className='backdrop' />
    <div className={`fullscreen ${styles.root} settings-screen`}>
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
          <nav className={styles.tabs} role='tablist'>
            {settingsTabs.map(t => <TabButton key={t.id} tab={t} active={!searchResults && t.id === activeTab} onClick={() => selectTab(t.id)} />)}
          </nav>
          <div className={styles.main}>
            <div className={styles.content} ref={contentRef} role='tabpanel'>
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

const TabButton = ({ tab, active, onClick }: { tab: SettingsTab, active: boolean, onClick: () => void }) => {
  return <button
    type='button'
    role='tab'
    aria-selected={active}
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
