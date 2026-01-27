import classNames from 'classnames'
import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react'

// todo optimize size
import missingWorldPreview from 'mc-assets/dist/other-textures/latest/gui/presets/isles.png'
import { filesize } from 'filesize'
import useTypedEventListener from 'use-typed-event-listener'
import { focusable } from 'tabbable'
import styles from './singleplayer.module.css'
import Input from './Input'
import Button from './Button'
import Tabs from './Tabs'
import MessageFormattedString from './MessageFormattedString'
import { useIsSmallWidth } from './simpleHooks'
import PixelartIcon from './PixelartIcon'
import { withInjectableUi } from './extendableSystem'
import { ScreenDirtBg } from './Screen'

export interface WorldProps {
  name: string
  title: string
  size?: number
  lastPlayed?: number
  isFocused?: boolean
  iconSrc?: string
  detail?: string
  formattedTextOverride?: string
  worldNameRight?: string
  worldNameRightGrayed?: string
  afterTitleUi?: React.ReactNode
  onFocus?: (name: string) => void
  onInteraction?(interaction: 'enter' | 'space')
  elemRef?: React.Ref<HTMLDivElement>
  offline?: boolean
  group?: string
}

const GroupHeader = ({ name, count, expanded, onToggle }: { name: string, count: number, expanded: boolean, onToggle: () => void }) => {
  return <div
    className={styles.world_root}
    style={{ background: 'none', cursor: 'pointer', height: 'auto', fontSize: '8px' }}
    onClick={onToggle}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#bcbcbc' }}>
      <span>{expanded ? '▼' : '▶'}</span>
      <span>{name}</span>
      <span>({count})</span>
    </div>
  </div>
}

const World = ({ name, isFocused, title, lastPlayed, size, detail = '', onFocus, onInteraction, iconSrc, formattedTextOverride, worldNameRight, worldNameRightGrayed, afterTitleUi, elemRef, offline }: WorldProps & { ref?: React.Ref<HTMLDivElement> }) => {
  const timeRelativeFormatted = useMemo(() => {
    if (!lastPlayed) return ''
    const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    const diff = Date.now() - lastPlayed
    const minutes = Math.floor(diff / 1000 / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    // const weeks = Math.floor(days / 7)
    // const months = Math.floor(days / 30)
    if (days > 0) return formatter.format(-days, 'day')
    if (hours > 0) return formatter.format(-hours, 'hour')
    return formatter.format(-minutes, 'minute')
  }, [lastPlayed])
  const sizeFormatted = useMemo(() => {
    if (!size) return ''
    return filesize(size)
  }, [size])

  return <div
    ref={elemRef}
    className={classNames(styles.world_root, isFocused ? styles.world_focused : undefined)}
    style={{ position: 'relative' }}
    tabIndex={0}
    onFocus={() => onFocus?.(name)}
    onKeyDown={(e) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault()
        onInteraction?.(e.code === 'Enter' ? 'enter' : 'space')
      }
    }}
    onDoubleClick={() => onInteraction?.('enter')}
  >
    <img className={`${styles.world_image} ${iconSrc ? '' : styles.image_missing}`} src={iconSrc ?? missingWorldPreview} alt='' />
    <div className={styles.world_info}>
      <div className={styles.world_title}>
        <div>{title}</div>
        <div className={styles.world_title_right}>
          {worldNameRightGrayed && <span style={{ color: '#878787', fontSize: 8 }}>{worldNameRightGrayed}</span>}
          {offline ? (
            <span style={{ color: 'red', display: 'flex', alignItems: 'center', gap: 4 }}>
              <PixelartIcon iconName="signal-off" width={12} />
              Offline
            </span>
          ) : worldNameRight?.startsWith('ws') ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <PixelartIcon iconName="cellular-signal-3" width={12} />
              {worldNameRight.slice(3)}
            </span>
          ) : worldNameRight}
        </div>
      </div>
      {formattedTextOverride ? <div className={styles.world_info_formatted}>
        <MessageFormattedString message={formattedTextOverride} />
      </div> :
        <>
          <div className={styles.world_info_description_line}>{timeRelativeFormatted} {detail.slice(-30)}</div>
          <div className={styles.world_info_description_line}>{sizeFormatted}</div>
        </>}
    </div>
    <div style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: 4, display: 'flex', alignItems: 'center' }}>
      {afterTitleUi}
    </div>
  </div>
}

