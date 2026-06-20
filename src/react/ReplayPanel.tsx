import { useState, useEffect } from 'react'
import { useSnapshot } from 'valtio'
import { filterPackets } from './packetsFilter'
import { DARK_COLORS } from './components/replay/constants'
import FilterInput from './components/replay/FilterInput'
import PacketList from './components/replay/PacketList'
import ProgressBar from './components/replay/ProgressBar'
import { packetsReplayState } from './state/packetsReplayState'

interface Props {
  replayName: string
  packets: readonly PacketData[]
  isPlaying: boolean
  progress: { current: number; total: number }
  speed: number
  defaultFilter?: string
  customButtons: Readonly<Record<string, { state: boolean; label: string; tooltip?: string }>>
  onPlayPause?: (isPlaying: boolean) => void
  onRestart?: () => void
  onSpeedChange?: (speed: number) => void
  onFilterChange: (filter: string) => void
  onCustomButtonToggle: (buttonId: string) => void
  clientPacketsAutocomplete: string[]
  serverPacketsAutocomplete: string[]
  style?: React.CSSProperties
}

export default function ReplayPanel({
  replayName,
  packets,
  isPlaying,
  progress,
  speed,
  defaultFilter = '',
  customButtons,
  onPlayPause,
  onRestart,
  onSpeedChange,
  onFilterChange,
  onCustomButtonToggle,
  clientPacketsAutocomplete,
  serverPacketsAutocomplete,
  style
}: Props) {
  const [filter, setFilter] = useState(defaultFilter)
  const { isMinimized, isRecording } = useSnapshot(packetsReplayState)
  const { filtered: filteredPackets, hiddenCount } = filterPackets(packets.slice(-500), filter)

  useEffect(() => {
    onFilterChange(filter)
  }, [filter, onFilterChange])

  const handlePlayPauseClick = () => {
    if (isMinimized) {
      packetsReplayState.isMinimized = false
    } else {
      onPlayPause?.(!isPlaying)
    }
  }

  const playPauseButton = (
    <button
      onClick={handlePlayPauseClick}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        color: DARK_COLORS.text
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        {isRecording ? <circle cx="12" cy="12" r="8" fill="red" /> : isPlaying ? <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /> : <path d="M8 5v14l11-7z" />}
      </svg>
    </button>
  )

  const baseContainerStyle = {
    position: 'fixed',
    top: 18,
    right: 0,
    zIndex: 1000,
    background: DARK_COLORS.bg,
    padding: '16px',
    borderRadius: '0 0 8px 0',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    color: DARK_COLORS.text,
    ...style
  } as const

  if (isMinimized) {
    return (
      <div
        style={{
          ...baseContainerStyle,
          width: 'auto'
        }}
      >
        {playPauseButton}
      </div>
    )
  }

  return (
    <div
      style={{
        ...baseContainerStyle,
        width: '400px',
        maxHeight: '80vh'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{replayName || 'Unnamed Replay'}</div>
        <button
          onClick={() => {
            packetsReplayState.isMinimized = true
          }}
          style={{
            background: 'none',
            border: 'none',
            color: DARK_COLORS.text,
            cursor: 'pointer',
            padding: '4px',
            fontSize: '14px',
            opacity: 0.7,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.7'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ fontSize: '8px', color: '#888888', marginTop: '-8px' }}>
        {isRecording ? 'Recording packets...' : 'Integrated server emulation. Testing client...'}
      </div>

      <FilterInput
        value={filter}
        onChange={setFilter}
        hiddenCount={hiddenCount}
        shownCount={filteredPackets.length}
        onClearFilter={() => setFilter('')}
        clientPacketsAutocomplete={clientPacketsAutocomplete}
        serverPacketsAutocomplete={serverPacketsAutocomplete}
      />

      <PacketList packets={filteredPackets} filter={filter} maxHeight={300} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          // grayscale if recording
          filter: isRecording ? 'grayscale(100%)' : 'none',
          cursor: isRecording ? 'not-allowed' : 'default'
        }}
      >
        {playPauseButton}
        <ProgressBar current={progress.current} total={progress.total} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onRestart}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            border: `1px solid ${DARK_COLORS.border}`,
            background: DARK_COLORS.input,
            color: DARK_COLORS.text,
            cursor: 'pointer'
          }}
        >
          Restart
        </button>

        <input
          type="number"
          value={speed}
          onChange={e => onSpeedChange?.(Number(e.target.value))}
          onContextMenu={e => {
            e.preventDefault()
            onSpeedChange?.(1)
          }}
          step={0.1}
          min={0.1}
          style={{
            width: '60px',
            padding: '4px',
            border: `1px solid ${DARK_COLORS.border}`,
            borderRadius: '4px',
            background: DARK_COLORS.input,
            color: DARK_COLORS.text
          }}
        />

        {Object.entries(customButtons).map(([buttonId, { state, label, tooltip }]) => (
          <button
            key={buttonId}
            onClick={() => onCustomButtonToggle(buttonId)}
            title={tooltip}
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              border: `1px solid ${DARK_COLORS.border}`,
              background: state ? DARK_COLORS.client : DARK_COLORS.input,
              color: DARK_COLORS.text,
              cursor: 'pointer',
              minWidth: '32px'
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export interface PacketData {
  name: string
  data: any
  isFromClient: boolean
  isUpcoming: boolean
  actualVersion?: any
  position: number
  timestamp: number
  isCustomChannel?: boolean
}
