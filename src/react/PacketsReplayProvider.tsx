import { useSnapshot } from 'valtio'
import { useMemo } from 'react'
import { appQueryParams, updateQsParam } from '../appParams'
import { miscUiState } from '../globalState'
import { onChangeButtonState, packetsReplayState } from './state/packetsReplayState'
import ReplayPanel from './ReplayPanel'

export default function PacketsReplayProvider() {
  const state = useSnapshot(packetsReplayState)
  const { gameLoaded } = useSnapshot(miscUiState)

  const autocomplete = useMemo(() => {
    if (!loadedData) return
    return {
      client: Object.keys(loadedData.protocol.play.toClient.types)
        .filter(a => a.startsWith('packet_'))
        .map(a => a.slice('packet_'.length)),
      server: Object.keys(loadedData.protocol.play.toServer.types)
        .filter(a => a.startsWith('packet_'))
        .map(a => a.slice('packet_'.length))
    }
  }, [gameLoaded])

  if (!state.isOpen) return null

  return (
    <ReplayPanel
      style={{
        transform: 'scale(0.4)',
        transformOrigin: 'top right'
      }}
      replayName={state.replayName}
      packets={state.packetsPlayback}
      isPlaying={state.isPlaying}
      progress={state.progress}
      speed={state.speed}
      defaultFilter={appQueryParams.replayFilter ?? ''}
      clientPacketsAutocomplete={autocomplete?.client ?? []}
      serverPacketsAutocomplete={autocomplete?.server ?? []}
      customButtons={state.customButtons}
      onPlayPause={isPlaying => {
        packetsReplayState.isPlaying = isPlaying
      }}
      onRestart={() => {
        window.location.reload()
      }}
      onSpeedChange={speed => {
        packetsReplayState.speed = speed
        updateQsParam('replaySpeed', speed === 1 ? undefined : speed.toString())
      }}
      onFilterChange={filter => {
        updateQsParam('replayFilter', filter)
      }}
      onCustomButtonToggle={button => {
        onChangeButtonState(button as keyof typeof packetsReplayState.customButtons, !state.customButtons[button].state)
      }}
    />
  )
}