interface Props {
  worldData: WorldProps[] | null // null means loading
  serversLayout?: boolean
  firstRowChildrenOverride?: React.ReactNode
  searchRowChildrenOverride?: React.ReactNode
  providers?: Record<string, string>
  activeProvider?: string
  setActiveProvider?: (provider: string) => void
  providerActions?: Record<string, (() => void) | undefined | JSX.Element>
  disabledProviders?: string[]
  isReadonly?: boolean
  error?: string
  warning?: string
  warningAction?: () => void
  warningActionLabel?: string
  hidden?: boolean

  onWorldAction (action: 'load' | 'export' | 'delete' | 'edit', worldName: string): void
  onGeneralAction (action: 'cancel' | 'create'): void
  onRowSelect? (name: string, index: number): void
  defaultSelectedRow?: number
  selectedRow?: number
  listStyle?: React.CSSProperties
  setListHovered?: (hovered: boolean) => void
  secondRowStyles?: React.CSSProperties
  lockedEditing?: boolean
  retriggerFocusCounter?: number
}

const SingleplayerBase = ({
  worldData,
  onGeneralAction,
  onWorldAction,
  firstRowChildrenOverride,
  serversLayout,
  searchRowChildrenOverride,
  activeProvider,
  setActiveProvider,
  providerActions,
  providers = {},
  disabledProviders,
  error,
  isReadonly,
  warning, warningAction, warningActionLabel,
  hidden,
  onRowSelect,
  defaultSelectedRow,
  selectedRow,
  listStyle,
  setListHovered,
  secondRowStyles,
  lockedEditing,
  retriggerFocusCounter
}: Props) => {
  const containerRef = useRef<any>()
  const firstButton = useRef<HTMLButtonElement>(null)
  const worldRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useTypedEventListener(window, 'keydown', (e) => {
    if ((e.code === 'ArrowDown' || e.code === 'ArrowUp')) {
      e.preventDefault()
      const dir = e.code === 'ArrowDown' ? 1 : -1
      const elements = focusable(containerRef.current).filter(e => e.getAttribute('tabindex') !== '-1')
      const focusedElemIndex = elements.indexOf(document.activeElement as HTMLElement)
      if (focusedElemIndex === -1) return
      const nextElem = elements[focusedElemIndex + dir]
      nextElem?.focus()
    }
  })

  const [search, setSearch] = useState('')
  const [focusedWorld, setFocusedWorld] = useState(defaultSelectedRow === undefined ? '' : worldData?.[defaultSelectedRow]?.name ?? '')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setFocusedWorld('')
  }, [activeProvider])

  useEffect(() => {
    if (selectedRow === undefined) return
    const worldName = worldData?.[selectedRow]?.name
    setFocusedWorld(worldName ?? '')
    if (worldName) {
      worldRefs.current[worldName]?.focus()
    }
  }, [selectedRow, worldData?.[selectedRow as any]?.name, retriggerFocusCounter])

  const onRowSelectHandler = (name: string, index: number) => {
    onRowSelect?.(name, index)
    setFocusedWorld(name)
  }
  const isSmallWidth = useIsSmallWidth()

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: prev[groupName] === undefined ? false : !prev[groupName]
    }))
  }

  return <div ref={containerRef} hidden={hidden}>
    <ScreenDirtBg />
    <div className={classNames('fullscreen', styles.root)}>
      <span className={classNames('screen-title', styles.title)}>{serversLayout ? 'Join Java Servers' : 'Select Saved World'}</span>
      {searchRowChildrenOverride || <div style={{ display: 'flex', flexDirection: 'column' }}>
        <Input autoFocus value={search} onChange={({ target: { value } }) => setSearch(value)} />
      </div>}
      <div className={classNames(styles.content, !worldData && styles.content_loading)}>
        <Tabs
          tabs={Object.keys(providers)} disabledTabs={disabledProviders} activeTab={activeProvider ?? ''} labels={providers} onTabChange={(tab) => {
            setActiveProvider?.(tab as any)
          }} fullSize
        />
        <div
          style={{
            marginTop: 3,
            ...listStyle
          }}
          onMouseEnter={() => setListHovered?.(true)}
          onMouseLeave={() => setListHovered?.(false)}
        >
          {
            providerActions && <div style={{
              display: 'flex',
              alignItems: 'center',
              // overflow: 'auto',
            }}
            >
              <span style={{ fontSize: 9, marginRight: 3 }}>Actions: </span> {Object.entries(providerActions).map(([label, action]) => (
                typeof action === 'function' ? <Button key={label} onClick={action} style={{ width: 100 }}>{label}</Button> : <Fragment key={label}>{action}</Fragment>
              ))}
            </div>
          }
          {
            worldData
              ? (() => {
                const filtered = worldData.filter(data => data.title.toLowerCase().includes(search.toLowerCase()))
                const groups = filtered.reduce<Record<string, WorldProps[]>>((acc, world) => {
                  const group = world.group || ''
                  if (!acc[group]) acc[group] = []
                  acc[group].push(world)
                  return acc
                }, {})

                return Object.entries(groups).map(([groupName, worlds]) => (
                  <React.Fragment key={groupName}>
                    <GroupHeader
                      name={groupName}
                      count={worlds.length}
                      expanded={expandedGroups[groupName] ?? true}
                      onToggle={() => toggleGroup(groupName)}
                    />
                    {(expandedGroups[groupName] ?? true) && worlds.map(({ name, size, detail, ...rest }, index) => {
                      const key = name
                      return (
                        <World
                          data-key={key}
                          key={key}
                          {...rest}
                          size={size}
                          name={name}
                          elemRef={el => { worldRefs.current[name] = el }}
                          onFocus={row => onRowSelectHandler(row, index)}
                          isFocused={focusedWorld === name}
                          onInteraction={(interaction) => {
                            if (interaction === 'enter') onWorldAction('load', name)
                            else if (interaction === 'space') firstButton.current?.focus()
                          }}
                          detail={detail}
                        />
                      )
                    })}
                  </React.Fragment>
                ))
              })()
              : <div style={{
                fontSize: 10,
                color: error ? 'red' : 'lightgray',
              }}>{error || 'Loading (check #dev console if loading too long)...'}
              </div>
          }
          {
            warning && <div style={{
              fontSize: 8,
              color: '#ffa500ba',
              marginTop: 5,
              textAlign: 'center',
            }}
            >
              {warning} {warningAction && <a onClick={warningAction}>{warningActionLabel}</a>}
            </div>
          }
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 400, paddingBottom: 3, alignItems: 'center', }}>
        {firstRowChildrenOverride || <div>
          <Button rootRef={firstButton} disabled={!focusedWorld} onClick={() => onWorldAction('load', focusedWorld)}>Load World</Button>
          <Button onClick={() => onGeneralAction('create')} disabled={isReadonly}>Create New World</Button>
        </div>}
        <div style={{
          ...secondRowStyles,
          ...isSmallWidth ? { display: 'grid', gridTemplateColumns: '1fr 1fr' } : {}
        }}>
          {serversLayout ? <Button style={{ width: 100 }} disabled={!focusedWorld || lockedEditing} onClick={() => onWorldAction('edit', focusedWorld)}>Edit</Button> : <Button style={{ width: 100 }} disabled={!focusedWorld} onClick={() => onWorldAction('export', focusedWorld)}>Export</Button>}
          <Button style={{ width: 100 }} disabled={!focusedWorld || lockedEditing} onClick={() => onWorldAction('delete', focusedWorld)}>Delete</Button>
          {serversLayout ?
            <Button style={{ width: 100 }} onClick={() => onGeneralAction('create')} disabled={lockedEditing}>Add</Button> :
            <Button style={{ width: 100 }} onClick={() => onWorldAction('edit', focusedWorld)} disabled>Edit</Button>}
          <Button style={{ width: 100 }} onClick={() => onGeneralAction('cancel')}>Cancel</Button>
        </div>
      </div>
    </div>
  </div>
}

export default withInjectableUi(SingleplayerBase, 'singleplayer')
