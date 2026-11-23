import { useMemo } from 'react'
import { useSnapshot } from 'valtio'
import { filesize } from 'filesize'
import missingWorldPreview from 'mc-assets/dist/other-textures/latest/gui/presets/isles.png'
import {
  closeDroppedWorld,
  droppedWorldState,
  playDroppedWorld,
  selectDroppedWorld,
  setDroppedWorldSaving,
  type DroppedWorldInfo,
} from '../../worldDrop/droppedWorld'
import Screen from '../Screen'
import Button from '../Button'
import { showOptionsModal } from '../SelectOption'
import { useIsModalActive } from '../utilsApp'
import styles from './droppedWorldScreen.module.css'
import McCheckbox from './McCheckbox'

const relativeTime = (ms: number) => {
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const minutes = Math.floor((Date.now() - ms) / 60_000)
  if (minutes < 60) return formatter.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return formatter.format(-hours, 'hour')
  return formatter.format(-Math.floor(hours / 24), 'day')
}

const Details = ({ info }: { info: DroppedWorldInfo }) => {
  const mode = [info.hardcore ? 'Hardcore' : info.gameMode, !info.hardcore && info.difficulty, info.cheats && 'Cheats'].filter(Boolean).join(' · ')
  const versionText = info.version ?? '1.8 or older'
  return (
    <div className={styles.details}>
      <div className={styles.row}><span>Version</span><span>{versionText}{!info.versionSupported && <span className={styles.note}> (plays as {info.playVersion})</span>}</span></div>
      {mode && <div className={styles.row}><span>Mode</span><span>{mode}</span></div>}
      {info.lastPlayed !== undefined && <div className={styles.row}><span>Last played</span><span title={new Date(info.lastPlayed).toLocaleString()}>{relativeTime(info.lastPlayed)}</span></div>}
      {info.seed && <div className={styles.row}><span>Seed</span><span className={styles.selectable}>{info.seed}</span></div>}
    </div>
  )
}

const Structure = ({ info }: { info: DroppedWorldInfo }) => {
  const extra = [
    `${info.players} player${info.players === 1 ? '' : 's'}`,
    info.warps.length > 0 && `${info.warps.length} warp${info.warps.length === 1 ? '' : 's'}`,
    info.datapacks.length > 0 && `${info.datapacks.length} datapack${info.datapacks.length === 1 ? '' : 's'}`,
  ].filter(Boolean).join(' · ')
  return (
    <div className={styles.structure}>
      <div className={styles.sectionTitle}>World structure <span className={styles.note}>{filesize(info.totalBytes)}</span></div>
      {info.dimensions.map(dim => (
        <div key={dim.id} className={`${styles.dimension} ${dim.regions === 0 ? styles.empty : ''}`}>
          <span>{dim.label}</span>
          <span>{dim.regions === 0 ? 'not visited' : `${dim.regions} region${dim.regions === 1 ? '' : 's'}`}</span>
          <span>{dim.regions === 0 ? '' : filesize(dim.bytes)}</span>
        </div>
      ))}
      <div className={styles.extra}>{extra}</div>
    </div>
  )
}

export default () => {
  const isModalActive = useIsModalActive('dropped-world')
  const state = useSnapshot(droppedWorldState)
  const info = state.info as DroppedWorldInfo | null
  const startLabel = useMemo(() => info?.startOptions.find(o => o.id === state.startOptionId)?.label ?? '', [info, state.startOptionId])

  if (!isModalActive) return null

  const pickStart = async () => {
    if (!info) return
    const labels = info.startOptions.map(o => o.label)
    const choice = await showOptionsModal('Start at', labels)
    const option = info.startOptions.find(o => o.label === choice)
    if (option) droppedWorldState.startOptionId = option.id
  }

  const pickWorld = async () => {
    const names = state.worldRoots.map(r => r.replace(/^\/world\/?/, '') || state.sourceName)
    const choice = await showOptionsModal('Choose a world', names)
    const index = names.indexOf(choice!)
    if (index >= 0) void selectDroppedWorld(state.worldRoots[index]!)
  }

  const isZip = state.sourceKind === 'zip'
  return (
    <Screen title='Open World' backdrop='dirt' className={styles.screen} titleMarginTop={0}>
      <div className={styles.panel}>
        {state.loading && !info && <div className={styles.message}>Reading {state.sourceName}...</div>}
        {state.error && <div className={`${styles.message} ${styles.error}`}>{state.error}</div>}
        {info && (
          <>
            <div className={styles.header}>
              <img className={styles.icon} src={info.iconSrc ?? missingWorldPreview} alt='' />
              <div className={styles.titles}>
                <div className={styles.worldName}>{info.levelName}</div>
                <div className={styles.source}>{info.folderName}{isZip ? ' (zip)' : ''}</div>
              </div>
            </div>
            <div className={styles.columns}>
              <Details info={info} />
              <Structure info={info} />
            </div>
          </>
        )}
      </div>

      {state.worldRoots.length > 1 && (
        <Button className={styles.wide} onClick={pickWorld}>World: {info?.folderName ?? '...'} ({state.worldRoots.indexOf(state.selectedRoot) + 1}/{state.worldRoots.length})</Button>
      )}

      <div className={styles.saveRow}>
        <McCheckbox
          checked={state.saveChanges}
          disabled={isZip || !info}
          label='Save changes to the world'
          hint={isZip ? 'A zip opens read only' : 'Off: read only, nothing is written to the folder'}
          onChange={checked => { void setDroppedWorldSaving(checked) }}
        />
        <span className={styles.saveHint}>
          {isZip ? 'zip worlds open read only' : state.saveChanges ? 'changes are written to the folder' : 'read only, nothing is written'}
        </span>
      </div>

      <div className={styles.buttons}>
        <Button className={styles.start} onClick={pickStart} disabled={!info} title={startLabel}>Start at: {startLabel}</Button>
        <Button className={styles.play} onClick={() => { void playDroppedWorld() }} disabled={!info || state.loading}>Play</Button>
        <Button className={styles.cancel} onClick={closeDroppedWorld}>Cancel</Button>
      </div>
    </Screen>
  )
}
